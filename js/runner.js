// 3 · 小猫闯关：像素风横版跑酷。小猫自动往前跑，点一下跳、空中再点二段跳。
// 物理用「世界单位」计算；画面以 1 像素 = 2 单位的低分辨率画布绘制，再放大显示。
(() => {
  const VIEW_H = 300;          // 世界高度（宽度随屏幕比例变化）
  const GROUND = 248;          // 地面顶部
  const GRAV = 1500, JUMP = 560, JUMP2 = 500;
  const CW = 46, CH = 36;      // 小猫碰撞盒
  const SPEED0 = 170, SPEED1 = 235;
  const PX = 2;                // 每个像素 = 2 世界单位
  const AH = VIEW_H / PX;      // 画布高度（像素）

  const hit = (a, x, y, w, h) => a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;

  // ---------- 关卡（固定设计，保证每张回忆照片都拿得到） ----------
  function buildLevel(nPhotos) {
    const L = { gaps: [], plats: [], fish: [], photos: [], crabs: [], gulls: [], end: 0 };
    let x = 520, pi = 0;
    const fish = (fx, fy) => L.fish.push({ x: fx, y: fy, got: false });
    const photo = (px, py) => { if (pi < nPhotos) L.photos.push({ x: px, y: py, i: pi++, got: false }); else fish(px, py); };
    const row = (n = 5) => { for (let i = 0; i < n; i++) fish(x + i * 34, GROUND - 22); x += n * 34 + 120; };
    const arc = (w = 220, peak = 90, n = 7) => {
      for (let i = 0; i < n; i++) { const t = i / (n - 1); fish(x + t * w, GROUND - 26 - Math.sin(t * Math.PI) * peak); }
      x += w + 140;
    };
    const crab = (range = 30, sp = 2.2) => { L.crabs.push({ x0: x + 90, x: x + 90, y: GROUND, range, sp, dead: false, vy: 0 }); x += 280; };
    const gap = (w = 100, withPhoto = false) => {
      const gx = x + 40;
      L.gaps.push({ x: gx, w });
      if (withPhoto) photo(gx + w / 2, GROUND - 118);
      else for (let i = 0; i < 3; i++) fish(gx + (w * (i + 1)) / 4, GROUND - 74 - (i === 1 ? 18 : 0));
      x = gx + w + 160;
    };
    const plat = (h = 64, w = 150, withPhoto = true) => {
      L.plats.push({ x: x + 40, y: GROUND - h, w });
      if (withPhoto) photo(x + 40 + w / 2, GROUND - h - 46);
      else for (let i = 0; i < 3; i++) fish(x + 40 + (w * (i + 1)) / 4, GROUND - h - 22);
      x += w + 180;
    };
    const stairs = () => {
      L.plats.push({ x: x + 40, y: GROUND - 60, w: 120 });
      L.plats.push({ x: x + 230, y: GROUND - 125, w: 130 });
      fish(x + 100, GROUND - 82);
      photo(x + 295, GROUND - 125 - 42);
      x += 560;
    };
    const high = () => { // 要二段跳才够得着
      for (let i = 0; i < 3; i++) fish(x + 40 + i * 30, GROUND - 40 - i * 30);
      photo(x + 170, GROUND - 165);
      x += 360;
    };
    const gull = (h = 88) => { L.gulls.push({ x: x + 560, y: GROUND - h, vx: 120, go: false }); row(4); };

    row(5); plat(64); crab(); gap(90); high(); arc(); crab(40, 2.6); stairs(); gull();
    gap(110); plat(80); crab(); arc(); gap(100, true); row(6); gull(92); high();
    crab(30, 2.4); crab(40, 3); stairs(); arc(); gap(120); gull(); plat(70); row(6);
    L.end = x + 200;
    return L;
  }

  // ---------- 调色板（与背景场景一致） ----------
  const PAL = {
    day: {
      sky: ['#3E8FDA', '#559EE0', '#6DAEE6', '#89BFEC', '#A7D0F1'], cloud: '#FFFFFF', cloudS: '#DCEAF5',
      island: '#86B3DA', sea: ['#4C9FDD', '#3A90D4', '#2C82C9'], glint: '#FFFFFF',
      fencePost: '#A9553A', fenceRail: '#D8D0C2', wall: '#D9D3C4', wallHi: '#F0EBDF',
      walk: '#E3D8BC', walkS: '#D3C6A5', curb: '#B9AC8B', water: '#2477BF', waterHi: '#62AEE4',
      rail: '#6C7177', ballast: '#8E857A',
    },
    night: {
      sky: ['#070D22', '#0A1430', '#0F1C3E', '#14264D', '#1B315C'], cloud: '#2A3B60', cloudS: '#22314F',
      island: '#0F1E3D', sea: ['#152D55', '#11264A', '#0E2040'], glint: '#FFE9A8',
      fencePost: '#5A3530', fenceRail: '#5E6375', wall: '#4A5064', wallHi: '#5E6579',
      walk: '#454B5C', walkS: '#3B4050', curb: '#2E3242', water: '#0B1A36', waterHi: '#1A3561',
      rail: '#4B5058', ballast: '#3D3A40',
    },
  };
  const isDark = () => (window.HBD_SCENE ? window.HBD_SCENE.isDark() : false);

  (window.HBD_MODULES = window.HBD_MODULES || {}).runner = {
    init(api) {
      this.api = api;
      const { $, C } = api;
      this.T = C.runner;
      this.items = C.timeline.items;
      this.nPhotos = Math.min(8, this.items.length);
      this.goalName = api.fill((C.stations.runner || {}).name || '') || api.fill(this.T.goalSign);
      $('#rnTotal').textContent = this.nPhotos;
      this.imgs = this.items.slice(0, this.nPhotos).map((it) => { const im = new Image(); im.src = it.img; return im; });
      this.cv = $('#rnCanvas');
      this.g = this.cv.getContext('2d');
      this.fx = $('#rnFx');
      this.cv.addEventListener('pointerdown', (e) => { e.preventDefault(); this.press(); });
      document.addEventListener('keydown', (e) => {
        if (!this.active || this.state !== 'play') return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); this.press(); }
      });
      $('#rnStart').addEventListener('click', () => this.start());
      $('#rnAgain').addEventListener('click', () => this.start());
      window.addEventListener('resize', () => { if (this.active) this.resize(); });
      this.goalEl = document.createElement('div');
      this.goalEl.className = 'rn__goal';
      this.goalEl.textContent = this.goalName;
      this.fx.appendChild(this.goalEl);
      this.state = 'ready';
      this.resetGame();
    },

    enter() {
      this.active = true;
      this.pal = isDark() ? PAL.night : PAL.day;
      this.night = isDark();
      this.resize();
      this.last = performance.now();
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame((n) => this.frame(n));
    },

    leave() {
      this.active = false;
      cancelAnimationFrame(this.raf);
      if (this.state === 'play') { this.state = 'ready'; this.resetGame(); }
    },

    reset() { if (this.state !== 'play') { this.state = 'ready'; this.resetGame(); } },

    resize() {
      const cssW = this.cv.clientWidth || 340;
      const cssH = Math.round(Math.max(260, Math.min(420, cssW * 0.8)));
      this.cv.style.height = cssH + 'px';
      this.viewW = (cssW / cssH) * VIEW_H;
      this.aw = Math.round(this.viewW / PX);
      this.cv.width = this.aw;
      this.cv.height = AH;
      this.cssK = cssW / this.aw;                  // 一个像素在屏幕上多少 CSS px
      this.catSX = Math.max(56, this.viewW * 0.2);
      seed = 11;
      this.stars = Array.from({ length: 40 }, () => ({ x: rnd(), y: rnd() * 0.5 }));
    },

    resetGame() {
      const { $ } = this.api;
      this.L = buildLevel(this.nPhotos);
      this.cam = 0;
      this.t = 0;
      this.cat = { y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, slow: 0, run: 0 };
      this.fish = 0; this.photos = 0; this.hits = 0;
      this.parts = [];
      this.jumpBuf = 0; this.shake = 0; this.fallGap = null;
      this.hud = '';
      this.fx.querySelectorAll('.rn__float').forEach((n) => n.remove());
      $('#rnWarn').hidden = true;
      $('#rnReady').hidden = this.state !== 'ready';
      $('#rnDone').hidden = true;
      this.paintHud();
    },

    start() {
      this.api.sound.unlock();
      this.state = 'play';
      this.resetGame();
      this.api.$('#rnReady').hidden = true;
      this.api.$('.rn').scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.last = performance.now();
    },

    press() { if (this.state === 'play') this.jumpBuf = 0.13; },

    frame(now) {
      if (!this.active) return;
      const dt = Math.min(0.033, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.t += dt;
      if (this.state === 'play') {
        let acc = dt;
        while (acc > 1e-6) { const s = Math.min(acc, 1 / 120); this.update(s); acc -= s; if (this.state !== 'play') break; }
      }
      this.tickFx(dt);
      this.draw();
      this.raf = requestAnimationFrame((n) => this.frame(n));
    },

    overGap(l, r) { return this.L.gaps.find((g) => l >= g.x && r <= g.x + g.w); },

    update(dt) {
      const L = this.L, c = this.cat, T = this.T;
      const prog = Math.min(1, this.cam / L.end);
      if (c.slow > 0) c.slow -= dt;
      const sp = (SPEED0 + (SPEED1 - SPEED0) * prog) * (c.slow > 0 ? 0.6 : 1);
      this.cam += sp * dt;
      if (this.fallGap) this.cam = Math.min(this.cam, this.fallGap.x + this.fallGap.w - CW + 8 - this.catSX);
      const cx = this.cam + this.catSX;
      c.run += (dt * sp) / 26;
      this.jumpBuf -= dt; c.coyote -= dt; c.inv -= dt;

      if (this.jumpBuf > 0 && !this.fallGap) {
        if (c.onGround || c.coyote > 0) { c.vy = -JUMP; c.onGround = false; c.coyote = 0; c.jumps = 1; this.jumpBuf = 0; this.sfx(72); }
        else if (c.jumps < 2) { c.vy = -JUMP2; c.jumps = 2; this.jumpBuf = 0; this.sfx(79); this.puff(cx + CW / 2, c.y, 6, '#FFFFFF'); }
      }
      const prevY = c.y;
      c.vy = Math.min(c.vy + GRAV * dt, 900);
      c.y += c.vy * dt;

      const feetL = cx + 10, feetR = cx + CW - 10;
      let landed = false;
      if (c.vy >= 0 && !this.fallGap) {
        for (const p of L.plats) {
          if (feetR > p.x && feetL < p.x + p.w && prevY <= p.y + 0.5 && c.y >= p.y) { c.y = p.y; landed = true; break; }
        }
        if (!landed && prevY <= GROUND + 0.5 && c.y >= GROUND && !this.overGap(feetL, feetR)) { c.y = GROUND; landed = true; }
      }
      if (landed) {
        if (!c.onGround && c.vy > 320) this.puff(cx + CW / 2, c.y, 5, this.pal.curb);
        c.vy = 0; c.jumps = 0;
      } else if (c.onGround) c.coyote = 0.09;
      c.onGround = landed;
      if (!landed && c.y > GROUND + 2 && !this.fallGap) {
        this.fallGap = this.overGap(feetL, feetR) || L.gaps.find((g) => cx + CW / 2 > g.x && cx < g.x + g.w) || null;
      }
      if (c.y > VIEW_H + 70) this.respawn();

      const box = { x: cx + 6, y: c.y - CH + 4, w: CW - 12, h: CH - 6 };
      for (const f of L.fish) {
        if (!f.got && f.x > cx - 30 && f.x < cx + 80 && hit(box, f.x - 10, f.y - 8, 20, 16)) {
          f.got = true; this.fish++; this.sparkle(f.x, f.y, '#FFB347', 5); this.sfx(84, 0.08);
        }
      }
      for (const p of L.photos) {
        if (!p.got && hit(box, p.x - 18, p.y - 22, 36, 44)) {
          p.got = true; this.photos++; this.sparkle(p.x, p.y, '#FFE680', 14); this.toast(p.i);
          this.api.sound.chord([79, 84, 88]);
        }
      }
      for (const k of L.crabs) {
        if (k.dead) { k.vy += GRAV * dt; k.y += k.vy * dt; k.x += 80 * dt; continue; }
        k.x = k.x0 + Math.sin(this.t * k.sp) * k.range;
        if (hit(box, k.x - 16, GROUND - 20, 32, 20)) {
          if (c.vy > 0 && prevY <= GROUND - 12) {
            k.dead = true; k.vy = -320; c.vy = -430; c.jumps = 1; this.fish += 2;
            this.floatText(k.x, GROUND - 40, this.api.fill(T.stomp)); this.sfx(67, 0.15);
          } else if (c.inv <= 0) this.hurt();
        }
      }
      let warn = null;
      for (const s of L.gulls) {
        if (!s.go && s.x - this.cam < this.viewW + 300) s.go = true;
        if (s.go) s.x -= s.vx * dt;
        const sx = s.x - this.cam;
        if (s.go && sx > this.viewW + 8 && sx < this.viewW + 300) warn = s;
        if (c.inv <= 0 && hit(box, s.x - 18, s.y - 7, 36, 14)) this.hurt();
      }
      this.setWarn(warn);
      if (cx >= L.end) this.finish();
      this.paintHud();
    },

    respawn() {
      const g = this.fallGap || { x: this.cam + this.catSX, w: 0 };
      this.fallGap = null;
      this.cam = g.x + g.w + 24 - this.catSX;
      const c = this.cat;
      c.y = GROUND - 150; c.vy = 0; c.jumps = 1; c.onGround = false;
      this.hurt(true);
    },

    hurt(fromFall) {
      const c = this.cat;
      c.inv = 1.4; c.slow = 0.5; this.hits++;
      this.fish = Math.max(0, this.fish - 2);
      if (!fromFall) c.vy = Math.min(c.vy, -280);
      this.shake = 0.25;
      this.floatText(this.cam + this.catSX + CW / 2, c.y - CH - 8, this.api.fill(this.T.ouch), true);
      this.sfx(52, 0.25);
    },

    finish() {
      const { $, fill } = this.api;
      const T = this.T;
      this.state = 'done';
      this.setWarn(null);
      const score = this.fish + this.photos * 5;
      const r = T.results.slice().sort((a, b) => b.min - a.min).find((x) => score >= x.min);
      $('#rnStats').textContent = fill(T.doneStats, { photos: this.photos, total: this.nPhotos, fish: this.fish });
      $('#rnResult').textContent = fill(r ? r.text : '');
      setTimeout(() => {
        $('#rnDone').hidden = false;
        this.api.confetti.burst(140, { hearts: true });
        this.api.sound.chord([72, 76, 79, 84]);
      }, 600);
    },

    paintHud() {
      const prog = Math.min(1, (this.cam + this.catSX) / this.L.end);
      const key = this.fish + '|' + this.photos + '|' + Math.round(prog * 60);
      if (key === this.hud) return;
      this.hud = key;
      const { $ } = this.api;
      $('#rnFish').textContent = this.fish;
      $('#rnPhotos').textContent = this.photos;
      $('#rnBar').style.width = (Math.round(prog * 60) / 60 * 100).toFixed(1) + '%';
    },

    setWarn(s) {
      const el = this.api.$('#rnWarn');
      if (!s) { if (!el.hidden) el.hidden = true; return; }
      if (el.hidden) { el.textContent = '! ' + this.api.fill(this.T.gullWarn); el.hidden = false; }
      el.style.top = Math.round((s.y / PX) * this.cssK) - 12 + 'px';
    },

    toast(i) {
      const { $, fill } = this.api;
      const it = this.items[i];
      const el = $('#rnToast');
      el.querySelector('img').src = it.img;
      el.querySelector('span').textContent = fill(this.T.photoFound, { place: fill(it.place) || '♥' });
      el.classList.add('is-on');
      clearTimeout(this.toastT);
      this.toastT = setTimeout(() => el.classList.remove('is-on'), 1800);
    },

    sfx(n, d = 0.12) { this.api.sound.blip(n, d); },

    // ---------- 特效 ----------
    puff(x, y, n, color) {
      for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: 0.4, c: color, g: 0 });
    },
    sparkle(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.55, c: color, g: 300 });
      }
    },
    floatText(x, y, text, bad) {
      const el = document.createElement('span');
      el.className = 'rn__float' + (bad ? ' is-bad' : '');
      el.textContent = text;
      el.style.left = Math.round(((x - this.cam) / PX) * this.cssK) + 'px';
      el.style.top = Math.round((y / PX) * this.cssK) + 'px';
      this.fx.appendChild(el);
      setTimeout(() => el.remove(), 900);
    },
    tickFx(dt) {
      this.parts = this.parts.filter((p) => (p.life -= dt) > 0);
      this.parts.forEach((p) => { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
      if (this.shake > 0) this.shake -= dt;
    },

    // ---------- 绘制（全部是整数像素） ----------
    draw() {
      const g = this.g, P = this.pal, W = this.aw, t = this.t, L = this.L;
      const cam = Math.round(this.cam / PX);               // 镜头（像素）
      const ox = this.shake > 0 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
      const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x) + ox, Math.round(y), w, h); };
      const wx = (v) => Math.round(v / PX) - cam;         // 世界 x → 画面 x
      const wy = (v) => Math.round(v / PX);
      const GY = GROUND / PX;                              // 地面（124）
      g.clearRect(0, 0, W, AH);

      // 天空（色带 + 抖动过渡）
      const skyB = 78;
      P.sky.forEach((c, i) => {
        const y0 = Math.round((skyB * i) / P.sky.length), y1 = Math.round((skyB * (i + 1)) / P.sky.length);
        f(c, 0, y0, W, y1 - y0);
        if (i) { g.fillStyle = P.sky[i - 1]; for (let x = y0 & 1; x < W; x += 2) g.fillRect(x, y0, 1, 1); }
      });
      if (this.night) this.stars.forEach((s, i) => { if (Math.sin(t * 2 + i) > -0.2) f('#FFFFFF', Math.round(s.x * W), Math.round(s.y * skyB), 1, 1); });
      // 云（视差 0.1）
      for (let i = 0; i < 4; i++) {
        const span = W + 60, x = ((i * 70 - cam * 0.1 - t * 2) % span + span) % span - 30, y = 14 + (i % 3) * 12, w = 18 + (i % 2) * 10;
        f(P.cloudS, x, y, w, 2); f(P.cloud, x + 1, y - 3, w - 2, 3); f(P.cloud, x + Math.round(w * 0.4), y - 6, Math.round(w * 0.35), 3);
      }
      // 江之岛（视差 0.04）
      const span = W + 140, ix = ((Math.round(W * 0.6) - Math.round(cam * 0.04)) % span + span) % span - 70;
      for (let i = 0; i < 44; i++) { const h = Math.round(7 * Math.pow(Math.sin(Math.PI * Math.min(1, (i / 44) * 1.15)), 0.7)); f(P.island, ix + i, skyB - h, 1, h); }
      f(P.island, ix + 20, skyB - 14, 1, 8); f(P.island, ix + 19, skyB - 14, 3, 1);
      // 海
      P.sea.forEach((c, i) => f(c, 0, skyB + i * 6, W, 6));
      for (let i = 0; i < 18; i++) {
        const x = ((i * 37 - Math.round(cam * 0.25)) % (W + 10) + W + 10) % (W + 10) - 5, y = skyB + 2 + (i * 7) % 15;
        if (Math.sin(t * 3 + i) > 0.3) f(P.glint, x, y, 2 + (i % 2), 1);
      }
      // 轨道 + 江之电（视差 0.5，自己也在走）
      const railY = 100;
      f(P.ballast, 0, railY, W, 3); f(P.rail, 0, railY - 1, W, 1);
      const loop = W + 160, tx = W + 40 - ((t * 32 + cam * 0.5) % loop);
      if (window.HBD_SCENE) window.HBD_SCENE.drawTrain(g, tx, railY - 1, 64, this.night, 2);
      // 护栏 + 海堤
      f(P.wall, 0, 103, W, GY - 103); f(P.wallHi, 0, 103, W, 1);
      f(P.fenceRail, 0, 108, W, 1);
      for (let x = -(Math.round(cam * 0.9) % 6); x < W; x += 6) f(P.fencePost, x, 108, 1, GY - 108);
      // 人行道 + 海沟
      f(P.walk, 0, GY, W, AH - GY);
      f(P.curb, 0, GY, W, 2);
      for (let x = -(cam % 16); x < W; x += 16) f(P.walkS, x, GY + 2, 1, AH - GY);
      for (let y = GY + 9; y < AH; y += 9) f(P.walkS, 0, y, W, 1);
      L.gaps.forEach((gp) => {
        const x = wx(gp.x), w = Math.round(gp.w / PX);
        if (x > W || x + w < 0) return;
        f(P.water, x, GY, w, AH - GY);
        for (let k = 2; k < w - 2; k += 5) f(P.waterHi, x + k, GY + 6 + (Math.floor(t * 4 + k) % 2), 3, 1);
        f('rgba(0,0,0,.25)', x, GY, 1, AH - GY); f('rgba(0,0,0,.25)', x + w - 1, GY, 1, AH - GY);
      });
      // 终点站台 + 站名牌
      const ex = wx(L.end);
      if (ex < W + 120) {
        f('#9AA3AD', ex - 20, GY - 3, 300, 3);
        f('#5A6470', ex + 4, GY - 46, 2, 43); f('#5A6470', ex + 54, GY - 46, 2, 43);
        f('#1E2A2F', ex - 4, GY - 62, 68, 22); f('#FFFFFF', ex - 3, GY - 61, 66, 14); f('#2F6B4F', ex - 3, GY - 47, 66, 6);
        this.goalEl.style.display = 'block';
        this.goalEl.style.left = Math.round((ex + 30 + ox) * this.cssK) + 'px';
        this.goalEl.style.top = Math.round((GY - 54) * this.cssK) + 'px';
      } else this.goalEl.style.display = 'none';

      // 冲浪板平台
      const boards = [['#FF7A8A', '#D9535F'], ['#FFC94D', '#D9A12E'], ['#36C2C9', '#2297A0'], ['#7FA6FF', '#5A7FD8']];
      L.plats.forEach((p, i) => {
        const x = wx(p.x), y = wy(p.y), w = Math.round(p.w / PX); if (x > W || x + w < 0) return;
        const [c1, c2] = boards[i % boards.length];
        f('rgba(14,34,44,.18)', x + 3, y + 7, w, 2);
        f('#1E2A2F', x + 1, y - 1, w - 2, 1); f('#1E2A2F', x, y, w, 5); f('#1E2A2F', x + 1, y + 5, w - 2, 1);
        f(c1, x + 1, y, w - 2, 4); f(c2, x + 1, y + 3, w - 2, 1); f('#FFFFFF', x + 3, y + 1, w - 6, 1);
      });
      // 小鱼干
      L.fish.forEach((fi, i) => {
        if (fi.got) return;
        const x = wx(fi.x), y = wy(fi.y) + (Math.floor(t * 4 + i) % 2); if (x < -8 || x > W + 8) return;
        f('#1E2A2F', x - 4, y - 2, 8, 5); f('#1E2A2F', x - 7, y - 3, 3, 7);
        f('#FF9F43', x - 3, y - 1, 6, 3); f('#E07B22', x - 6, y - 2, 2, 5); f('#FFC98A', x - 2, y - 1, 3, 1);
        f('#1E2A2F', x + 1, y - 1, 1, 1);
      });
      // 回忆照片：像素化的小相片 + 闪光
      L.photos.forEach((p) => {
        if (p.got) return;
        const x = wx(p.x), y = wy(p.y) + (Math.floor(t * 3 + p.i) % 2); if (x < -20 || x > W + 20) return;
        const sp = Math.floor(t * 6) % 4;
        [[-12, -12], [12, -12], [12, 12], [-12, 12]].forEach(([dx, dy], k) => { if (k === sp) f('#FFE680', x + dx, y + dy, 1, 1); });
        f('#1E2A2F', x - 8, y - 10, 16, 20); f('#FFFFFF', x - 7, y - 9, 14, 18);
        const im = this.imgs[p.i];
        if (im && im.complete && im.naturalWidth) {
          const s = Math.min(im.naturalWidth, im.naturalHeight);
          g.imageSmoothingEnabled = true;
          g.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) * 0.3, s, s, x - 6 + ox, y - 8, 12, 12);
        } else f('#9CC9F0', x - 6, y - 8, 12, 12);
      });
      // 螃蟹
      L.crabs.forEach((k) => {
        const x = wx(k.x), y = wy(k.y); if (x < -12 || x > W + 12 || y > AH + 10) return;
        const leg = Math.floor(t * 10) % 2;
        if (k.dead) { f('#C83A44', x - 5, y - 6, 10, 4); f('#1E2A2F', x - 3, y - 2, 1, 1); f('#1E2A2F', x + 2, y - 2, 1, 1); return; }
        f('#1E2A2F', x - 6, y - 7, 12, 6);
        f('#F2545B', x - 5, y - 6, 10, 4); f('#FF8A8F', x - 4, y - 6, 4, 1);
        f('#F2545B', x - 9, y - 9 + leg, 3, 3); f('#F2545B', x + 6, y - 9 + (1 - leg), 3, 3);
        f('#1E2A2F', x - 2, y - 9, 1, 3); f('#1E2A2F', x + 2, y - 9, 1, 3);
        f('#FFFFFF', x - 3, y - 10, 2, 2); f('#FFFFFF', x + 2, y - 10, 2, 2);
        f('#1E2A2F', x - 2, y - 10, 1, 1); f('#1E2A2F', x + 3, y - 10, 1, 1);
        for (let i = 0; i < 3; i++) { f('#C83A44', x - 6 - (i === 1 ? leg : 0), y - 2 + i, 2, 1); f('#C83A44', x + 4 + (i === 1 ? leg : 0), y - 2 + i, 2, 1); }
      });
      // 海鸥
      L.gulls.forEach((s) => {
        if (!s.go) return;
        const x = wx(s.x), y = wy(s.y); if (x < -12 || x > W + 12) return;
        const up = Math.floor(t * 8) % 2;
        f('#1E2A2F', x - 4, y - 2, 9, 4); f('#FFFFFF', x - 3, y - 1, 7, 2);
        f('#FFB020', x - 6, y, 2, 1); f('#1E2A2F', x - 2, y - 1, 1, 1);
        if (up) { f('#FFFFFF', x - 1, y - 6, 2, 5); f('#C9D4DE', x - 1, y - 6, 2, 1); }
        else { f('#FFFFFF', x - 1, y + 1, 2, 4); f('#C9D4DE', x - 1, y + 4, 2, 1); }
        f('#C9D4DE', x + 4, y - 1, 2, 2);
      });

      // 小猫
      const c = this.cat;
      if (!(c.inv > 0 && this.state === 'play' && Math.floor(c.inv * 10) % 2 === 0)) this.drawCat(Math.round(this.catSX / PX) + ox, wy(c.y));

      // 粒子
      this.parts.forEach((p) => f(p.c, wx(p.x), wy(p.y), 1, 1));
    },

    // 像素小猫（橘猫，朝右）。x = 左边，yb = 脚底
    drawCat(x, yb) {
      const g = this.g, c = this.cat, t = this.t;
      const air = !c.onGround && this.state === 'play';
      const done = this.state === 'done';
      const run = this.state === 'play' && c.onGround;
      const fr = run ? Math.floor(c.run * 1.5) % 4 : 0;
      const bob = run && (fr % 2) ? -1 : 0;
      const K = '#5A3A26', O = '#F5A04A', D = '#D9792A', CR = '#FFE7C4', PK = '#FF9FB2', E = '#2A1A12';
      const R = (col, x0, y0, w, h) => { g.fillStyle = col; g.fillRect(x0, y0, w, h); };
      const y = yb + bob;
      // 腿（先画描边再画填充）
      const legs = [3, 7, 13, 17].map((lx, i) => {
        let lift = 0, dx = 0;
        if (air) { lift = 2; dx = i < 2 ? -1 : 1; }
        else if (run) { const ph = (fr + (i % 2) * 2) % 4; lift = ph === 1 ? 2 : ph === 2 ? 1 : 0; dx = ph === 1 ? 1 : ph === 3 ? -1 : 0; }
        return [x + lx + dx, y - 4 - lift];
      });
      legs.forEach(([lx, ly]) => R(K, lx - 1, ly, 4, 5));
      // 尾巴
      const wag = Math.floor(t * 6) % 2;
      const tail = [[2, -9], [1, -10], [0, -11], [0, -12], [wag, -13], [wag + 1, -14]];
      tail.forEach(([tx, ty]) => R(K, x + tx - 1, y + ty - 1, 4, 4));
      // 身体 + 头 描边
      R(K, x + 1, y - 12, 18, 9);
      R(K, x + 13, y - 18, 11, 11);
      R(K, x + 14, y - 20, 3, 3); R(K, x + 20, y - 20, 3, 3);
      // 填充
      tail.forEach(([tx, ty], i) => R(i > 3 ? D : O, x + tx, y + ty, 2, 2));
      legs.forEach(([lx, ly]) => R(O, lx, ly + 1, 2, 3));
      legs.forEach(([lx, ly]) => R(CR, lx, ly + 3, 2, 1));
      R(O, x + 2, y - 11, 16, 7);
      R(CR, x + 5, y - 7, 10, 3);
      [6, 9, 12].forEach((sx) => R(D, x + sx, y - 11, 1, 3));
      R(O, x + 14, y - 17, 9, 9);
      R(O, x + 15, y - 19, 1, 2); R(O, x + 21, y - 19, 1, 2);
      R(PK, x + 15, y - 18, 1, 1); R(PK, x + 21, y - 18, 1, 1);
      R(D, x + 17, y - 17, 1, 2); R(D, x + 19, y - 17, 1, 2);
      R(CR, x + 17, y - 12, 6, 4);
      // 表情
      if (c.inv > 0 && this.state === 'play') { R(E, x + 16, y - 14, 1, 1); R(E, x + 17, y - 13, 1, 1); R(E, x + 16, y - 12, 1, 1); R(E, x + 21, y - 14, 1, 1); R(E, x + 20, y - 13, 1, 1); R(E, x + 21, y - 12, 1, 1); }
      else if (done) { R(E, x + 16, y - 13, 2, 1); R(E, x + 20, y - 13, 2, 1); }
      else { R(E, x + 16, y - 14, 2, 2); R(E, x + 20, y - 14, 2, 2); R('#FFFFFF', x + 16, y - 14, 1, 1); R('#FFFFFF', x + 20, y - 14, 1, 1); }
      R(PK, x + 19, y - 11, 1, 1);
      R(K, x + 18, y - 10, 1, 1); R(K, x + 20, y - 10, 1, 1);
      R(PK, x + 15, y - 11, 1, 1); R(PK, x + 22, y - 11, 1, 1);
      if (done) { // 到站后冒爱心
        const hy = y - 26 - (Math.floor(t * 6) % 4);
        const H = ['01010', '11111', '01110', '00100'];
        H.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '1') R('#D9473F', x + 16 + i, hy + j, 1, 1); });
      }
    },
  };

  let seed = 1;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
})();
