(() => {
  'use strict';
  const C = window.CONTENT;
  const SCENE = window.HBD_SCENE;
  const MODULES = window.HBD_MODULES || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
  // 以 TODO 开头的占位不显示；{name} 和其它 {变量} 自动替换
  const fill = (s, vars) => {
    s = String(s == null ? '' : s);
    if (/^\s*TODO/.test(s)) return '';
    return s.replace(/\{(\w+)\}/g, (m, k) => (k === 'name' ? C.name : vars && vars[k] != null ? vars[k] : m));
  };

  // ---------- 本地记忆（刷新后不用从头再来） ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('hbd:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('hbd:' + k, JSON.stringify(v)); } catch (e) { /* 无痕模式等 */ } },
  };

  // ---------- 文案填充 ----------
  $$('[data-text]').forEach((el) => { const v = get(el.dataset.text); if (typeof v === 'string') el.textContent = fill(v); });
  $$('[data-placeholder]').forEach((el) => { const v = get(el.dataset.placeholder); if (typeof v === 'string') el.placeholder = fill(v); });
  $('#wishTitle').textContent = fill(C.wish.title);
  document.title = fill(C.common.pageTitle);

  // ---------- 声音（全部用 WebAudio 合成） ----------
  const sound = (() => {
    let ctx = null;
    let muted = store.get('muted', false);
    const btn = $('#muteBtn');
    const paint = () => { btn.textContent = muted ? '🔈' : '🔊'; btn.setAttribute('aria-label', muted ? '打开声音' : '关闭声音'); };
    paint();
    btn.addEventListener('click', () => { muted = !muted; store.set('muted', muted); paint(); });

    function ac() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, start, dur, vol = 0.18, partials = [[1, 1], [2, 0.25], [3, 0.08]]) {
      const a = ac(); if (!a || muted) return;
      const t = a.currentTime + start;
      partials.forEach(([mul, v]) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.frequency.value = freq * mul;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.12, dur));
        o.connect(g).connect(a.destination);
        o.start(t); o.stop(t + dur + 0.05);
      });
    }
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    let noise = null;
    function noiseBuf(a) {
      if (noise) return noise;
      noise = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      return noise;
    }
    // Happy Birthday（公有领域旋律），[MIDI 音高, 拍数]
    const SONG = [
      [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
      [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 2.5],
    ];
    return {
      unlock: ac,
      ctx: ac,
      blip(n = 76, d = 0.18) { tone(midi(n), 0, d, 0.14); },
      chord(ns) { ns.forEach((n, i) => tone(midi(n), i * 0.07, 0.6, 0.12)); },
      birthday() {
        const beat = 0.48;
        let t = 0.1;
        SONG.forEach(([n, b]) => { tone(midi(n), t, b * beat * 1.6, 0.16); t += b * beat; });
      },
      // 踏切的「当当」声
      crossing(times = 4) {
        for (let i = 0; i < times; i++) tone(i % 2 ? 990 : 1050, i * 0.32, 0.3, 0.07, [[1, 1], [2.76, 0.4], [5.4, 0.15]]);
      },
      // 电车驶过：低频轰隆 + 轨缝的「哐当哐当」
      rumble(dur = 1.5) {
        const a = ac(); if (!a || muted) return;
        const t = a.currentTime;
        const src = a.createBufferSource(); src.buffer = noiseBuf(a);
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(lp).connect(g).connect(a.destination);
        src.start(t); src.stop(t + dur + 0.05);
        for (let k = 0.15; k < dur - 0.15; k += 0.27) {
          [0, 0.07].forEach((o) => {
            const os = a.createOscillator(); const og = a.createGain();
            os.frequency.setValueAtTime(110, t + k + o); os.frequency.exponentialRampToValueAtTime(45, t + k + o + 0.08);
            og.gain.setValueAtTime(0.25, t + k + o); og.gain.exponentialRampToValueAtTime(0.0001, t + k + o + 0.1);
            os.connect(og).connect(a.destination); os.start(t + k + o); os.stop(t + k + o + 0.12);
          });
        }
      },
    };
  })();

  // ---------- 彩带 ----------
  const confetti = (() => {
    const cv = $('#confetti');
    const g = cv.getContext('2d');
    const colors = ['#1E6FD9', '#27B0E6', '#8FD0FA', '#FFFFFF', '#FFC94D', '#FF6F91', '#7FE0D0'];
    let parts = [];
    let raf = 0;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function burst(n = 140, opts = {}) {
      if (SCENE.reduce) n = Math.round(n / 4);
      size();
      const x0 = opts.x != null ? opts.x : innerWidth / 2;
      const y0 = opts.y != null ? opts.y : innerHeight * 0.35;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 4 + Math.random() * 9;
        parts.push({
          x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
          w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
          c: colors[(Math.random() * colors.length) | 0],
          heart: opts.hearts && Math.random() < 0.5, life: 0,
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
        if (p.heart) { heart(p.x, p.y, p.w * 1.6, p.c === '#FFFFFF' ? '#FF6F91' : p.c); return; }
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

  // ---------- 车站、线路图、站名牌 ----------
  const sections = $$('.station');
  const names = sections.map((s) => s.dataset.station);
  const stName = (k) => fill((C.stations[k] || {}).name || '');
  const gateOn = Array.isArray(C.gate.answers) && C.gate.answers.length > 0;
  let reached = Math.min(store.get('reached', 0), names.length - 1);
  let current = -1;
  let busy = false;

  $$('[data-board]').forEach((el) => {
    const k = el.dataset.board;
    const i = names.indexOf(k);
    const st = C.stations[k] || {};
    el.innerHTML = '<div class="board__name"></div><div class="board__roman"></div><div class="board__band"><span></span><span></span></div>';
    el.querySelector('.board__name').textContent = fill(st.name);
    el.querySelector('.board__roman').textContent = fill(st.roman);
    const [l, r] = el.querySelectorAll('.board__band span');
    l.textContent = i > 0 ? '← ' + stName(names[i - 1]) : '';
    r.textContent = i < names.length - 1 ? stName(names[i + 1]) + ' →' : '';
  });

  const stops = $('#stops');
  sections.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'stop';
    li.innerHTML = '<button type="button"></button><span></span>';
    li.querySelector('span').textContent = stName(names[i]);
    li.querySelector('button').setAttribute('aria-label', '前往：' + stName(names[i]));
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

  function show(i) {
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
    const sec = sections[i];
    sec.classList.add('is-arriving');
    setTimeout(() => sec.classList.remove('is-arriving'), 900);
    const m = MODULES[names[i]];
    if (m && m.enter) m.enter();
  }

  function go(i, opts = {}) {
    i = Math.max(0, Math.min(names.length - 1, i));
    if (i === current || busy) return;
    if (current < 0 || opts.instant) { show(i); return; }
    busy = true;
    sound.crossing(4);
    setTimeout(() => {
      sound.rumble(1.5);
      SCENE.pass(() => show(i)).then(() => { busy = false; });
    }, 280);
  }

  $$('.next').forEach((b) => b.addEventListener('click', () => go(current + 1)));

  SCENE.prepare(fill(C.common.trainSign), fill(C.common.trainDest));
  SCENE.ambient(fill(C.common.trainSign), fill(C.common.trainDest));

  // ---------- 0 检票口 ----------
  const norm = (s) => String(s).trim().toLowerCase().replace(/[\s\-_.。、，,/]/g, '');
  let tries = 0;
  $('#gateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    sound.unlock();
    if (busy) return;
    const val = norm($('#gateInput').value);
    const ok = C.gate.answers.some((a) => norm(a) === val);
    if (ok) {
      $('#gateErr').textContent = '';
      $('#gateInput').blur();
      $('#crossing').classList.add('is-alert');
      confetti.burst(60, { hearts: true });
      go(1);
    } else {
      tries++;
      $('#gateErr').textContent = fill(tries > 2 ? C.gate.wrongAgain : C.gate.wrong);
      $('#gateHint').hidden = false;
      const t = $('.ticket');
      t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
    }
  });

  // ---------- 2 甜蜜点滴 ----------
  MODULES.timeline = {
    init() {
      const ol = $('#timeline');
      C.timeline.items.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'tl';
        li.innerHTML =
          '<div class="tl__meta"><span class="tl__place"></span><span class="tl__date"></span></div>' +
          '<div class="tl__card"><img loading="lazy" decoding="async" alt=""><p class="tl__text"></p></div>';
        const place = fill(it.place);
        li.querySelector('.tl__place').textContent = place ? '📍 ' + place : '';
        li.querySelector('.tl__date').textContent = fill(it.date);
        const img = li.querySelector('img');
        img.src = it.img; img.alt = place;
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
      this.text = fill(C.letter.body);
      $('#letterSign').textContent = '—— ' + fill(C.from) + '\n' + fill(C.letter.dateLine, { year: new Date().getFullYear() });
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
  };

  // ---------- 启动 ----------
  const api = {
    C, $, $$, fill, store, sound, confetti, lightbox, go,
    get station() { return names[current]; },
  };
  Object.values(MODULES).forEach((m) => { try { m.init && m.init(api); } catch (err) { console.error(err); } });

  // 任意一次点击都尝试解锁音频（iOS 需要）
  window.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  const saved = store.get('current', 0);
  if (!gateOn) go(Math.max(1, saved));
  else go(reached >= 1 ? Math.max(1, saved) : 0);
})();
