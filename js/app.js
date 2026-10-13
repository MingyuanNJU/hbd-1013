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

  // ---------- 声音：合成音效 + 可选的背景音乐 / 真实录音（见 content.js 的 audio） ----------
  const sound = (() => {
    const A = () => C.audio || {};
    const num = (v, d) => (typeof v === 'number' ? v : d);
    let ctx = null, master = null, bgmEl = null, bgmGain = null;
    let songEl = null, hold = false, songCb = null;   // 播放「我们的歌」时暂停背景音乐
    let muted = store.get('muted', false);
    const bufs = {};
    const btn = $('#muteBtn');
    const paint = () => { btn.classList.toggle('is-muted', muted); btn.setAttribute('aria-label', muted ? '打开声音' : '关闭声音'); };
    paint();
    btn.addEventListener('click', () => { muted = !muted; store.set('muted', muted); paint(); ac(); startBgm(); applyMute(); });

    function ac() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        // iPhone 静音键打开时也让网页出声（Safari 17+ 支持）
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ctx.destination);
        loadSamples();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    // ---- 录音音效：下载 → 解码 → 找到最响的位置 ----
    function loadSamples() {
      ['train', 'crossing'].forEach((k) => {
        const url = A()[k];
        if (!url) return;
        fetch(url)
          .then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); })
          .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
          .then((b) => { b.peak = peakTime(b); bufs[k] = b; })
          .catch((e) => console.warn('音效加载失败，改用合成音：', e));
      });
    }
    function peakTime(b) {
      const d = b.getChannelData(0), win = Math.floor(b.sampleRate * 0.1);
      let best = 0, at = 0;
      for (let i = 0; i + win < d.length; i += win) {
        let s = 0;
        for (let j = i; j < i + win; j += 4) s += d[j] * d[j];
        if (s > best) { best = s; at = i; }
      }
      return at / b.sampleRate;
    }
    function play(buf, { offset = 0, dur = buf.duration, vol = 1, fadeIn = 0.05, fadeOut = 0.5 } = {}) {
      const a = ac(); if (!a || muted) return;
      offset = Math.max(0, Math.min(offset, buf.duration - 0.1));
      dur = Math.min(dur, buf.duration - offset);
      const src = a.createBufferSource();
      const g = a.createGain();
      const t = a.currentTime;
      src.buffer = buf;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + fadeIn);
      g.gain.setValueAtTime(vol, t + Math.max(fadeIn, dur - fadeOut));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(g).connect(master);
      src.start(t, offset, dur + 0.05);
    }

    // ---- 背景音乐 ----
    const bgmVol = () => num(A().bgmVolume, 0.35);
    function startBgm() {
      if (bgmEl || !A().bgm || !ac()) return;
      bgmEl = new Audio();
      bgmEl.src = A().bgm;
      bgmEl.loop = true;
      bgmEl.preload = 'auto';
      bgmEl.setAttribute('playsinline', '');
      try { // 接到 WebAudio 上才能在 iPhone 上调音量、做淡入淡出
        bgmGain = ctx.createGain();
        bgmGain.gain.value = 0.0001;
        ctx.createMediaElementSource(bgmEl).connect(bgmGain).connect(master);
      } catch (e) { bgmGain = null; }
      resumeBgm(2.5);
    }
    function ramp(to, secs) {
      if (!bgmGain) { if (bgmEl) bgmEl.volume = Math.max(0, Math.min(1, to)); return; }
      const t = ctx.currentTime;
      bgmGain.gain.cancelScheduledValues(t);
      bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), t);
      bgmGain.gain.linearRampToValueAtTime(Math.max(0.0001, to), t + secs);
    }
    function resumeBgm(fade = 0.4) {
      if (!bgmEl || muted || document.hidden || hold) return;
      const p = bgmEl.play();
      if (p && p.catch) p.catch(() => {});
      ramp(bgmVol(), fade);
    }
    // 让背景音乐暂时变小（过场、生日歌时）
    function duck(level, secs) {
      if (!bgmEl || muted || hold) return;
      ramp(bgmVol() * level, 0.3);
      clearTimeout(duck.t);
      duck.t = setTimeout(() => ramp(bgmVol(), 1.2), (secs + 0.3) * 1000);
    }
    function applyMute() {
      if (!ctx) return;
      master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
      if (bgmEl) { if (muted) bgmEl.pause(); else resumeBgm(); }
      if (muted && songEl && !songEl.paused) songEl.pause();
    }

    // ---- 我们的歌（歌单）----
    let songEnd = null;
    function songState() { if (songCb) songCb({ playing: !!songEl && !songEl.paused, t: songEl ? songEl.currentTime : 0, d: songEl ? songEl.duration || 0 : 0, src: songEl ? songEl.getAttribute('src') : '' }); }
    function songPlay(url) {
      if (!url || !ac()) return;
      if (!songEl) {
        songEl = new Audio();
        songEl.preload = 'auto';
        songEl.setAttribute('playsinline', '');
        try { ctx.createMediaElementSource(songEl).connect(master); } catch (e) { /* 直接播放 */ }
        ['play', 'pause', 'timeupdate', 'loadedmetadata'].forEach((ev) => songEl.addEventListener(ev, songState));
        songEl.addEventListener('ended', () => {
          if (songEnd && songEnd()) return;          // 自动接下一首
          hold = false; resumeBgm(1.5); songState();
        });
      }
      if (songEl.getAttribute('src') !== url) { songEl.setAttribute('src', url); songEl.load(); }
      if (muted) { muted = false; store.set('muted', false); paint(); applyMute(); }
      hold = true;
      if (bgmEl) { ramp(0, 0.4); setTimeout(() => { if (hold) bgmEl.pause(); }, 450); }
      const p = songEl.play();
      if (p && p.catch) p.catch(() => {});
    }
    function songPause() {
      if (!songEl || songEl.paused) return;
      songEl.pause();
      hold = false;
      resumeBgm(1.2);
    }

    document.addEventListener('visibilitychange', () => {
      if (!bgmEl) return;
      if (document.hidden) bgmEl.pause(); else resumeBgm(0.8);
    });

    // ---- 合成音 ----
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
        o.connect(g).connect(master);
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
      unlock() { const a = ac(); startBgm(); return a; },
      songPlay, songPause,
      songSeek(f) { if (songEl && songEl.duration) songEl.currentTime = Math.max(0, Math.min(0.999, f)) * songEl.duration; },
      songPlaying: (url) => !!songEl && !songEl.paused && (!url || songEl.getAttribute('src') === url),
      onSong(fn) { songCb = fn; },
      onSongEnd(fn) { songEnd = fn; },
      debug: () => ({ ctx: ctx && ctx.state, muted, bgm: bgmEl ? { playing: !bgmEl.paused, t: +bgmEl.currentTime.toFixed(2), gain: bgmGain ? +bgmGain.gain.value.toFixed(3) : null } : null, samples: Object.keys(bufs).map((k) => k + '@' + bufs[k].peak.toFixed(2) + 's') }),
      ctx: ac,
      duck,
      blip(n = 76, d = 0.18) { tone(midi(n), 0, d, 0.14); },
      chord(ns) { ns.forEach((n, i) => tone(midi(n), i * 0.07, 0.6, 0.12)); },
      birthday() {
        duck(0.2, 12);
        const beat = 0.48;
        let t = 0.1;
        SONG.forEach(([n, b]) => { tone(midi(n), t, b * beat * 1.6, 0.16); t += b * beat; });
      },
      // 踏切的「当当」声：有录音用录音，没有就合成
      crossing(times = 4) {
        if (bufs.crossing) { play(bufs.crossing, { dur: 3.3, vol: num(A().crossingVolume, 0.7), fadeOut: 0.7 }); return; }
        for (let i = 0; i < times; i++) tone(i % 2 ? 990 : 1050, i * 0.32, 0.3, 0.07, [[1, 1], [2.76, 0.4], [5.4, 0.15]]);
      },
      // 电车驶过：有录音就把最响的那一刻对准电车经过画面中央，没有就合成轰隆声
      rumble(dur = 1.5) {
        const b = bufs.train;
        if (b) { play(b, { offset: b.peak - 1.0, dur: 2.9, vol: num(A().trainVolume, 0.9), fadeIn: 0.25, fadeOut: 0.9 }); return; }
        const a = ac(); if (!a || muted) return;
        const t = a.currentTime;
        const src = a.createBufferSource(); src.buffer = noiseBuf(a);
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(lp).connect(g).connect(master);
        src.start(t); src.stop(t + dur + 0.05);
        for (let k = 0.15; k < dur - 0.15; k += 0.27) {
          [0, 0.07].forEach((o) => {
            const os = a.createOscillator(); const og = a.createGain();
            os.frequency.setValueAtTime(110, t + k + o); os.frequency.exponentialRampToValueAtTime(45, t + k + o + 0.08);
            og.gain.setValueAtTime(0.25, t + k + o); og.gain.exponentialRampToValueAtTime(0.0001, t + k + o + 0.1);
            os.connect(og).connect(master); os.start(t + k + o); os.stop(t + k + o + 0.12);
          });
        }
      },
    };
  })();

  // ---------- 像素彩带 ----------
  const confetti = (() => {
    const cv = $('#confetti');
    const g = cv.getContext('2d');
    const colors = ['#2F6B4F', '#4A8A69', '#EFE6C9', '#FFFBF0', '#F2C230', '#FFB21E', '#D9473F', '#6DAEE6', '#FF8FA8'];
    const HEART = ['01010', '11111', '11111', '01110', '00100'];
    let parts = [], raf = 0, S = 4, W = 0, H = 0;
    function size() {
      S = SCENE.scale || 4;
      W = Math.ceil(innerWidth / S); H = Math.ceil(innerHeight / S);
      cv.width = W; cv.height = H;
      cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
    }
    function burst(n = 120, opts = {}) {
      if (SCENE.reduce) n = Math.round(n / 4);
      size();
      const x0 = (opts.x != null ? opts.x : innerWidth / 2) / S;
      const y0 = (opts.y != null ? opts.y : innerHeight * 0.35) / S;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.8 + Math.random() * 2.2;
        parts.push({
          x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.6,
          s: Math.random() < 0.7 ? 1 : 2, c: colors[(Math.random() * colors.length) | 0],
          heart: opts.hearts && Math.random() < 0.25, life: 0, tw: Math.random() * 6,
        });
      }
      if (!raf) raf = requestAnimationFrame(step);
    }
    function step() {
      g.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.y < H + 6 && p.life < 420);
      parts.forEach((p) => {
        p.life++; p.vy += 0.045; p.vx *= 0.985; p.vy *= 0.99;
        p.x += p.vx + Math.sin(p.life / 10 + p.tw) * 0.12; p.y += p.vy;
        const x = Math.round(p.x), y = Math.round(p.y);
        if (p.heart) {
          g.fillStyle = '#D9473F';
          HEART.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '1') g.fillRect(x + i, y + j, 1, 1); });
          return;
        }
        if (Math.floor(p.life / 6 + p.tw) % 3 === 0) return; // 闪烁
        g.fillStyle = p.c; g.fillRect(x, y, p.s, p.s);
      });
      raf = parts.length ? requestAnimationFrame(step) : 0;
      if (!raf) g.clearRect(0, 0, W, H);
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
    document.body.classList.toggle('has-line', i !== 0);
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
    document.body.classList.add('is-passing');
    led(i);
    sound.crossing(9);
    sound.duck(0.3, 2.6);
    SCENE.pass(() => show(i), { onStart: () => sound.rumble(2.0) }).then(() => {
      document.body.classList.remove('is-passing');
      $('#led').hidden = true;
      busy = false;
    });
  }

  $$('.next').forEach((b) => b.addEventListener('click', () => go(current + 1)));
  document.body.classList.toggle('is-dark', SCENE.isDark());

  // 报站 LED：生日快乐号 · 開往 永遠 / 次は 江ノ島
  function led(i) {
    const st = C.stations[names[i]] || {};
    $('#ledSub').textContent = [fill(C.common.trainSign), fill(C.common.trainDest)].filter(Boolean).join(' · ');
    $('#ledNext').textContent = fill(C.common.nextIs);
    $('#ledName').textContent = fill(st.name);
    $('#ledRoman').textContent = fill(st.roman);
    $('#led').hidden = false;
  }

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
      const S = C.song || {};
      const tracks = (S.tracks || (S.title ? [{ title: S.title, artist: S.artist, file: S.file, links: S.links }] : [])).filter((t) => t.title || t.file);
      if (tracks.length) {
        let cur = 0;
        const btn = $('#songPlay'), nextBtn = $('#songNext'), list = $('#songList');
        $('#song').hidden = false;
        $('#songLabel').textContent = fill(S.label);
        $('#songTip').textContent = fill(S.tip);
        nextBtn.textContent = '⏭ ' + fill(S.next);
        nextBtn.hidden = tracks.length < 2;
        tracks.forEach((t, i) => {
          const li = document.createElement('li');
          const b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<span></span><b></b><i></i>';
          b.querySelector('span').textContent = (i + 1) + '.';
          b.querySelector('b').textContent = fill(t.title);
          b.querySelector('i').textContent = fill(t.artist);
          b.setAttribute('aria-label', (i + 1) + '. ' + fill(t.title) + ' - ' + fill(t.artist));
          b.addEventListener('click', () => { cur = i; render(); if (t.file) sound.songPlay(t.file); });
          li.appendChild(b);
          list.appendChild(li);
        });
        list.hidden = tracks.length < 2;
        const render = () => {
          const t = tracks[cur];
          $('#songTitle').textContent = fill(t.title);
          $('#songArtist').textContent = fill(t.artist);
          $$('li', list).forEach((li, i) => li.classList.toggle('is-current', i === cur));
          btn.hidden = !t.file;
          $('#songBarWrap').hidden = !t.file;
          const links = $('#songLinks');
          links.textContent = '';
          (t.links || []).forEach((l, i) => {
            if (i === 0) links.append(fill(S.elsewhere));
            const a = document.createElement('a');
            a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = fill(l.name);
            links.append(a);
          });
          paintBtn();
        };
        const paintBtn = () => {
          const on = sound.songPlaying(tracks[cur].file);
          btn.textContent = on ? '❚❚ ' + fill(S.pause) : '▶ ' + fill(S.play);
          $('#song').classList.toggle('is-playing', on);
        };
        btn.addEventListener('click', () => {
          const t = tracks[cur];
          if (sound.songPlaying(t.file)) sound.songPause(); else sound.songPlay(t.file);
        });
        nextBtn.addEventListener('click', () => {
          const was = sound.songPlaying();
          cur = (cur + 1) % tracks.length;
          render();
          if (was && tracks[cur].file) sound.songPlay(tracks[cur].file); else if (was) sound.songPause();
        });
        $('#songBarWrap').addEventListener('click', (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          sound.songSeek((e.clientX - r.left) / r.width);
        });
        sound.onSongEnd(() => {
          if (cur < tracks.length - 1 && tracks[cur + 1].file) { cur++; render(); sound.songPlay(tracks[cur].file); return true; }
          cur = 0; render(); return false;
        });
        sound.onSong(({ t, d }) => {
          paintBtn();
          $('#songBar').style.width = d ? (Math.round((t / d) * 50) * 2) + '%' : '0';
        });
        render();
      }
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
