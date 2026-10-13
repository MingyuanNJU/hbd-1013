(() => {
  'use strict';
  const C = window.CONTENT;
  const MODULES = window.HBD_MODULES || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  // 以 TODO 开头的占位不显示，免得忘了改时被她看到
  const fill = (s) => (/^\s*TODO/.test(String(s)) ? '' : String(s).replace(/\{name\}/g, C.name));

  // ---------- 本地记忆（刷新后不用从头再来） ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('hbd:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('hbd:' + k, JSON.stringify(v)); } catch (e) { /* 无痕模式等 */ } },
  };

  // ---------- 文案填充 ----------
  $$('[data-text]').forEach((el) => {
    const v = el.dataset.text.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
    if (typeof v === 'string') el.textContent = fill(v);
  });
  $('#wishTitle').textContent = fill(C.wish.title);
  document.title = fill('生日快乐，{name}');

  // ---------- 声音（WebAudio 合成，无需音频文件） ----------
  const sound = (() => {
    let ctx = null;
    let muted = store.get('muted', false);
    const btn = $('#muteBtn');
    const paint = () => { btn.textContent = muted ? '🔈' : '🔊'; btn.setAttribute('aria-label', muted ? '打开声音' : '关闭声音'); };
    paint();
    btn.addEventListener('click', () => { muted = !muted; store.set('muted', muted); paint(); });

    function get() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, start, dur, vol = 0.18, type = 'sine') {
      const a = get(); if (!a || muted) return;
      const t = a.currentTime + start;
      [[1, vol], [2, vol * 0.25], [3, vol * 0.08]].forEach(([mul, v]) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type; o.frequency.value = freq * mul;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.25, dur));
        o.connect(g).connect(a.destination);
        o.start(t); o.stop(t + dur + 0.05);
      });
    }
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    // Happy Birthday（公有领域旋律），[MIDI 音高, 拍数]
    const SONG = [
      [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
      [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 2.5],
    ];
    return {
      unlock: get,
      ctx: get,
      get muted() { return muted; },
      blip(n = 76, d = 0.18) { tone(midi(n), 0, d, 0.14); },
      chord(ns) { ns.forEach((n, i) => tone(midi(n), i * 0.07, 0.6, 0.12)); },
      birthday() {
        const beat = 0.48;
        let t = 0.1;
        SONG.forEach(([n, b]) => { tone(midi(n), t, b * beat * 1.6, 0.16); t += b * beat; });
      },
    };
  })();

  // ---------- 彩带 ----------
  const confetti = (() => {
    const cv = $('#confetti');
    const g = cv.getContext('2d');
    const colors = ['#E4547A', '#F48FA8', '#F2B33D', '#2457A6', '#7FA6FF', '#7ED6B2', '#FFFFFF'];
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let parts = [];
    let raf = 0;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function burst(n = 140, opts = {}) {
      if (reduce) n = Math.round(n / 4);
      size();
      const x0 = opts.x != null ? opts.x : innerWidth / 2;
      const y0 = opts.y != null ? opts.y : innerHeight * 0.35;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 4 + Math.random() * 9;
        parts.push({
          x: x0, y: y0,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
          c: colors[(Math.random() * colors.length) | 0],
          heart: opts.hearts && Math.random() < 0.5,
          life: 0,
        });
      }
      if (!raf) raf = requestAnimationFrame(step);
    }
    function heart(x, y, s, c) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(x, y + s * 0.3);
      g.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
      g.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
      g.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
      g.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
      g.fill();
    }
    function step() {
      g.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter((p) => p.y < innerHeight + 40 && p.life < 600);
      parts.forEach((p) => {
        p.life++; p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx + Math.sin(p.life / 12) * 0.6; p.y += p.vy; p.r += p.vr;
        if (p.heart) { heart(p.x, p.y, p.w * 1.6, p.c); return; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 8)));
        g.restore();
      });
      raf = parts.length ? requestAnimationFrame(step) : 0;
      if (!raf) g.clearRect(0, 0, cv.width, cv.height);
    }
    return { burst };
  })();

  // ---------- 大图 ----------
  const lightbox = (() => {
    const box = $('#lightbox');
    const close = () => { box.hidden = true; $('#lbImg').removeAttribute('src'); };
    box.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
    return {
      open(src, cap) {
        $('#lbImg').src = src;
        $('#lbImg').alt = cap || '';
        $('#lbCap').textContent = cap || '';
        box.hidden = false;
      },
    };
  })();

  // ---------- 车站 ----------
  const sections = $$('.station');
  const names = sections.map((s) => s.dataset.station);
  const gateOn = Array.isArray(C.gate.answers) && C.gate.answers.length > 0;
  let reached = Math.min(store.get('reached', 0), names.length - 1);
  let current = -1;

  const stops = $('#stops');
  sections.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'stop';
    li.innerHTML = '<button type="button"></button><span></span>';
    li.querySelector('span').textContent = s.dataset.label;
    li.querySelector('button').setAttribute('aria-label', '前往：' + s.dataset.label);
    li.querySelector('button').addEventListener('click', () => { if (i <= reached && i > 0) go(i); });
    stops.appendChild(li);
  });

  function paintLine() {
    $$('.stop', stops).forEach((li, i) => {
      li.classList.toggle('is-reached', i <= reached);
      li.classList.toggle('is-current', i === current);
      li.querySelector('button').disabled = !(i <= reached && i > 0);
    });
    stops.style.setProperty('--progress', current / (names.length - 1));
  }

  function go(i) {
    i = Math.max(0, Math.min(names.length - 1, i));
    if (i === current) return;
    const prev = names[current];
    if (prev && MODULES[prev] && MODULES[prev].leave) MODULES[prev].leave();
    sections.forEach((s, k) => { s.hidden = k !== i; });
    current = i;
    reached = Math.max(reached, i);
    store.set('reached', reached);
    store.set('current', i);
    $('#line').hidden = i === 0;
    paintLine();
    window.scrollTo(0, 0);
    const m = MODULES[names[i]];
    if (m && m.enter) m.enter();
  }

  $$('.next').forEach((b) => b.addEventListener('click', () => { sound.blip(79, 0.12); go(current + 1); }));

  // ---------- 0 检票口 ----------
  const norm = (s) => String(s).trim().toLowerCase().replace(/[\s\-_.。、，,/]/g, '');
  let tries = 0;
  $('#gateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    sound.unlock();
    const val = norm($('#gateInput').value);
    const ok = C.gate.answers.some((a) => norm(a) === val);
    if (ok) {
      $('#gateErr').textContent = '';
      $('#gateInput').blur();
      sound.chord([72, 76, 79, 84]);
      confetti.burst(80, { hearts: true });
      setTimeout(() => go(1), 450);
    } else {
      tries++;
      $('#gateErr').textContent = tries > 2 ? '再想想～ 提示就在上面哦' : '车票好像不太对，再试一次？';
      $('#gateHint').hidden = false;
      const t = $('.ticket');
      t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
    }
  });

  // ---------- 2 甜蜜点滴 ----------
  MODULES.timeline = {
    init() {
      const ol = $('#timeline');
      C.timeline.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'tl';
        li.innerHTML =
          '<div class="tl__meta"><span class="tl__place"></span><span class="tl__date"></span></div>' +
          '<div class="tl__card"><img loading="lazy" decoding="async" alt=""><p class="tl__text"></p></div>';
        li.querySelector('.tl__place').textContent = fill(it.place || '') ? '📍 ' + fill(it.place) : '';
        li.querySelector('.tl__date').textContent = fill(it.date || '');
        const img = li.querySelector('img');
        img.src = it.img; img.alt = fill(it.place || '');
        img.addEventListener('click', () => lightbox.open(it.img, fill(it.text)));
        li.querySelector('.tl__text').textContent = fill(it.text);
        ol.appendChild(li);
      });
    },
    enter() {
      const items = $$('.tl');
      if (!('IntersectionObserver' in window)) { items.forEach((x) => x.classList.add('is-in')); return; }
      if (this.io) return;
      this.io = new IntersectionObserver((ents) => {
        ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); this.io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -10% 0px' });
      items.forEach((x) => this.io.observe(x));
    },
  };

  // ---------- 6 终点站 ----------
  MODULES.letter = {
    init() {
      this.text = fill(C.letter);
      const now = new Date();
      $('#letterSign').textContent = '—— ' + fill(C.from) + '\n' + now.getFullYear() + ' 年 10 月 13 日';
      $('#letter').addEventListener('click', () => this.finish());
      $('#toWall').addEventListener('click', () => go(names.indexOf('wall')));
      $('#again').addEventListener('click', () => {
        Object.values(MODULES).forEach((m) => m.reset && m.reset());
        go(1);
      });
    },
    enter() {
      if (this.done) return;
      const body = $('#letterBody');
      body.textContent = '';
      body.classList.add('is-typing');
      let i = 0;
      const tick = () => {
        if (this.done) return;
        i++;
        body.textContent = this.text.slice(0, i);
        if (i >= this.text.length) { this.finish(); return; }
        const ch = this.text[i - 1];
        const d = '，、'.includes(ch) ? 220 : '。！？\n'.includes(ch) ? 420 : 55;
        this.timer = setTimeout(tick, d);
      };
      this.timer = setTimeout(tick, 600);
    },
    leave() { clearTimeout(this.timer); if (!this.done) $('#letterBody').textContent = ''; },
    finish() {
      if (this.done) return;
      this.done = true;
      clearTimeout(this.timer);
      const body = $('#letterBody');
      body.textContent = this.text;
      body.classList.remove('is-typing');
      $('#letterSign').hidden = false;
      $('#letterSkip').hidden = true;
      $('#letterEnd').hidden = false;
      confetti.burst(160, { hearts: true, y: innerHeight * 0.5 });
      sound.chord([72, 76, 79, 84, 88]);
    },
    reset() { /* 信看过一次就保持展开 */ },
  };

  // ---------- 启动 ----------
  const api = { C, $, $$, fill, store, sound, confetti, lightbox, go, get current() { return current; } };
  Object.values(MODULES).forEach((m) => { try { m.init && m.init(api); } catch (err) { console.error(err); } });

  // 任意一次点击都尝试解锁音频（iOS 需要）
  window.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  const saved = store.get('current', 0);
  if (!gateOn) go(Math.max(1, saved));
  else go(reached >= 1 ? Math.max(1, saved) : 0);
})();
