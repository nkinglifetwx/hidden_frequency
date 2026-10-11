const form = document.querySelector("#search-form");
const input = document.querySelector("#vibe-input");
const grid = document.querySelector("#track-grid");
const status = document.querySelector("#status");
const resultsTitle = document.querySelector("#results-title");
const resultsMeta = document.querySelector("#results-meta");
const moreBtn = document.querySelector("#more-btn");
const emptyState = document.querySelector("#empty-state");
const savedSection = document.querySelector("#saved-section");
const savedList = document.querySelector("#saved-list");
const savedCount = document.querySelector("#saved-count");
const sortSelect = document.querySelector("#sort-select");
const aiNote = document.querySelector("#ai-note");

let currentQuery = "";
let currentTracks = [];
let shownTracks = [];
let offset = 0;
const saved = new Map();
let activeAudio = null;
let activeButton = null;
let requestSequence = 0;
let lastDiscovery = null;

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function artwork(track, size = "500x500bb") {
  return (track.artworkUrl100 || "").replace("100x100bb", size);
}
function trackCard(track, index) {
  const id = String(track.trackId);
  const isSaved = saved.has(id);
  const art = artwork(track);
  const preview = track.previewUrl || "";
  return `<article class="track-card" data-track-id="${esc(id)}" style="animation-delay:${Math.min(index*45,300)}ms">
    <div class="art-wrap">
      ${art ? `<img src="${esc(art)}" alt="Artwork for ${esc(track.trackName)}" loading="lazy">` : `<div class="art-placeholder">〰</div>`}
      <span class="track-number">HF / ${String(index+1).padStart(2,"0")}</span>
      ${preview ? `<button class="play-preview" type="button" data-preview="${esc(preview)}" aria-label="Play preview of ${esc(track.trackName)}">▶</button>` : ""}
    </div>
    <div class="track-info">
      <div class="track-kicker">${esc(track.primaryGenreName || "Discovery")}</div>
      <div class="track-title" title="${esc(track.trackName)}">${esc(track.trackName || "Untitled")}</div>
      <div class="track-artist" title="${esc(track.artistName)}">${esc(track.artistName || "Unknown artist")}</div>
      <div class="track-actions">
        <button class="action-btn ${isSaved?"active":""}" type="button" data-save="${esc(id)}">${isSaved?"✓ ENREGISTRÉ":"♡ GARDER"}</button>
        <button class="action-btn" type="button" data-skip="${esc(id)}">PAS MA VIBE ↗</button>
      </div>
    </div>
    <a class="open-track" href="${esc(track.trackViewUrl || "#")}" target="_blank" rel="noopener noreferrer">ÉCOUTER ↗</a>
  </article>`;
}
function updateEmptyState() { emptyState.hidden = grid.children.length > 0; }
function renderTracks(tracks, append = false) {
  if (!append) grid.innerHTML = "";
  const start = grid.children.length;
  grid.insertAdjacentHTML("beforeend", tracks.map((track,i) => trackCard(track,start+i)).join(""));
  updateEmptyState();
}
function shuffled(items) {
  const arr = [...items];
  for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}
async function callDiscovery(vibe, pageOffset = 0) {
  const response = await fetch("/api/discover", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({vibe, offset: pageOffset})
  });
  if (!response.ok) {
    let message = "Discovery request failed.";
    try { const data = await response.json(); message = data.error || message; } catch {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
async function searchTracks(vibe, append = false) {
  const requestId = ++requestSequence;
  if (!append) {
    currentQuery = vibe; offset = 0; currentTracks = []; shownTracks = []; lastDiscovery = null;
    grid.innerHTML = ""; aiNote.hidden = true; aiNote.textContent = "";
    resultsTitle.textContent = "On cherche ton ambiance…";
    resultsMeta.textContent = "RECHERCHE EN COURS";
    status.textContent = "On analyse ta vibe et on cherche des morceaux…";
    moreBtn.hidden = true; emptyState.hidden = true;
  } else {
    offset += 12; moreBtn.disabled = true; moreBtn.textContent = "Searching…";
  }
  try {
    const data = await callDiscovery(vibe, append ? offset : 0);
    if (requestId !== requestSequence) return;
    const seen = new Set(currentTracks.map(t => String(t.trackId)));
    const incoming = (data.tracks || []).filter(t => t.trackId && !seen.has(String(t.trackId)));
    currentTracks = currentTracks.concat(incoming);
    const batch = incoming.slice(0, 12);
    shownTracks = shownTracks.concat(batch);
    lastDiscovery = data.discovery || lastDiscovery;
    resultsTitle.textContent = "Un peu plus loin.";
    resultsMeta.textContent = `${currentTracks.length} MORCEAUX TROUVÉS`;
    status.textContent = data.tracks?.length
      ? `Inspiré par « ${vibe} ». Garde les sons qui te plaisent.`
      : "Pas de résultat. Essaie une autre ambiance ou un autre genre.";
    if (lastDiscovery) {
      aiNote.innerHTML = `<strong>THE SIGNAL:</strong> ${esc(lastDiscovery.summary || "A few directions to explore.")} <span>Search paths: ${esc((lastDiscovery.searchTerms || []).join(" · "))}</span>`;
      aiNote.hidden = false;
    }
    renderTracks(batch, append);
    moreBtn.hidden = incoming.length < 12 || !data.hasMore;
    if (!append && incoming.length === 0) updateEmptyState();
  } catch (error) {
    if (requestId !== requestSequence) return;
    resultsTitle.textContent = "Petit souci de connexion.";
    resultsMeta.textContent = error.status === 503 ? "IA NON CONFIGURÉE" : "ERREUR DE CONNEXION";
    if (error.status === 503) {
      status.textContent = "La clé OPENAI_API_KEY doit être ajoutée aux secrets Cloudflare Pages, puis le site redéployé.";
    } else {
      status.textContent = "Le moteur ne répond pas. Vérifie le déploiement Cloudflare puis réessaie.";
    }
    aiNote.hidden = false;
    aiNote.textContent = "Cette version nécessite Cloudflare Pages Functions et une clé API enregistrée côté serveur.";
    moreBtn.hidden = true;
    updateEmptyState();
  } finally {
    moreBtn.disabled = false;
    moreBtn.innerHTML = 'Voir plus de sons <span>＋</span>';
  }
}
function renderSaved() {
  savedSection.hidden = saved.size === 0;
  savedCount.textContent = `${saved.size} ENREGISTRÉ`;
  savedList.innerHTML = [...saved.values()].map(track => {
    const art = artwork(track, "100x100bb");
    return `<div class="saved-row">${art?`<img src="${esc(art)}" alt="">`:""}
      <div><strong>${esc(track.trackName)}</strong><small>${esc(track.artistName)}</small></div>
      <a href="${esc(track.trackViewUrl || "#")}" target="_blank" rel="noopener noreferrer">OPEN ↗</a></div>`;
  }).join("");
}
function toggleSaved(id) {
  const track = currentTracks.find(t => String(t.trackId) === id);
  if (!track) return;
  if (saved.has(id)) saved.delete(id); else saved.set(id, track);
  renderSaved();
  document.querySelectorAll("[data-save]").forEach(button => {
    const active = saved.has(button.dataset.save);
    button.classList.toggle("active", active);
    button.textContent = active ? "✓ ENREGISTRÉ" : "♡ GARDER";
  });
}
function applySort() {
  const mode = sortSelect.value;
  const sorted = [...shownTracks];
  if (mode === "title") sorted.sort((a,b) => a.trackName.localeCompare(b.trackName));
  else if (mode === "artist") sorted.sort((a,b) => a.artistName.localeCompare(b.artistName));
  grid.innerHTML = ""; renderTracks(sorted);
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const vibe = input.value.trim();
  if (vibe) searchTracks(vibe);
});
document.querySelectorAll("[data-vibe]").forEach(button => {
  button.addEventListener("click", () => { input.value = button.dataset.vibe; searchTracks(button.dataset.vibe); });
});
moreBtn.addEventListener("click", () => searchTracks(currentQuery, true));
sortSelect.addEventListener("change", applySort);
grid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  const skipButton = event.target.closest("[data-skip]");
  const previewButton = event.target.closest("[data-preview]");
  if (saveButton) toggleSaved(saveButton.dataset.save);
  if (skipButton) {
    const id = skipButton.dataset.skip;
    shownTracks = shownTracks.filter(t => String(t.trackId) !== id);
    const card = skipButton.closest(".track-card");
    card.style.opacity = "0"; card.style.transform = "scale(.97)";
    setTimeout(() => { card.remove(); updateEmptyState(); }, 180);
  }
  if (previewButton) {
    const url = previewButton.dataset.preview;
    if (activeAudio && activeButton === previewButton) {
      activeAudio.pause(); activeAudio = null; previewButton.textContent = "▶"; activeButton = null; return;
    }
    if (activeAudio) { activeAudio.pause(); if (activeButton) activeButton.textContent = "▶"; }
    activeAudio = new Audio(url); activeButton = previewButton; previewButton.textContent = "Ⅱ";
    activeAudio.play().catch(() => { status.textContent = "Preview playback failed. You can still open the full track."; previewButton.textContent = "▶"; });
    activeAudio.addEventListener("ended", () => { if (activeButton) activeButton.textContent = "▶"; activeAudio = null; activeButton = null; });
  }
});
