const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function cleanText(value, max = 240) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  if (!env.OPENAI_API_KEY) {
    return json({ error: "AI backend not configured." }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body." }, 400); }

  const vibe = cleanText(body.vibe, 240);
  const offset = Math.max(0, Math.min(100, Number.parseInt(body.offset || 0, 10) || 0));
  if (vibe.length < 3) return json({ error: "Describe a little more of the sound you want." }, 400);

  // The model interprets the user's description and produces search terms.
  // It does not invent track listings: results are verified against the music catalog below.
  const prompt = `You are the music discovery curator for Hidden Frequencies.
Interpret the user's desired sound and return only valid JSON with this schema:
{"summary":"one short sentence in English explaining the mood","searchTerms":["2 to 4 concise music catalog search queries"],"genres":["1 to 3 likely genres"]}.
Rules: preserve the intent and language where useful; use mood, genre, instrumentation, era or scene keywords; search terms should work in a general music catalogue; don't include lyrics; don't invent songs or artists; no romance assumptions. The user wants to discover music and may prefer less mainstream tracks, but don't claim popularity data you do not have.
User description: ${vibe}`;

  let discovery;
  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a concise music discovery assistant. Output JSON only." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      console.error("OpenAI request failed", aiResponse.status, detail.slice(0, 500));
      return json({ error: "The AI provider could not complete the request. Check your API key, billing and model configuration." }, 502);
    }
    const aiData = await aiResponse.json();
    discovery = JSON.parse(aiData.choices?.[0]?.message?.content || "{}");
  } catch (error) {
    console.error("AI discovery error", String(error));
    return json({ error: "Could not interpret this vibe right now." }, 502);
  }

  const searchTerms = Array.isArray(discovery.searchTerms)
    ? discovery.searchTerms.map(term => cleanText(term, 80)).filter(Boolean).slice(0, 4)
    : [];
  if (!searchTerms.length) searchTerms.push(vibe);

  // Use iTunes as the catalog source for metadata, artwork, preview URLs and outbound links.
  const page = Math.floor(offset / 12);
  const fetchOffset = page * 12;
  const termsToSearch = searchTerms.slice(0, 3);
  const responses = await Promise.all(termsToSearch.map(async term => {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=25&offset=${fetchOffset}&media=music&country=US`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results || []).filter(track => track.trackId && track.trackName && track.artistName);
    } catch { return []; }
  }));

  const unique = new Map();
  for (const track of responses.flat()) {
    if (!unique.has(track.trackId)) unique.set(track.trackId, track);
  }
  const tracks = [...unique.values()];
  // Simple heuristic diversification: prefer distinct artists and keep result order varied.
  const firstPass = [];
  const leftovers = [];
  const seenArtists = new Set();
  for (const track of tracks) {
    const artist = String(track.artistName || "").toLowerCase();
    if (!seenArtists.has(artist)) {
      firstPass.push(track);
      seenArtists.add(artist);
    } else leftovers.push(track);
  }
  const diversified = firstPass.concat(leftovers);
  const start = offset % 12;
  const resultTracks = diversified.slice(start, start + 12).map(track => ({
    trackId: track.trackId,
    trackName: track.trackName,
    artistName: track.artistName,
    primaryGenreName: track.primaryGenreName || "",
    artworkUrl100: track.artworkUrl100 || "",
    previewUrl: track.previewUrl || "",
    trackViewUrl: track.trackViewUrl || "",
    collectionName: track.collectionName || "",
    releaseDate: track.releaseDate || ""
  }));

  return json({
    discovery: {
      summary: cleanText(discovery.summary || "A few directions to explore.", 220),
      searchTerms,
      genres: Array.isArray(discovery.genres) ? discovery.genres.map(g => cleanText(g, 40)).slice(0, 3) : []
    },
    tracks: resultTracks,
    hasMore: diversified.length > start + resultTracks.length
  });
}
