// 1 · 许愿站：像素蛋糕 + 吹蜡烛（麦克风检测吹气；没有权限就点蜡烛）
(() => {
  const CW = 72, CH = 62;          // 画布的像素尺寸
  const FLAME = [
    ['.o.', '.y.', 'oyo', 'ywy', '.y.'],
    ['o..', '.yo', 'oyo', 'ywy', '.y.'],
  ];
  const FC = { o: '#FF8A1F', y: '#FFC93C', w: '#FFF6C2' };

  (window.HBD_MODULES = window.HBD_MODULES || {}).wish = {
    init(api) {
      this.api = api;
      const n = Math.max(1, Math.min(9, api.C.wish.candles | 0 || 5));
      this.cv = api.$('#cake');
      this.cv.width = CW; this.cv.height = CH;
      this.g = this.cv.getContext('2d');
      const x0 = 23, x1 = 48;
      this.candles = Array.from({ length: n }, (_, i) => ({ x: Math.round(n === 1 ? 35 : x0 + ((x1 - x0) * i) / (n - 1)), out: false, h: 8 + ((i * 5) % 3) }));
      this.smoke = [];
      this.cv.addEventListener('pointerdown', (e) => {
        const r = this.cv.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * CW, y = ((e.clientY - r.top) / r.height) * CH;
        let best = -1, bd = 99;
        this.candles.forEach((c, i) => { const d = Math.abs(c.x + 0.5 - x); if (!c.out && d < bd && d <= 4 && y > 1 && y < 22) { bd = d; best = i; } });
        if (best >= 0) this.blowOut(best);
      });
      api.$('#micBtn').addEventListener('click', () => this.startMic());
      this.done = false;
      this.t = 0;
      this.draw();
    },

    enter() {
      if (this.done) this.showDone(false);
      this.active = true;
      cancelAnimationFrame(this.raf);
      let last = performance.now(), acc = 0;
      const loop = (now) => {
        if (!this.active) return;
        const dt = (now - last) / 1000; last = now; this.t += dt; acc += dt;
        this.smoke.forEach((p) => { p.y -= dt * 9; p.x += Math.sin(this.t * 3 + p.p) * dt * 3; p.life -= dt; });
        this.smoke = this.smoke.filter((p) => p.life > 0);
        if (acc > 0.12 || this.smoke.length) { acc = 0; this.draw(); }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },

    leave() { this.active = false; cancelAnimationFrame(this.raf); this.stopMic(); },

    draw() {
      const g = this.g;
      const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      g.clearRect(0, 0, CW, CH);
      // 盘子
      f('rgba(14,34,44,.18)', 10, 58, 52, 2);
      f('#B9C4CC', 6, 56, 60, 1); f('#D3DBE0', 4, 55, 64, 1); f('#E9EEF1', 6, 54, 60, 1);
      // 下层
      f('#1E2A2F', 9, 33, 54, 21);
      f('#FFF8EC', 10, 34, 52, 19); f('#EADFCB', 56, 34, 6, 19);
      f('#2F6B4F', 10, 45, 52, 4); f('#22513B', 56, 45, 6, 4); f('#4A8A69', 10, 45, 52, 1);
      for (let x = 12; x < 60; x += 5) f('#EFE6C9', x, 47, 2, 1);
      for (let x = 10; x < 62; x += 4) { f('#FFFFFF', x, 51, 3, 2); f('#EADFCB', x + 2, 52, 1, 1); }
      f('#FFFFFF', 10, 34, 52, 2);
      for (let x = 12; x < 60; x += 6) f('#F2A6B4', x, 36, 2, 2 + (x % 3));
      // 上层
      f('#1E2A2F', 17, 19, 38, 15);
      f('#FFF8EC', 18, 20, 36, 13); f('#EADFCB', 49, 20, 5, 13);
      f('#FFFFFF', 18, 20, 36, 2);
      for (let x = 19; x < 53; x += 5) f('#F2A6B4', x, 22, 2, 2 + (x % 2));
      f('#E5606A', 18, 29, 36, 1);
      // 草莓
      [[19, 17], [30, 16], [43, 17], [51, 17]].forEach(([x, y]) => { f('#E0443E', x, y, 3, 3); f('#FF9C94', x, y, 1, 1); f('#3F8A55', x + 1, y - 1, 1, 1); });
      // 蜡烛
      this.candles.forEach((c, i) => {
        const top = 19 - c.h;
        for (let y = top; y < 19; y++) f(((y - top) >> 1) % 2 ? '#2F6B4F' : '#FFFFFF', c.x, y, 2, 1);
        f('#1E2A2F', c.x, top - 1, 1, 1);
        if (!c.out) {
          const fr = FLAME[(Math.floor(this.t * 8) + i) % 2];
          g.fillStyle = 'rgba(255,200,60,.22)'; g.fillRect(c.x - 3, top - 9, 8, 8);
          fr.forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] !== '.') f(FC[row[k]], c.x - 1 + k, top - 6 + j, 1, 1); });
        }
      });
      this.smoke.forEach((p) => { g.fillStyle = 'rgba(150,160,170,' + Math.max(0, p.life).toFixed(2) + ')'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); });
    },

    blowOut(i) {
      const c = this.candles[i];
      if (!c || c.out) return;
      c.out = true;
      for (let k = 0; k < 6; k++) this.smoke.push({ x: c.x + (k % 2), y: 19 - c.h - 2 - k, life: 0.6 + k * 0.12, p: k });
      this.api.sound.blip(60 + ((Math.random() * 12) | 0), 0.12);
      this.draw();
      if (this.candles.every((x) => x.out)) {
        this.done = true;
        this.stopMic();
        setTimeout(() => this.showDone(true), 500);
      }
    },

    showDone(celebrate) {
      const { $, fill, C } = this.api;
      $('#wishControls').hidden = true;
      $('#wishPrompt').textContent = fill(C.wish.afterPrompt);
      $('#wishDone').hidden = false;
      if (celebrate) {
        this.api.confetti.burst(160, { hearts: true });
        setTimeout(() => this.api.confetti.burst(100, { x: innerWidth * 0.2, y: innerHeight * 0.3 }), 600);
        setTimeout(() => this.api.confetti.burst(100, { x: innerWidth * 0.8, y: innerHeight * 0.3 }), 1100);
        this.api.sound.birthday();
      }
    },

    async startMic() {
      const { $, sound, fill, C } = this.api;
      const note = $('#micNote');
      const btn = $('#micBtn');
      if (this.stream) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        note.textContent = fill(C.wish.micUnsupported); btn.hidden = true; return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (e) {
        note.textContent = fill(C.wish.micDenied); btn.hidden = true; return;
      }
      const ctx = sound.ctx();
      if (!ctx) { stream.getTracks().forEach((t) => t.stop()); note.textContent = fill(C.wish.micUnsupported); btn.hidden = true; return; }
      this.stream = stream;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      this.src = src;
      const buf = new Float32Array(an.fftSize);
      btn.disabled = true;
      btn.textContent = fill(C.wish.micListening);
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
        bar.style.width = Math.min(100, Math.round(rms * 40) * 10) + '%';
        const dt = now - last; last = now;
        if (now - t0 < 600) { base += rms; baseN++; }
        else {
          const thr = Math.max(0.12, (base / Math.max(1, baseN)) * 3);
          if (rms > thr) {
            blowMs += dt;
            if (blowMs > 220) {
              blowMs = 0;
              const lit = this.candles.map((c, i) => (c.out ? -1 : i)).filter((i) => i >= 0);
              const k = rms > thr * 2.5 ? 2 : 1;
              for (let j = 0; j < k && lit.length; j++) this.blowOut(lit.splice((Math.random() * lit.length) | 0, 1)[0]);
            }
          } else blowMs = Math.max(0, blowMs - dt);
        }
        this.micRaf = requestAnimationFrame(loop);
      };
      this.micRaf = requestAnimationFrame(loop);
    },

    stopMic() {
      cancelAnimationFrame(this.micRaf);
      if (this.src) { try { this.src.disconnect(); } catch (e) { /* ignore */ } this.src = null; }
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    },

    reset() {
      const { $, fill, C } = this.api;
      this.stopMic();
      this.done = false;
      this.candles.forEach((c) => { c.out = false; });
      this.smoke = [];
      this.draw();
      $('#wishPrompt').textContent = fill(C.wish.prompt);
      $('#wishDone').hidden = true;
      $('#wishControls').hidden = false;
      const btn = $('#micBtn');
      btn.disabled = false;
      btn.textContent = fill(C.wish.micButton);
      $('#micNote').textContent = fill(C.wish.micTip);
    },
  };
})();
