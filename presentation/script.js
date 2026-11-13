/* =========================================================
   NEWL NEXUS · Presentation portal
   ---------------------------------------------------------
   Edit lesson content here — this is the ONLY place lesson
   data lives. `duration` is optional (seconds); when omitted
   it is read from the video's metadata once it has loaded.
   ========================================================= */
const LESSONS = [
  {
    id: 'lesson-01',
    title: 'Introduction to NEWL NEXUS',
    category: 'Getting Started',
    description: 'An overview of NEWL NEXUS and what the platform brings together.',
    videoUrl: 'https://aws-filez.s3.eu-north-1.amazonaws.com/newl-africa-lesson-01.mp4'
  },
  {
    id: 'lesson-02',
    title: 'Navigating the Platform',
    category: 'Getting Started',
    description: 'Find your way around the interface, menus and key screens.',
    videoUrl: 'https://aws-filez.s3.eu-north-1.amazonaws.com/newl-africa-lesson-02.mp4'
  },
  {
    id: 'lesson-03',
    title: 'Understanding the Modules',
    category: 'Platform Fundamentals',
    description: 'How the platform modules are organised and how they relate to each other.',
    videoUrl: 'https://aws-filez.s3.eu-north-1.amazonaws.com/newl-africa-lesson-03.mp4'
  },
  {
    id: 'lesson-04',
    title: 'Operations and Execution',
    category: 'Core Workflows',
    description: 'Coordinating operations and carrying work through to execution.',
    videoUrl: 'https://aws-filez.s3.eu-north-1.amazonaws.com/newl-africa-lesson-04.mp4'
  },
  {
    id: 'lesson-05',
    title: 'Monitoring and Management',
    category: 'Core Workflows',
    description: 'Keeping track of progress and performance across your operations.',
    videoUrl: 'https://aws-filez.s3.eu-north-1.amazonaws.com/newl-africa-lesson-05.mp4'
  },
  {
    id: 'lesson-06',
    title: 'Putting It All Together',
    category: 'Wrap-up',
    description: 'Bringing every part of the platform together, end to end.',
    videoUrl: 'https://aws-filez.s3.eu-north-1.amazonaws.com/newl-africa-lesson-06.mp4'
  }
];

(() => {
  'use strict';

  const STORAGE_KEY = 'newlNexus.presentation.v1';
  const RING_CIRCUMFERENCE = 2 * Math.PI * 15;
  const total = LESSONS.length;

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    list: $('lessonList'), video: $('video'),
    number: $('lessonNumber'), category: $('lessonCategory'), title: $('lessonTitle'),
    desc: $('lessonDesc'), doneBadge: $('lessonDoneBadge'), head: document.querySelector('.lesson-head'),
    loading: $('loadingOverlay'), error: $('errorOverlay'), done: $('doneOverlay'), final: $('finalOverlay'),
    doneText: $('doneText'), overlayNext: $('overlayNextBtn'), overlayNextLabel: $('overlayNextLabel'),
    prev: $('prevBtn'), next: $('nextBtn'), nextLabel: $('nextLabel'), status: $('stageStatus'),
    sumCount: $('sumCount'), sumPct: $('sumPct'),
    cpFill: $('cpFill'), cpValue: $('cpValue'), cpTrack: $('cpTrack'),
    topText: $('topProgressText'), topRing: $('topRing'), toast: $('toast'),
    player: document.querySelector('.player')
  };

  /* ---------- State (persisted) ---------- */
  const state = loadState();

  function loadState() {
    const fallback = { current: LESSONS[0].id, completed: [], durations: {} };
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!raw || typeof raw !== 'object') return fallback;
      const ids = new Set(LESSONS.map((l) => l.id));
      return {
        current: ids.has(raw.current) ? raw.current : fallback.current,
        completed: Array.isArray(raw.completed) ? raw.completed.filter((id) => ids.has(id)) : [],
        durations: raw.durations && typeof raw.durations === 'object' ? raw.durations : {}
      };
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }

  /* ---------- Helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const indexOf = (id) => LESSONS.findIndex((l) => l.id === id);
  const isDone = (id) => state.completed.includes(id);
  const allDone = () => state.completed.length === total;
  const firstIncomplete = () => LESSONS.findIndex((l) => !isDone(l.id));
  let currentIndex = Math.max(0, indexOf(state.current));
  const current = () => LESSONS[currentIndex];

  function formatDuration(sec) {
    if (!sec || !isFinite(sec)) return '';
    const s = Math.round(sec);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
  }
  const durationOf = (lesson) => lesson.duration || state.durations[lesson.id];

  /* ---------- Build lesson list (once) ---------- */
  const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const items = LESSONS.map((lesson, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lesson';
    btn.innerHTML =
      `<span class="l-mark"><span>${i + 1}</span>${CHECK_SVG}</span>` +
      `<span class="l-text"><span class="l-kicker">Lesson ${pad(i + 1)}</span><span class="l-title"></span></span>` +
      `<span class="l-meta"></span>`;
    btn.querySelector('.l-title').textContent = lesson.title;
    btn.addEventListener('click', () => goTo(i, { user: true }));
    li.appendChild(btn);
    el.list.appendChild(li);
    return btn;
  });

  /* ---------- Rendering ---------- */
  function renderList() {
    items.forEach((btn, i) => {
      const lesson = LESSONS[i];
      const done = isDone(lesson.id);
      const active = i === currentIndex;
      btn.classList.toggle('is-done', done);
      btn.setAttribute('aria-current', active ? 'true' : 'false');
      btn.querySelector('.l-meta').textContent = formatDuration(durationOf(lesson));
      btn.setAttribute('aria-label',
        `Lesson ${i + 1}: ${lesson.title}${done ? ' (completed)' : ''}${active ? ' (current)' : ''}`);
    });
  }

  function renderProgress() {
    const count = state.completed.length;
    const pct = Math.round((count / total) * 100);
    el.sumCount.textContent = `${count} / ${total}`;
    el.sumPct.textContent = `${pct}%`;
    el.cpValue.textContent = `${pct}%`;
    el.cpFill.style.width = `${pct}%`;
    el.cpTrack.setAttribute('aria-valuenow', String(pct));
    el.topText.textContent = `${count} / ${total}`;
    el.topRing.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - count / total));
  }

  function renderHeader(animate) {
    const lesson = current();
    el.number.textContent = `Lesson ${pad(currentIndex + 1)} of ${pad(total)}`;
    el.category.textContent = lesson.category || '';
    el.title.textContent = lesson.title;
    el.desc.textContent = lesson.description || '';
    el.desc.hidden = !lesson.description;
    el.doneBadge.hidden = !isDone(lesson.id);
    document.title = `${lesson.title} · NEWL NEXUS`;
    if (animate) {
      el.head.classList.remove('swap');
      void el.head.offsetWidth; // restart animation
      el.head.classList.add('swap');
    }
  }

  /** What "Next" does from the current lesson. */
  function nextTarget() {
    if (currentIndex < total - 1) return { type: 'lesson', index: currentIndex + 1 };
    if (allDone()) return { type: 'final' };
    const pending = firstIncomplete();
    return pending !== currentIndex ? { type: 'lesson', index: pending } : { type: 'none' };
  }

  function renderNav() {
    const done = isDone(current().id);
    const target = nextTarget();
    el.prev.disabled = currentIndex === 0;

    let label = 'Next lesson';
    if (target.type === 'final' || target.type === 'none') label = 'Finish';
    else if (currentIndex === total - 1) label = `Go to lesson ${target.index + 1}`;
    el.nextLabel.textContent = label;
    el.overlayNextLabel.textContent = label === 'Finish' ? 'View completion' : label;
    el.next.disabled = target.type === 'none';
    el.next.classList.toggle('is-ready', done && target.type !== 'none');

    el.status.classList.toggle('ok', done);
    el.status.textContent = done
      ? 'Lesson completed — continue when you’re ready'
      : 'Watch to the end to complete this lesson';
  }

  function render(animate) {
    renderList();
    renderProgress();
    renderHeader(animate);
    renderNav();
  }

  /* ---------- Overlays ---------- */
  function hideOverlays() {
    el.error.hidden = el.done.hidden = el.final.hidden = true;
  }
  const setLoading = (on) => { el.loading.hidden = !on; };

  function showDoneOverlay() {
    const remaining = total - state.completed.length;
    el.doneText.textContent = remaining
      ? `${remaining} lesson${remaining === 1 ? '' : 's'} remaining. Continue when you’re ready.`
      : 'All lessons completed.';
    el.done.hidden = false;
  }

  function showFinal() {
    el.video.pause();
    hideOverlays();
    setLoading(false);
    el.final.hidden = false;
  }

  let toastTimer;
  function toast(msg) {
    el.toast.innerHTML = CHECK_SVG;
    el.toast.appendChild(document.createTextNode(msg));
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600);
  }

  /* ---------- Loading lessons (only the active video is ever requested) ---------- */
  function loadVideo(autoplay) {
    const v = el.video;
    hideOverlays();
    v.pause();
    v.src = current().videoUrl;   // replaces & aborts any previous download
    v.load();                     // resets currentTime / playback state
    if (autoplay) {
      const p = v.play();
      if (p && p.catch) p.catch(() => { /* autoplay blocked — user can press play */ });
    }
  }

  function goTo(index, { user = false } = {}) {
    if (index < 0 || index >= total) return;
    const same = index === currentIndex;
    currentIndex = index;
    state.current = current().id;
    saveState();
    render(!same);
    loadVideo(user);
    if (user) revealActive();
  }

  /** Keep the active lesson chip and the player in view (matters on mobile). */
  function centerActiveChip(smooth) {
    const btn = items[currentIndex];
    const list = el.list;
    if (list.scrollWidth > list.clientWidth) {
      const left = btn.parentElement.offsetLeft - (list.clientWidth - btn.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function revealActive() {
    centerActiveChip(true);
    const r = el.player.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 72), behavior: 'smooth' });
    }
  }

  function goNext() {
    const target = nextTarget();
    if (target.type === 'lesson') goTo(target.index, { user: true });
    else if (target.type === 'final') showFinal();
  }

  /* ---------- Video events ---------- */
  const v = el.video;

  v.addEventListener('loadstart', () => setLoading(true));
  v.addEventListener('waiting', () => setLoading(true));
  ['loadedmetadata', 'canplay', 'playing', 'pause'].forEach((evt) =>
    v.addEventListener(evt, () => setLoading(false)));

  v.addEventListener('loadedmetadata', () => {
    const lesson = current();
    if (!lesson.duration && isFinite(v.duration) && v.duration > 0 &&
        Math.round(v.duration) !== Math.round(state.durations[lesson.id] || 0)) {
      state.durations[lesson.id] = Math.round(v.duration);
      saveState();
      renderList();
    }
  });

  v.addEventListener('play', () => { el.done.hidden = true; });

  v.addEventListener('ended', () => {
    const lesson = current();
    const firstTime = !isDone(lesson.id);
    if (firstTime) {
      state.completed.push(lesson.id);
      saveState();
      toast(`Lesson ${currentIndex + 1} completed`);
    }
    render(false);
    if (allDone() && currentIndex === total - 1) showFinal();
    else showDoneOverlay();
  });

  v.addEventListener('error', () => {
    // Ignore errors that don't belong to the lesson currently selected.
    if (!v.getAttribute('src') || v.getAttribute('src') !== current().videoUrl) return;
    setLoading(false);
    el.done.hidden = el.final.hidden = true;
    el.error.hidden = false;
  });

  /* ---------- Controls ---------- */
  el.prev.addEventListener('click', () => goTo(currentIndex - 1, { user: true }));
  el.next.addEventListener('click', goNext);
  el.overlayNext.addEventListener('click', goNext);
  $('retryBtn').addEventListener('click', () => loadVideo(true));
  $('replayBtn').addEventListener('click', () => {
    el.done.hidden = true;
    v.currentTime = 0;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  });
  $('restartBtn').addEventListener('click', () => {
    state.completed = [];
    saveState();
    goTo(0, { user: false });
    toast('Presentation restarted');
  });

  /* ---------- Init ---------- */
  render(false);
  loadVideo(false);
  centerActiveChip(false);
})();
