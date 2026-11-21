/**
 * app.js
 * B.Ed. Study Hub — Main application script.
 * Features: Dashboard, Sidebar, Topic Viewer, Search, Theme, Font Size, Language, Progress Tracking.
 */

/* =========================================================
   STATE
   ========================================================= */
const State = {
  subjects: [],
  topicCache: {},         // key: `${semId}/${code}/${unitIndex}` → [topics]
  currentSubject: null,
  currentUnitIndex: null,
  currentTopicIndex: null,
  currentTopics: [],
  lang: localStorage.getItem('agy_lang') || 'en',
  theme: localStorage.getItem('agy_theme') || 'light',
  fontSize: localStorage.getItem('agy_fontsize') || 'md',
  progress: JSON.parse(localStorage.getItem('agy_progress') || '{}'),
};

/* =========================================================
   DOM HELPERS
   ========================================================= */
const $ = id => document.getElementById(id);
const dom = {
  body: document.body,
  sidebar: $('sidebar'),
  sidebarContent: $('sidebarContent'),
  sidebarClose: $('sidebarClose'),
  dashboard: $('dashboard'),
  dashboardGrid: $('dashboardGrid'),
  viewer: $('viewer'),
  contentCard: $('contentCard'),
  viewerBreadcrumb: $('viewerBreadcrumb'),
  progressLabel: $('progressLabel'),
  markReadBtn: $('markReadBtn'),
  backBtn: $('backBtn'),
  prevTopicBtn: $('prevTopicBtn'),
  nextTopicBtn: $('nextTopicBtn'),
  prevTopicBtn2: $('prevTopicBtn2'),
  nextTopicBtn2: $('nextTopicBtn2'),
  topicCounter: $('topicCounter'),
  searchInput: $('searchInput'),
  searchDropdown: $('searchDropdown'),
  langToggle: $('langToggle'),
  fontDec: $('fontDec'),
  fontInc: $('fontInc'),
  themeToggle: $('themeToggle'),
  fabMenu: $('fabMenu'),
  toast: $('toast'),
};

/* =========================================================
   SECTION ORDER CONFIG
   ========================================================= */
const SECTION_ORDER = [
  'Quick Concept',
  'Short Answer (Section A: 100–150 Words)',
  'Long Answer (Section B: 300–400 Words)',
  'Suggested Exam Questions',
];

/* =========================================================
   INIT
   ========================================================= */
async function init() {
  applyTheme(false);
  applyFontSize();
  applyLang();
  attachUIListeners();

  try {
    let subjects = null;
    // Prefer preloaded subjects if on file: protocol to avoid CORS errors
    if (window.location.protocol === 'file:' && window.PRELOADED_SUBJECTS) {
      subjects = window.PRELOADED_SUBJECTS;
    } else {
      try {
        const res = await fetch('./data/subjects.json');
        if (res.ok) {
          subjects = await res.json();
        } else if (window.PRELOADED_SUBJECTS) {
          subjects = window.PRELOADED_SUBJECTS;
        } else {
          throw new Error(`HTTP ${res.status}: Could not load subjects.json`);
        }
      } catch (fetchErr) {
        if (window.PRELOADED_SUBJECTS) {
          console.info('Using preloaded subjects store (file:// or fetch blocked):', fetchErr);
          subjects = window.PRELOADED_SUBJECTS;
        } else {
          throw fetchErr;
        }
      }
    }

    State.subjects = subjects;
    buildSidebar();
    buildDashboard();
    // Build search index after a small delay so UI feels snappy
    setTimeout(buildSearchIndex, 800);
  } catch (err) {
    console.error('Initialization error:', err);
    dom.dashboardGrid.innerHTML = `
      <div class="error-box">
        <strong>⚠️ Failed to load course subjects:</strong> ${escHtml(err.message)}<br><br>
        <p>If you opened this directly from your file system (<code>file://</code>), run a local server or ensure <code>data/content-store.js</code> is loaded:</p>
        <ul style="margin: 0.5rem 0 0 1.2rem; line-height: 1.8;">
          <li>Option 1 (Node.js): <code>npx serve .</code> or <code>npm start</code></li>
          <li>Option 2 (Python 3): <code>python3 -m http.server 8000</code></li>
          <li>Option 3: Regenerate bundle with <code>node scripts/build-store.js</code></li>
        </ul>
      </div>`;
  }
}

/* =========================================================
   THEME
   ========================================================= */
function applyTheme(save = true) {
  const dark = State.theme === 'dark';
  dom.body.classList.toggle('theme-dark', dark);
  dom.body.classList.toggle('theme-light', !dark);
  dom.themeToggle.textContent = dark ? '☀️' : '🌙';
  dom.themeToggle.title = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  if (save) localStorage.setItem('agy_theme', State.theme);
}

function toggleTheme() {
  State.theme = State.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

/* =========================================================
   FONT SIZE
   ========================================================= */
const FONT_SIZES = ['sm', 'md', 'lg', 'xl'];

function applyFontSize() {
  dom.body.dataset.fontsize = State.fontSize;
  localStorage.setItem('agy_fontsize', State.fontSize);
}

function changeFont(dir) {
  const idx = FONT_SIZES.indexOf(State.fontSize);
  const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + dir));
  if (newIdx === idx) return;
  State.fontSize = FONT_SIZES[newIdx];
  applyFontSize();
  showToast(dir > 0 ? 'Font size increased' : 'Font size decreased');
}

/* =========================================================
   LANGUAGE
   ========================================================= */
function applyLang() {
  dom.body.dataset.lang = State.lang;
  dom.langToggle.textContent = State.lang === 'en' ? 'EN / हि' : 'हि / EN';
  dom.langToggle.title = State.lang === 'en' ? 'Switch to Hindi' : 'Switch to English';
  localStorage.setItem('agy_lang', State.lang);
}

function toggleLang() {
  State.lang = State.lang === 'en' ? 'hi' : 'en';
  applyLang();
  // Re-render current topic in new language (if viewing one)
  if (!dom.viewer.hidden && State.currentTopics.length && State.currentTopicIndex !== null) {
    renderTopic(State.currentTopics[State.currentTopicIndex], false);
  }
  showToast(State.lang === 'en' ? 'Switched to English' : 'हिंदी में बदल दिया गया');
}

/* =========================================================
   PROGRESS
   ========================================================= */
function isRead(topicId) {
  return !!State.progress[topicId];
}

function markRead(topicId) {
  if (State.progress[topicId]) return false; // already read
  State.progress[topicId] = true;
  localStorage.setItem('agy_progress', JSON.stringify(State.progress));
  return true;
}

function getSubjectProgress(subject) {
  let total = 0, done = 0;
  for (const unit of subject.units) {
    const cacheKey = `${subject.semId}/${subject.code}/${unit.index}`;
    const topics = State.topicCache[cacheKey];
    if (topics && topics.length) {
      total += topics.length;
      done += topics.filter(t => isRead(t.topic_id)).length;
    } else {
      // Not yet loaded — estimate from totalTopics or count units
      total += 1;
    }
  }
  return { total, done };
}

/* =========================================================
   SIDEBAR
   ========================================================= */
function buildSidebar() {
  // Group subjects by semester
  const semMap = new Map();
  for (const subj of State.subjects) {
    if (!semMap.has(subj.semId)) semMap.set(subj.semId, []);
    semMap.get(subj.semId).push(subj);
  }

  let html = '';
  for (const [semId, subjects] of semMap) {
    html += `<div class="sidebar-section">
      <div class="sidebar-sem-label">${semId.replace('sem', 'Semester ')}</div>`;

    for (const subj of subjects) {
      const uid = `${subj.semId}-${subj.code}`;
      html += `
      <div class="sidebar-subject-wrap">
        <button class="sidebar-subject-btn" data-subj="${subj.code}" data-sem="${subj.semId}" aria-expanded="false" aria-controls="units-${uid}">
          <span>${subj.code} — ${subj.shortName}</span>
          <span class="caret" aria-hidden="true">›</span>
        </button>
        <ul class="sidebar-unit-list" id="units-${uid}" hidden>`;

      for (const unit of subj.units) {
        const topicListId = `topics-${uid}-${unit.index}`;
        html += `
          <li class="sidebar-unit-item">
            <button class="sidebar-unit-btn"
              data-subj="${subj.code}" data-sem="${subj.semId}" data-unit="${unit.index}"
              aria-expanded="false" aria-controls="${topicListId}">
              📖 ${unit.name}
            </button>
            <ul class="sidebar-topic-list" id="${topicListId}" hidden></ul>
          </li>`;
      }
      html += `</ul>
      </div>`;
    }
    html += `</div>`;
  }

  dom.sidebarContent.innerHTML = html;

  // Subject accordion listeners
  dom.sidebarContent.querySelectorAll('.sidebar-subject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = document.getElementById(btn.getAttribute('aria-controls'));
      const isOpen = !list.hidden;
      list.hidden = isOpen;
      btn.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  // Unit toggle listeners
  dom.sidebarContent.querySelectorAll('.sidebar-unit-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleUnitInSidebar(btn));
  });
}

async function toggleUnitInSidebar(btn) {
  const semId = btn.dataset.sem;
  const code = btn.dataset.subj;
  const unitIdx = parseInt(btn.dataset.unit, 10);
  const topicListId = btn.getAttribute('aria-controls');
  const topicList = document.getElementById(topicListId);
  if (!topicList) return;

  const isOpen = !topicList.hidden;
  if (isOpen) {
    topicList.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('active');
    return;
  }

  topicList.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('active');

  // Show loading placeholder if first time
  if (!topicList.dataset.loaded) {
    topicList.innerHTML = `<li style="padding:0.4rem 0.5rem;font-size:0.78rem;color:var(--clr-text-muted)">Loading…</li>`;
  }

  const subj = State.subjects.find(s => s.code === code && s.semId === semId);
  const unit = subj?.units.find(u => u.index === unitIdx);
  if (!unit) return;

  const topics = await loadTopics(semId, code, unitIdx, unit.mdFile);
  topicList.dataset.loaded = 'true';
  renderSidebarTopics(topicList, topics, semId, code, unitIdx);
}

function renderSidebarTopics(listEl, topics, semId, code, unitIdx) {
  if (!topics.length) {
    listEl.innerHTML = `<li style="padding:0.4rem 0.5rem;font-size:0.78rem;color:var(--clr-danger)">No topics found.</li>`;
    return;
  }

  listEl.innerHTML = topics.map((t, i) => {
    const readClass = isRead(t.topic_id) ? 'read' : '';
    const title = State.lang === 'en' ? (t.title_en || t.topic_id) : (t.title_hi || t.title_en || t.topic_id);
    return `<li class="sidebar-topic-item">
      <button class="sidebar-topic-btn ${readClass}"
        data-sem="${semId}" data-subj="${code}" data-unit="${unitIdx}" data-topicidx="${i}"
        title="${t.title_en}">
        <span class="dot" aria-hidden="true"></span>
        <span>${title}</span>
      </button>
    </li>`;
  }).join('');

  listEl.querySelectorAll('.sidebar-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const si = btn.dataset.sem;
      const sc = btn.dataset.subj;
      const ui = parseInt(btn.dataset.unit, 10);
      const ti = parseInt(btn.dataset.topicidx, 10);
      openTopicView(si, sc, ui, ti);
      closeSidebarMobile();
    });
  });
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function buildDashboard() {
  dom.dashboardGrid.innerHTML = State.subjects.map(subj => {
    const { total, done } = getSubjectProgress(subj);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const totalDisplay = subj.totalTopics || total;
    return `<div class="subject-card"
      data-subj="${subj.code}" data-sem="${subj.semId}"
      role="button" tabindex="0"
      aria-label="Open ${subj.name}">
      <div class="subject-card__code">${subj.semId.replace('sem','Sem ')} · ${subj.code}</div>
      <div class="subject-card__name">${subj.name}</div>
      <div class="subject-card__meta">
        <span>📚 ${subj.units.length} Units</span>
        <span>📝 ${totalDisplay} Topics</span>
      </div>
      <div class="subject-card__progress">
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-text">${done} / ${totalDisplay} topics read (${pct}%)</div>
      </div>
    </div>`;
  }).join('');

  dom.dashboardGrid.querySelectorAll('.subject-card').forEach(card => {
    const activate = () => {
      const code = card.dataset.subj;
      const semId = card.dataset.sem;
      const subj = State.subjects.find(s => s.code === code && s.semId === semId);
      if (subj) openSubjectFirstUnit(subj);
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
}

async function openSubjectFirstUnit(subj) {
  State.currentSubject = subj;
  State.currentUnitIndex = 0;
  const unit = subj.units[0];
  if (!unit) return;
  await loadAndOpenUnit(subj.semId, subj.code, 0, unit.mdFile);

  // Auto-open sidebar accordion
  activateSidebarSubject(subj.semId, subj.code);
}

/* =========================================================
   TOPIC LOADING
   ========================================================= */
async function loadTopics(semId, code, unitIdx, mdFile) {
  const key = `${semId}/${code}/${unitIdx}`;
  if (State.topicCache[key]) return State.topicCache[key];

  let raw = '';
  // Try preloaded store first if on file: protocol
  if (window.location.protocol === 'file:' && window.PRELOADED_CONTENT && window.PRELOADED_CONTENT[mdFile]) {
    raw = window.PRELOADED_CONTENT[mdFile];
  } else {
    try {
      const res = await fetch(mdFile);
      if (res.ok) {
        raw = await res.text();
      } else if (window.PRELOADED_CONTENT && window.PRELOADED_CONTENT[mdFile]) {
        raw = window.PRELOADED_CONTENT[mdFile];
      }
    } catch (err) {
      if (window.PRELOADED_CONTENT && window.PRELOADED_CONTENT[mdFile]) {
        raw = window.PRELOADED_CONTENT[mdFile];
      } else {
        console.error('loadTopics error:', err);
      }
    }
  }

  if (raw) {
    const topics = Parser.parseUnitFile(raw);
    State.topicCache[key] = topics;
    return topics;
  }

  State.topicCache[key] = [];
  return [];
}

async function loadAndOpenUnit(semId, code, unitIdx, mdFile) {
  showViewer();
  dom.contentCard.innerHTML = `<div class="loading"><div class="spinner"></div><p>Loading topics…</p></div>`;

  const topics = await loadTopics(semId, code, unitIdx, mdFile);

  if (!topics.length) {
    dom.contentCard.innerHTML = `<div class="error-box">
      ⚠️ No topics found in this unit.<br>
      <small>File: <code>${mdFile}</code></small><br>
      <small>Make sure the .md file uses the correct frontmatter format with <code>topic_id:</code> fields.</small>
    </div>`;
    return;
  }

  State.currentTopics = topics;
  State.currentTopicIndex = 0;
  renderTopic(topics[0]);
  updateViewerNav();
  updateBreadcrumb();
  activateSidebarTopic(semId, code, unitIdx, 0);
}

async function openTopicView(semId, code, unitIdx, topicIdx) {
  const subj = State.subjects.find(s => s.code === code && s.semId === semId);
  if (!subj) return;
  State.currentSubject = subj;
  State.currentUnitIndex = unitIdx;

  const unit = subj.units.find(u => u.index === unitIdx);
  if (!unit) return;

  const topics = await loadTopics(semId, code, unitIdx, unit.mdFile);
  if (!topics.length) return;

  State.currentTopics = topics;
  State.currentTopicIndex = Math.min(topicIdx, topics.length - 1);

  showViewer();
  renderTopic(topics[State.currentTopicIndex]);
  updateViewerNav();
  updateBreadcrumb();
  activateSidebarTopic(semId, code, unitIdx, State.currentTopicIndex);
}

/* =========================================================
   RENDER TOPIC
   ========================================================= */
function renderTopic(topic, scrollToTop = true) {
  if (!topic) {
    dom.contentCard.innerHTML = `<div class="error-box">Topic not found.</div>`;
    return;
  }

  const priorityClass = (topic.priority || '').toLowerCase();
  const tags = (topic.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  // ---- Header ----
  let html = `<div class="topic-header">
    <div class="topic-badges">
      <span class="topic-id-badge">${escHtml(topic.topic_id || '')}</span>
      ${topic.priority ? `<span class="priority-badge ${priorityClass}">${escHtml(topic.priority)}</span>` : ''}
    </div>
    <div class="topic-title-en">${escHtml(topic.title_en || '')}</div>
    <div class="topic-title-hi">${escHtml(topic.title_hi || '')}</div>
    ${tags.length ? `<div class="topic-tags">${tags.map(t => `<span class="topic-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
  </div>`;

  // ---- Sections ----
  const secs = topic.sections || {};
  const allKeys = Object.keys(secs);
  const orderedKeys = [
    ...SECTION_ORDER.filter(k => allKeys.includes(k)),
    ...allKeys.filter(k => !SECTION_ORDER.includes(k))
  ];

  for (const key of orderedKeys) {
    const sec = secs[key];
    if (!sec) continue;
    const isExam = key.toLowerCase().includes('exam') || key.toLowerCase().includes('question');

    html += `<div class="content-section ${isExam ? 'exam-section' : ''}">
      <h2>${getIconForSection(key)} ${escHtml(key)}</h2>`;

    if (sec.en) {
      html += `<div class="section-en">
        <span class="section-label en">🇬🇧 English</span>
        <div class="md-content">${renderMarkdown(sec.en)}</div>
      </div>`;
    }
    if (sec.hi) {
      html += `<div class="section-hi">
        <span class="section-label hi">🇮🇳 हिंदी</span>
        <div class="md-content">${renderMarkdown(sec.hi)}</div>
      </div>`;
    }

    html += `</div>`;
  }

  dom.contentCard.innerHTML = html;

  // ---- Mark Read Button ----
  const topicId = topic.topic_id;
  const alreadyRead = isRead(topicId);
  dom.markReadBtn.textContent = alreadyRead ? '✓ Read' : '✓ Mark as Read';
  dom.markReadBtn.className = `btn btn--sm${alreadyRead ? ' btn--success' : ''}`;

  dom.markReadBtn.onclick = () => {
    const wasNew = markRead(topicId);
    dom.markReadBtn.textContent = '✓ Read';
    dom.markReadBtn.className = 'btn btn--sm btn--success';
    if (wasNew) {
      showToast('Topic marked as read! 🎉');
      updateSidebarTopicReadState(topicId);
      updateBreadcrumb();
    }
  };

  // ---- Scroll ----
  if (scrollToTop) {
    dom.contentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderMarkdown(text) {
  if (!text) return '';
  try {
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
      return marked.parse(text);
    }
  } catch (e) {
    console.warn('Marked parse failed:', e);
  }
  return `<div class="raw-fallback">${escHtml(text).replace(/\n\n/g, '<p></p>').replace(/\n/g, '<br>')}</div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getIconForSection(key) {
  const k = key.toLowerCase();
  if (k.includes('quick') || k.includes('concept')) return '⚡';
  if (k.includes('short')) return '📝';
  if (k.includes('long')) return '📖';
  if (k.includes('exam') || k.includes('question')) return '🎯';
  return '📌';
}

/* =========================================================
   VIEWER NAVIGATION
   ========================================================= */
function updateViewerNav() {
  const idx = State.currentTopicIndex;
  const total = State.currentTopics.length;

  dom.topicCounter.textContent = `Topic ${idx + 1} of ${total}`;
  dom.prevTopicBtn.disabled = idx === 0;
  dom.prevTopicBtn2.disabled = idx === 0;
  dom.nextTopicBtn.disabled = idx === total - 1;
  dom.nextTopicBtn2.disabled = idx === total - 1;

  // Update progress label
  if (State.currentSubject) {
    const { total: tot, done } = getSubjectProgress(State.currentSubject);
    dom.progressLabel.textContent = `${done}/${tot} done`;
  }
}

function navigateTopic(dir) {
  const newIdx = State.currentTopicIndex + dir;
  if (newIdx < 0 || newIdx >= State.currentTopics.length) return;
  State.currentTopicIndex = newIdx;
  renderTopic(State.currentTopics[newIdx]);
  updateViewerNav();
  if (State.currentSubject) {
    activateSidebarTopic(
      State.currentSubject.semId,
      State.currentSubject.code,
      State.currentUnitIndex,
      newIdx
    );
  }
}

/* =========================================================
   BREADCRUMB
   ========================================================= */
function updateBreadcrumb() {
  const subj = State.currentSubject;
  const unitIdx = State.currentUnitIndex;
  if (!subj) return;
  const unit = subj.units.find(u => u.index === unitIdx);
  dom.viewerBreadcrumb.textContent = `${subj.code} › ${unit?.name || `Unit ${unitIdx + 1}`}`;
}

/* =========================================================
   SIDEBAR ACTIVE STATE HELPERS
   ========================================================= */
function activateSidebarSubject(semId, code) {
  const uid = `${semId}-${code}`;
  const list = $(`units-${uid}`);
  const btn = dom.sidebarContent.querySelector(`.sidebar-subject-btn[data-subj="${code}"][data-sem="${semId}"]`);
  if (list && list.hidden) {
    list.hidden = false;
    btn?.classList.add('open');
    btn?.setAttribute('aria-expanded', 'true');
  }
}

async function activateSidebarTopic(semId, code, unitIdx, topicIdx) {
  // Ensure subject accordion is open
  activateSidebarSubject(semId, code);

  // Ensure topic list is populated and visible
  const uid = `${semId}-${code}`;
  const topicList = $(`topics-${uid}-${unitIdx}`);
  if (topicList) {
    if (!topicList.dataset.loaded) {
      const subj = State.subjects.find(s => s.code === code && s.semId === semId);
      const unit = subj?.units.find(u => u.index === unitIdx);
      if (unit) {
        const topics = await loadTopics(semId, code, unitIdx, unit.mdFile);
        topicList.dataset.loaded = 'true';
        renderSidebarTopics(topicList, topics, semId, code, unitIdx);
      }
    }
    topicList.hidden = false;
    const unitBtn = dom.sidebarContent.querySelector(
      `.sidebar-unit-btn[data-subj="${code}"][data-sem="${semId}"][data-unit="${unitIdx}"]`
    );
    unitBtn?.setAttribute('aria-expanded', 'true');
    unitBtn?.classList.add('active');
  }

  // Clear previous active
  dom.sidebarContent.querySelectorAll('.sidebar-topic-btn.active').forEach(b => b.classList.remove('active'));

  const btn = dom.sidebarContent.querySelector(
    `.sidebar-topic-btn[data-sem="${semId}"][data-subj="${code}"][data-unit="${unitIdx}"][data-topicidx="${topicIdx}"]`
  );
  if (btn) {
    btn.classList.add('active');
    btn.scrollIntoView({ block: 'nearest' });
  }
}

function updateSidebarTopicReadState(topicId) {
  // Find topic button with matching topicidx (we need to look at State)
  const semId = State.currentSubject?.semId;
  const code = State.currentSubject?.code;
  const unitIdx = State.currentUnitIndex;
  const topicIdx = State.currentTopicIndex;
  if (!semId || !code) return;

  const btn = dom.sidebarContent.querySelector(
    `.sidebar-topic-btn[data-sem="${semId}"][data-subj="${code}"][data-unit="${unitIdx}"][data-topicidx="${topicIdx}"]`
  );
  if (btn) btn.classList.add('read');

  // Also refresh dashboard
  buildDashboard();
}

/* =========================================================
   VIEW SWITCHING
   ========================================================= */
function showViewer() {
  dom.dashboard.hidden = true;
  dom.viewer.hidden = false;
}

function showDashboard() {
  dom.viewer.hidden = true;
  dom.dashboard.hidden = false;
  buildDashboard();
}

/* =========================================================
   SEARCH
   ========================================================= */
let searchIndex = [];

async function buildSearchIndex() {
  for (const subj of State.subjects) {
    for (const unit of subj.units) {
      const topics = await loadTopics(subj.semId, subj.code, unit.index, unit.mdFile);
      topics.forEach((t, i) => {
        searchIndex.push({
          title: t.title_en || '',
          titleHi: t.title_hi || '',
          tags: t.tags || '',
          semId: subj.semId,
          code: subj.code,
          unitIdx: unit.index,
          topicIdx: i,
          topicId: t.topic_id,
          unitName: unit.name,
          subjName: subj.shortName,
        });
      });
    }
  }
}

let searchTimer = null;
function handleSearchInput(e) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(e.target.value.trim()), 180);
}

function runSearch(query) {
  if (!query) {
    dom.searchDropdown.hidden = true;
    return;
  }
  const q = query.toLowerCase();
  const results = searchIndex.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.titleHi.includes(q) ||
    item.tags.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    item.subjName.toLowerCase().includes(q)
  ).slice(0, 8);

  if (!results.length) {
    dom.searchDropdown.innerHTML = `<div class="search-result-item" style="pointer-events:none">
      <div class="search-result-item__title" style="color:var(--clr-text-muted)">No results for "${escHtml(query)}"</div>
    </div>`;
    dom.searchDropdown.hidden = false;
    return;
  }

  dom.searchDropdown.innerHTML = results.map((r, i) => `
    <div class="search-result-item" role="option" tabindex="0" data-ridx="${i}">
      <div class="search-result-item__title">${escHtml(r.title)}</div>
      <div class="search-result-item__sub">${escHtml(r.code)} · ${escHtml(r.unitName)}</div>
    </div>
  `).join('');

  dom.searchDropdown.querySelectorAll('.search-result-item').forEach((el, i) => {
    const selectResult = () => {
      const r = results[i];
      openTopicView(r.semId, r.code, r.unitIdx, r.topicIdx);
      dom.searchInput.value = '';
      dom.searchDropdown.hidden = true;
    };
    el.addEventListener('click', selectResult);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') selectResult();
    });
  });

  dom.searchDropdown.hidden = false;
}

/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */
function openSidebarMobile() {
  dom.sidebar.classList.add('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
    overlay.addEventListener('click', closeSidebarMobile);
  }
  overlay.classList.add('active');
  dom.sidebar.querySelector('button')?.focus();
}

function closeSidebarMobile() {
  dom.sidebar.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('active');
}

/* =========================================================
   TOAST
   ========================================================= */
let toastTimer = null;
function showToast(msg, duration = 2500) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), duration);
}

/* =========================================================
   ATTACH UI LISTENERS
   ========================================================= */
function attachUIListeners() {
  dom.themeToggle.addEventListener('click', toggleTheme);
  dom.langToggle.addEventListener('click', toggleLang);
  dom.fontDec.addEventListener('click', () => changeFont(-1));
  dom.fontInc.addEventListener('click', () => changeFont(1));

  dom.backBtn.addEventListener('click', showDashboard);
  dom.prevTopicBtn.addEventListener('click', () => navigateTopic(-1));
  dom.nextTopicBtn.addEventListener('click', () => navigateTopic(1));
  dom.prevTopicBtn2.addEventListener('click', () => navigateTopic(-1));
  dom.nextTopicBtn2.addEventListener('click', () => navigateTopic(1));

  dom.fabMenu.addEventListener('click', openSidebarMobile);
  dom.sidebarClose.addEventListener('click', closeSidebarMobile);

  // Search
  dom.searchInput.addEventListener('input', handleSearchInput);
  dom.searchInput.addEventListener('focus', () => {
    if (dom.searchInput.value.trim()) runSearch(dom.searchInput.value.trim());
  });
  document.addEventListener('click', e => {
    if (!dom.searchDropdown.contains(e.target) && e.target !== dom.searchInput) {
      dom.searchDropdown.hidden = true;
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (document.activeElement === dom.searchInput) return;
    if (e.key === 'ArrowRight' && !dom.viewer.hidden) { e.preventDefault(); navigateTopic(1); }
    if (e.key === 'ArrowLeft' && !dom.viewer.hidden) { e.preventDefault(); navigateTopic(-1); }
    if (e.key === 'Escape') { closeSidebarMobile(); dom.searchDropdown.hidden = true; }
  });

  // Marked.js config
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }
}

/* =========================================================
   BOOT
   ========================================================= */
document.addEventListener('DOMContentLoaded', init);
