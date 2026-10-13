// 1 · 许愿站：吹蜡烛（麦克风检测吹气；没有权限就点蜡烛）
(window.HBD_MODULES = window.HBD_MODULES || {}).wish = {
  init(api) {
    this.api = api;
    const { $, C } = api;
    const n = Math.max(1, Math.min(12, C.wish.candles | 0 || 5));
    const box = $('#candles');
    this.candles = [];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'candle';
      b.setAttribute('aria-label', '吹灭第 ' + (i + 1) + ' 根蜡烛');
      b.innerHTML = '<span class="flame"></span>';
      b.style.height = (40 + ((i * 7) % 3) * 6) + 'px';
      b.addEventListener('click', () => this.blowOut(i));
      box.appendChild(b);
      this.candles.push(b);
    }
    $('#micBtn').addEventListener('click', () => this.startMic());
    this.done = false;
  },

  enter() {
    if (this.done) this.showDone(false);
  },

  leave() { this.stopMic(); },

  blowOut(i) {
    const c = this.candles[i];
    if (!c || c.classList.contains('is-out')) return;
    c.classList.add('is-out');
    c.setAttribute('aria-disabled', 'true');
    const s = document.createElement('span');
    s.className = 'smoke';
    c.appendChild(s);
    setTimeout(() => s.remove(), 1300);
    this.api.sound.blip(60 + ((Math.random() * 12) | 0), 0.12);
    if (this.candles.every((x) => x.classList.contains('is-out'))) {
      this.done = true;
      this.stopMic();
      setTimeout(() => this.showDone(true), 500);
    }
  },

  showDone(celebrate) {
    const { $ } = this.api;
    $('#wishControls').hidden = true;
    $('#wishPrompt').textContent = '愿望一定会实现的！';
    $('#wishDone').hidden = false;
    if (celebrate) {
      this.api.confetti.burst(180, { hearts: true });
      setTimeout(() => this.api.confetti.burst(120, { x: innerWidth * 0.2, y: innerHeight * 0.3 }), 600);
      setTimeout(() => this.api.confetti.burst(120, { x: innerWidth * 0.8, y: innerHeight * 0.3 }), 1100);
      this.api.sound.birthday();
    }
  },

  async startMic() {
    const { $, sound } = this.api;
    const note = $('#micNote');
    const btn = $('#micBtn');
    if (this.stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      note.textContent = '这个浏览器用不了麦克风，直接点蜡烛就好～';
      btn.hidden = true;
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      note.textContent = '没拿到麦克风权限，直接点蜡烛把它吹灭吧～';
      btn.hidden = true;
      return;
    }
    const ctx = sound.ctx();
    if (!ctx) { stream.getTracks().forEach((t) => t.stop()); note.textContent = '直接点蜡烛就好～'; btn.hidden = true; return; }
    this.stream = stream;
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    this.src = src;
    const buf = new Float32Array(an.fftSize);

    btn.disabled = true;
    btn.textContent = '正在听…用力吹！';
    note.innerHTML = '<span class="mic-meter"><i></i></span>';
    const bar = note.querySelector('i');

    // 前 0.6 秒测环境噪音，阈值取其 3 倍（至少 0.12）
    const t0 = performance.now();
    let base = 0, baseN = 0, blowMs = 0, last = t0;
    const loop = (now) => {
      if (!this.stream) return;
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      bar.style.width = Math.min(100, rms * 400) + '%';
      const dt = now - last; last = now;
      if (now - t0 < 600) { base += rms; baseN++; }
      else {
        const thr = Math.max(0.12, (base / Math.max(1, baseN)) * 3);
        if (rms > thr) {
          blowMs += dt;
          if (blowMs > 220) {
            blowMs = 0;
            const lit = this.candles.map((c, i) => (c.classList.contains('is-out') ? -1 : i)).filter((i) => i >= 0);
            const k = rms > thr * 2.5 ? 2 : 1;
            for (let j = 0; j < k && lit.length; j++) this.blowOut(lit.splice((Math.random() * lit.length) | 0, 1)[0]);
          }
        } else blowMs = Math.max(0, blowMs - dt);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  stopMic() {
    cancelAnimationFrame(this.raf);
    if (this.src) { try { this.src.disconnect(); } catch (e) { /* ignore */ } this.src = null; }
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
  },

  reset() {
    const { $ } = this.api;
    this.stopMic();
    this.done = false;
    this.candles.forEach((c) => { c.classList.remove('is-out'); c.removeAttribute('aria-disabled'); });
    $('#wishPrompt').textContent = this.api.fill(this.api.C.wish.prompt);
    $('#wishDone').hidden = true;
    $('#wishControls').hidden = false;
    const btn = $('#micBtn');
    btn.disabled = false;
    btn.textContent = '🎤 对着麦克风吹';
    $('#micNote').textContent = '也可以直接点蜡烛把它吹灭';
  },
};
