const form = document.querySelector("#search-form");
const input = document.querySelector("#vibe-input");
const grid = document.querySelector("#track-grid");
const status = document.querySelector("#status");
const resultsTitle = document.querySelector("#results-title");
const resultsMeta = document.querySelector("#results-meta");
const moreBtn = document.querySelector("#more-btn");
const savedSection = document.querySelector("#saved-section");
const savedList = document.querySelector("#saved-list");
const savedCount = document.querySelector("#saved-count");

let currentQuery = "";
let currentTracks = [];
let offset = 0;
let saved = new Map();
let activeAudio = null;
let activeButton = null;

const suggestions = [
  { match: /indie|dream|mélanc|alternative|guitare/i, term: "indie alternative" },
  { match: /électro|electro|electronic|techno|night|nocturne|after dark/i, term: "electronic indie" },
  { match: /jazz|piano|instrumental|calme|soft|focus/i, term: "modern jazz" },
  { match: /rock|énerg|energy|punk/i, term: "alternative rock" },
  { match: /soul|rnb|r&b|sensuel/i, term: "neo soul" },
  { match: /lofi|lo-fi|chill|relax/i, term: "lofi chill" },
  { match: /rap|hip.?hop|trap/i, term: "underground hip hop" },
  { match: /folk|acoustic|acoustique/i, term: "indie folk" },
  { match: /français|francophone|france/i, term: "French indie" },
  { match: /afro|amapiano/i, term: "afrobeats" }
];

function makeSearchTerm(vibe) {
  const found = suggestions.find(item => item.match.test(vibe));
  // L'API iTunes recherche les titres et artistes à partir d'un terme textuel.
  // On garde une partie de la demande pour rendre la recherche plus personnelle.
  return found ? found.term : vibe.trim();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function trackCard(track, index) {
  const id = String(track.trackId);
  const isSaved = saved.has(id);
  const artwork = track.artworkUrl100
    ? track.artworkUrl100.replace("100x100bb", "500x500bb")
    : "";
  const preview = track.previewUrl || "";
  return `
    <article class="track-card" style="animation-delay:${Math.min(index * 55, 330)}ms">
      <div class="art-wrap">
        ${artwork ? `<img src="${escapeHTML(artwork)}" alt="Pochette de ${escapeHTML(track.trackName)}" loading="lazy">` : `<div class="art-placeholder">〰</div>`}
        <span class="track-number">HF / ${String(index + 1 + offset).padStart(2, "0")}</span>
        ${preview ? `<button class="play-preview" type="button" data-preview="${escapeHTML(preview)}" aria-label="Écouter un extrait de ${escapeHTML(track.trackName)}">▶</button>` : ""}
      </div>
      <div class="track-info">
        <div class="track-kicker">${escapeHTML(track.primaryGenreName || "A découvrir")}</div>
        <div class="track-title" title="${escapeHTML(track.trackName)}">${escapeHTML(track.trackName || "Untitled")}</div>
        <div class="track-artist" title="${escapeHTML(track.artistName)}">${escapeHTML(track.artistName || "Unknown artist")}</div>
        <div class="track-actions">
          <button class="action-btn ${isSaved ? "active" : ""}" type="button" data-save="${escapeHTML(id)}">${isSaved ? "✓ SAVED" : "♡ KEEP"}</button>
          <button class="action-btn" type="button" data-skip="${escapeHTML(id)}">NOT MY VIBE ↗</button>
        </div>
      </div>
      <a class="open-track" href="${escapeHTML(track.trackViewUrl || "#")}" target="_blank" rel="noopener noreferrer">OPEN TRACK ↗</a>
    </article>`;
}

function renderTracks(tracks, append = false) {
  if (!append) grid.innerHTML = "";
  const startIndex = append ? grid.children.length : 0;
  grid.insertAdjacentHTML("beforeend", tracks.map((track, i) => trackCard(track, startIndex + i)).join(""));
  moreBtn.hidden = tracks.length < 1;
}

async function searchTracks(vibe, append = false) {
  if (!append) {
    currentQuery = vibe;
    offset = 0;
    currentTracks = [];
    grid.innerHTML = "";
    resultsTitle.textContent = "Tuning into your frequency…";
    resultsMeta.textContent = "SEARCHING THE CATALOG";
    status.textContent = "On cherche des morceaux qui pourraient matcher avec cette ambiance.";
    moreBtn.hidden = true;
  } else {
    offset += 12;
    moreBtn.disabled = true;
    moreBtn.textContent = "Searching…";
  }

  const term = makeSearchTerm(vibe);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=30&offset=${offset}&media=music`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    const tracks = (data.results || []).filter(t => t.trackId && t.trackName && t.artistName);
    // Mélange les résultats pour donner une impression de découverte, sans prétendre mesurer leur popularité.
    tracks.sort(() => Math.random() - 0.5);
    const unique = tracks.filter(t => !currentTracks.some(existing => existing.trackId === t.trackId));
    currentTracks = currentTracks.concat(unique);
    if (!append) {
      resultsTitle.textContent = "A few sounds worth finding.";
      resultsMeta.textContent = `${unique.length} TRACKS FOUND`;
      status.textContent = unique.length
        ? `Résultats pour « ${vibe} ». Écoute les extraits, garde tes favoris et explore les morceaux complets.`
        : "Pas de résultat cette fois. Essaie une vibe plus simple ou un genre musical.";
    } else {
      status.textContent = `Encore quelques pistes pour « ${vibe} ».`;
    }
    renderTracks(unique.slice(0, 12), append);
    if (unique.length === 0 && append) status.textContent = "Plus de résultats trouvés pour cette recherche. Essaie une autre vibe.";
    moreBtn.hidden = unique.length < 12;
  } catch (error) {
    resultsTitle.textContent = "The signal got a little fuzzy.";
    resultsMeta.textContent = "CONNECTION ISSUE";
    status.textContent = "Impossible de joindre le catalogue musical. Vérifie ta connexion, puis réessaie.";
    moreBtn.hidden = true;
  } finally {
    moreBtn.disabled = false;
    moreBtn.innerHTML = 'Show me more <span>＋</span>';
  }
}

function toggleSaved(id) {
  const track = currentTracks.find(t => String(t.trackId) === id);
  if (!track) return;
  if (saved.has(id)) saved.delete(id);
  else saved.set(id, track);
  savedSection.hidden = saved.size === 0;
  savedCount.textContent = `${saved.size} SAVED`;
  savedList.innerHTML = [...saved.values()].map(track => {
    const art = track.artworkUrl100 || "";
    return `<div class="saved-row">${art ? `<img src="${escapeHTML(art)}" alt="">` : ""}
      <div><strong>${escapeHTML(track.trackName)}</strong><small>${escapeHTML(track.artistName)}</small></div>
      <a href="${escapeHTML(track.trackViewUrl || "#")}" target="_blank" rel="noopener noreferrer">OPEN ↗</a></div>`;
  }).join("");
  // Actualise l'état des boutons dans les résultats.
  document.querySelectorAll("[data-save]").forEach(button => {
    const active = saved.has(button.dataset.save);
    button.classList.toggle("active", active);
    button.textContent = active ? "✓ SAVED" : "♡ KEEP";
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const vibe = input.value.trim();
  if (vibe) searchTracks(vibe);
});
document.querySelectorAll("[data-vibe]").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.vibe;
    searchTracks(button.dataset.vibe);
  });
});
moreBtn.addEventListener("click", () => searchTracks(currentQuery, true));

grid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  const skipButton = event.target.closest("[data-skip]");
  const previewButton = event.target.closest("[data-preview]");
  if (saveButton) toggleSaved(saveButton.dataset.save);
  if (skipButton) {
    const card = skipButton.closest(".track-card");
    card.style.opacity = ".25";
    card.style.transform = "scale(.97)";
    setTimeout(() => card.remove(), 180);
  }
  if (previewButton) {
    const url = previewButton.dataset.preview;
    if (activeAudio && activeButton === previewButton) {
      activeAudio.pause();
      activeAudio = null;
      activeButton.textContent = "▶";
      activeButton = null;
      return;
    }
    if (activeAudio) {
      activeAudio.pause();
      if (activeButton) activeButton.textContent = "▶";
    }
    activeAudio = new Audio(url);
    activeButton = previewButton;
    previewButton.textContent = "Ⅱ";
    activeAudio.play().catch(() => {
      status.textContent = "L'extrait n'a pas pu être lu. Tu peux ouvrir le morceau complet via OPEN TRACK.";
      previewButton.textContent = "▶";
    });
    activeAudio.addEventListener("ended", () => {
      if (activeButton) activeButton.textContent = "▶";
      activeAudio = null;
      activeButton = null;
    });
  }
});
