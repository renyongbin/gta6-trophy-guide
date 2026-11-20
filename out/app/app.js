// Leonida Trophy Guide — tracker for the 55 GTA VI PS5 trophies.
// Progress and settings live in localStorage; export/import round-trips them as JSON.
// No network at run time: the only fetch is the bundled data/trophies.json.
const STORE_KEY = 'gta6-trophy-guide-v1';
const DATA_URL = 'data/trophies.json';
const KIND_LABELS = {
  all: 'All 55', story: 'Story', missable: 'Missable',
  collectibles: 'Collectibles', activities: 'Activities', online: 'Online',
};
const KIND_HINTS = {
  story: 'Story trophies unlock by playing the chapters and missions — none can be missed.',
  missable: 'Only one trophy may be missable: Positive Mental Attitude, and only its Chapter 1 meditation. See the roadmap box above.',
  collectibles: 'Cards, WAiNK scans, vehicles, map exploration and garages.',
  activities: 'Stunts, races, shooting ranges, fishing, arcade games, challenges and workouts.',
  online: 'There are no online trophies: all 55 are single-player (PowerPyx). Nothing to show here — that is the point.',
};

const listEl = document.getElementById('trophyList');
const emptyEl = document.getElementById('emptyState');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const earnedOnlyEl = document.getElementById('earnedOnly');
const hintEl = document.getElementById('filterHint');
const listCountEl = document.getElementById('listCount');

let trophies = [];
let roadmap = [];
let activeKind = 'all';
let earned = new Set();
let spoilerFree = false;

function loadStoredState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    earned = new Set(Array.isArray(raw.earned) ? raw.earned : []);
    spoilerFree = raw.spoilerFree === true;
  } catch {
    earned = new Set();
    spoilerFree = false;
  }
  spoilerEl.checked = spoilerFree;
}

function saveStoredState() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    earned: [...earned], spoilerFree, savedAt: new Date().toISOString(),
  }));
}

function isStoryTrophy(trophy) {
  return trophy.kind.includes('story');
}

function isHiddenFromSpoilers(trophy) {
  return spoilerFree && isStoryTrophy(trophy) && !earned.has(trophy.name);
}

function trophyMatches(trophy) {
  if (activeKind !== 'all' && !trophy.kind.includes(activeKind)) return false;
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  if (earnedOnlyEl.checked && !earned.has(trophy.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderRoadmap() {
  const stepsEl = document.getElementById('roadmapSteps');
  stepsEl.replaceChildren();
  for (const step of roadmap) {
    const li = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = `Step ${step.stage} — ${step.title.replace(/^Step \d+ — /, '')}`;
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = step.time;
    const text = document.createElement('p');
    text.textContent = step.text;
    li.append(title, time, text);
    stepsEl.append(li);
  }
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  document.getElementById('earnedCount').textContent = done;
  document.getElementById('progressFill').style.width = total ? `${(done / total) * 100}%` : '0%';
  document.getElementById('progressBar').setAttribute('aria-valuenow', String(done));
  const counts = {};
  for (const t of trophies) counts[t.grade] = (counts[t.grade] ?? 0) + (earned.has(t.name) ? 1 : 0);
  const totals = {};
  for (const t of trophies) totals[t.grade] = (totals[t.grade] ?? 0) + 1;
  document.getElementById('gradeCounts').textContent =
    `Platinum ${counts.platinum ?? 0}/${totals.platinum ?? 0} · Gold ${counts.gold ?? 0}/${totals.gold ?? 0} · ` +
    `Silver ${counts.silver ?? 0}/${totals.silver ?? 0} · Bronze ${counts.bronze ?? 0}/${totals.bronze ?? 0}`;
  document.getElementById('platinumNote').textContent = done === total
    ? 'Platinum earned — you are a Leonida Legend!'
    : `Earn the other ${total - done} to unlock the platinum, Vice Got a Price!`;
}

function renderTrophyCard(trophy) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `trophy-${trophy.id}`;
  if (earned.has(trophy.name)) card.classList.add('earned');
  if (trophy.missable) card.classList.add('missable-card');

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.name);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.name);
    else earned.delete(trophy.name);
    saveStoredState();
    renderProgress();
    renderTrophyList();
  });
  const titleWrap = document.createElement('div');
  titleWrap.className = 'card-title';
  const title = document.createElement('h3');
  const desc = document.createElement('p');
  desc.className = 'desc';
  if (isHiddenFromSpoilers(trophy)) {
    title.textContent = 'Hidden story trophy';
    desc.textContent = 'Hidden on PlayStation until earned — turn off spoiler-free mode or tick it earned to reveal it.';
    title.classList.add('hidden-trophy');
  } else {
    title.textContent = trophy.name;
    desc.textContent = trophy.description;
  }
  titleWrap.append(title, desc);
  const badge = document.createElement('span');
  badge.className = `badge ${trophy.grade}`;
  badge.textContent = trophy.grade;
  head.append(box, titleWrap, badge);
  card.append(head);

  const tags = document.createElement('div');
  tags.className = 'tags';
  for (const kind of trophy.kind) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = KIND_LABELS[kind] ?? kind;
    tags.append(tag);
  }
  if (trophy.missable) {
    const tag = document.createElement('span');
    tag.className = 'tag missable-tag';
    tag.textContent = '⚠ Possibly missable';
    tags.append(tag);
  }
  if (trophy.hidden) {
    const tag = document.createElement('span');
    tag.className = 'tag hidden-tag';
    tag.textContent = 'Hidden until earned';
    tags.append(tag);
  }
  card.append(tags);

  const guide = document.createElement('p');
  guide.className = 'guide';
  if (isHiddenFromSpoilers(trophy)) {
    guide.textContent = 'Guide hidden in spoiler-free mode until this trophy is earned.';
    guide.classList.add('hidden-trophy');
  } else {
    guide.textContent = trophy.guide;
    const src = document.createElement('span');
    src.className = 'src';
    src.textContent = 'Source: ';
    if (trophy.source_url) {
      const link = document.createElement('a');
      link.href = trophy.source_url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = trophy.source;
      src.append(link);
    } else {
      src.append(document.createTextNode(trophy.source));
    }
    guide.append(src);
  }
  card.append(guide);
  return card;
}

function renderTrophyList() {
  const shown = trophies.filter(trophyMatches);
  listEl.replaceChildren(...shown.map(renderTrophyCard));
  listCountEl.textContent = `Showing ${shown.length} of ${trophies.length} trophies`;
  emptyEl.hidden = shown.length > 0;
  hintEl.textContent = KIND_HINTS[activeKind] ?? '';
}

function exportProgress() {
  const payload = {
    app: 'gta6-trophy-guide',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    hintEl.textContent = 'That file is not valid JSON — nothing was imported.';
    return;
  }
  const names = new Set(trophies.map((t) => t.name));
  const incoming = Array.isArray(payload) ? payload : payload.earned;
  if (!Array.isArray(incoming)) {
    hintEl.textContent = 'That file has no earned-trophy list — nothing was imported.';
    return;
  }
  const kept = incoming.filter((name) => names.has(name));
  earned = new Set(kept);
  saveStoredState();
  renderProgress();
  renderTrophyList();
  hintEl.textContent = `Imported ${kept.length} earned trophies (${incoming.length - kept.length} names did not match this list).`;
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('spoiler') === '1') {
    spoilerFree = true;
    spoilerEl.checked = true;
    saveStoredState();
  }
  if (params.get('kind') && KIND_LABELS[params.get('kind')]) {
    activeKind = params.get('kind');
  }
  if (params.get('demo') === '1') {
    // Demo progress for screenshots: tick a spread of trophies across grades.
    for (const id of [2, 3, 8, 15, 16, 20, 21, 31, 35, 42, 53]) {
      const t = trophies.find((x) => x.id === id);
      if (t) earned.add(t.name);
    }
    saveStoredState();
  }
}

function focusTrophyFromUrl() {
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('trophy'));
  const view = params.get('view');
  if (id) {
    const el = document.getElementById(`trophy-${id}`);
    if (el) el.scrollIntoView({ block: 'center' });
  } else if (view === 'roadmap') {
    document.getElementById('roadmap').scrollIntoView();
  }
}

async function initGuide() {
  loadStoredState();
  const doc = await (await fetch(DATA_URL)).json();
  trophies = doc.trophies;
  roadmap = doc.roadmap ?? [];
  applyUrlParams();
  renderRoadmap();
  renderProgress();
  renderTrophyList();
  focusTrophyFromUrl();
}

document.getElementById('kindFilters').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-kind]');
  if (!button) return;
  activeKind = button.dataset.kind;
  for (const b of document.querySelectorAll('#kindFilters button')) {
    b.classList.toggle('active', b === button);
  }
  renderTrophyList();
});
searchEl.addEventListener('input', renderTrophyList);
gradeEl.addEventListener('change', renderTrophyList);
earnedOnlyEl.addEventListener('change', renderTrophyList);
spoilerEl.addEventListener('change', () => {
  spoilerFree = spoilerEl.checked;
  saveStoredState();
  renderTrophyList();
});
document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importFile').addEventListener('change', (event) => {
  importProgress(event.target.files[0]);
  event.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  earned = new Set();
  saveStoredState();
  renderProgress();
  renderTrophyList();
});

await initGuide();
