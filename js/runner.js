// 3 · 小猫闯关：横版跑酷。小猫自动往前跑，点一下跳、空中再点二段跳。
// 全部用 canvas 画，回忆照片直接用 timeline 里的图片。
(() => {
  const VIEW_H = 300;          // 逻辑高度（宽度随屏幕比例变化）
  const GROUND = 248;          // 地面顶部
  const GRAV = 1500, JUMP = 560, JUMP2 = 500;
  const CW = 46, CH = 36;      // 小猫碰撞盒
  const SPEED0 = 170, SPEED1 = 235;

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

  const PAL = {
    day: { skyA: '#3FA9F5', skyB: '#CDEEFF', sun: '#FFF6D2', cloud: 'rgba(255,255,255,.9)', island: 'rgba(40,96,150,.45)',
      seaA: '#4AA3E3', seaB: '#1B6FBD', glint: 'rgba(255,255,255,.8)', wall: '#E8E1CF', wallLine: '#CFC6AE', rail: '#8C98A6',
      road: '#EDE3C8', roadEdge: '#C8B98F', tile: 'rgba(160,140,100,.25)', water: '#1C6CB8', waterTop: '#4AA3E3' },
    night: { skyA: '#050F25', skyB: '#1C3F70', sun: '#FFF4D0', cloud: 'rgba(150,180,220,.12)', island: '#081733',
      seaA: '#143A6A', seaB: '#071C3A', glint: 'rgba(255,240,200,.75)', wall: '#3B4560', wallLine: '#2C3550', rail: '#56637A',
      road: '#454D66', roadEdge: '#2E3550', tile: 'rgba(0,0,0,.25)', water: '#0A2347', waterTop: '#163F73' },
  };
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  };

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  (window.HBD_MODULES = window.HBD_MODULES || {}).runner = {
    init(api) {
      this.api = api;
      const { $, C } = api;
      this.T = C.runner;
      this.items = C.timeline.items;
      this.nPhotos = Math.min(8, this.items.length);
      this.goalName = api.fill((C.stations.runner || {}).name || '');
      $('#rnTotal').textContent = this.nPhotos;
      this.imgs = this.items.slice(0, this.nPhotos).map((it) => { const im = new Image(); im.src = it.img; return im; });
      this.cv = $('#rnCanvas');
      this.g = this.cv.getContext('2d');
      this.cv.addEventListener('pointerdown', (e) => { e.preventDefault(); this.press(); });
      document.addEventListener('keydown', (e) => {
        if (!this.active || this.state !== 'play') return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); this.press(); }
      });
      $('#rnStart').addEventListener('click', () => this.start());
      $('#rnAgain').addEventListener('click', () => this.start());
      window.addEventListener('resize', () => { if (this.active) this.resize(); });
      this.state = 'ready';
      this.resetGame();
    },

    enter() {
      this.active = true;
      this.pal = isDark() ? PAL.night : PAL.day;
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cv.style.height = cssH + 'px';
      this.cv.width = Math.round(cssW * dpr);
      this.cv.height = Math.round(cssH * dpr);
      this.k = (dpr * cssH) / VIEW_H;
      this.viewW = (cssW / cssH) * VIEW_H;
      this.catSX = Math.max(56, this.viewW * 0.2);
    },

    resetGame() {
      const { $ } = this.api;
      this.L = buildLevel(this.nPhotos);
      this.cam = 0;
      this.t = 0;
      this.cat = { y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, inv: 0, slow: 0, run: 0 };
      this.fish = 0; this.photos = 0; this.hits = 0;
      this.parts = []; this.floats = [];
      this.jumpBuf = 0; this.shake = 0; this.fallGap = null;
      this.hud = '';
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

    // ---------- 主循环 ----------
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
        else if (c.jumps < 2) { c.vy = -JUMP2; c.jumps = 2; this.jumpBuf = 0; this.sfx(79); this.puff(cx + CW / 2, c.y, 6, '#fff'); }
      }
      const prevY = c.y;
      c.vy = Math.min(c.vy + GRAV * dt, 900);
      c.y += c.vy * dt;

      // 支撑：冲浪板平台 → 地面（海沟上方没有地面）
      const feetL = cx + 10, feetR = cx + CW - 10;
      let landed = false;
      if (c.vy >= 0 && !this.fallGap) {
        for (const p of L.plats) {
          if (feetR > p.x && feetL < p.x + p.w && prevY <= p.y + 0.5 && c.y >= p.y) { c.y = p.y; landed = true; break; }
        }
        if (!landed && prevY <= GROUND + 0.5 && c.y >= GROUND && !this.overGap(feetL, feetR)) { c.y = GROUND; landed = true; }
      }
      if (landed) {
        if (!c.onGround && c.vy > 320) this.puff(cx + CW / 2, c.y, 5, this.pal.roadEdge);
        c.vy = 0; c.jumps = 0;
      } else if (c.onGround) c.coyote = 0.09;
      c.onGround = landed;
      if (!landed && c.y > GROUND + 2 && !this.fallGap) {
        this.fallGap = this.overGap(feetL, feetR) || L.gaps.find((g) => cx + CW / 2 > g.x && cx < g.x + g.w) || null;
      }
      if (c.y > VIEW_H + 70) this.respawn();

      // 收集
      const box = { x: cx + 6, y: c.y - CH + 4, w: CW - 12, h: CH - 6 };
      for (const f of L.fish) {
        if (!f.got && f.x > cx - 30 && f.x < cx + 80 && hit(box, f.x - 10, f.y - 8, 20, 16)) {
          f.got = true; this.fish++; this.sparkle(f.x, f.y, '#FFB347', 6); this.sfx(84, 0.08);
        }
      }
      for (const p of L.photos) {
        if (!p.got && hit(box, p.x - 18, p.y - 22, 36, 44)) {
          p.got = true; this.photos++; this.sparkle(p.x, p.y, '#FFE680', 16); this.toast(p.i);
          this.api.sound.chord([79, 84, 88]);
        }
      }
      // 螃蟹：从上面踩有奖励，正面撞到会疼
      for (const k of L.crabs) {
        if (k.dead) { k.vy += GRAV * dt; k.y += k.vy * dt; k.x += 80 * dt; continue; }
        k.x = k.x0 + Math.sin(this.t * k.sp) * k.range;
        if (hit(box, k.x - 16, GROUND - 20, 32, 20)) {
          if (c.vy > 0 && prevY <= GROUND - 12) {
            k.dead = true; k.vy = -320; c.vy = -430; c.jumps = 1; this.fish += 2;
            this.floatText(k.x, GROUND - 40, this.api.fill(T.stomp), '#FFC94D'); this.sfx(67, 0.15);
          } else if (c.inv <= 0) this.hurt();
        }
      }
      // 海鸥：贴着地面跑就躲得过
      for (const s of L.gulls) {
        if (!s.go && s.x - this.cam < this.viewW + 300) s.go = true;
        if (s.go) s.x -= s.vx * dt;
        if (c.inv <= 0 && hit(box, s.x - 18, s.y - 7, 36, 14)) this.hurt();
      }
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
      this.floatText(this.cam + this.catSX + CW / 2, c.y - CH - 8, this.api.fill(this.T.ouch), '#FF6F91');
      this.sfx(52, 0.25);
    },

    finish() {
      const { $, fill } = this.api;
      const T = this.T;
      this.state = 'done';
      const score = this.fish + this.photos * 5;
      const r = T.results.slice().sort((a, b) => b.min - a.min).find((x) => score >= x.min);
      $('#rnStats').textContent = fill(T.doneStats, { photos: this.photos, total: this.nPhotos, fish: this.fish });
      $('#rnResult').textContent = fill(r ? r.text : '');
      setTimeout(() => {
        $('#rnDone').hidden = false;
        this.api.confetti.burst(160, { hearts: true });
        this.api.sound.chord([72, 76, 79, 84]);
      }, 600);
    },

    paintHud() {
      const prog = Math.min(1, (this.cam + this.catSX) / this.L.end);
      const key = this.fish + '|' + this.photos + '|' + Math.round(prog * 200);
      if (key === this.hud) return;
      this.hud = key;
      const { $ } = this.api;
      $('#rnFish').textContent = this.fish;
      $('#rnPhotos').textContent = this.photos;
      $('#rnBar').style.width = (prog * 100).toFixed(1) + '%';
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
      for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: 0.45, max: 0.45, r: 3 + Math.random() * 3, c: color, g: 0 });
    },
    sparkle(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.6, max: 0.6, r: 2 + Math.random() * 2.5, c: color, g: 300 });
      }
    },
    floatText(x, y, text, color) { this.floats.push({ x, y, text, color, life: 0.9 }); },
    tickFx(dt) {
      this.parts = this.parts.filter((p) => (p.life -= dt) > 0);
      this.parts.forEach((p) => { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
      this.floats = this.floats.filter((f) => (f.life -= dt) > 0);
      this.floats.forEach((f) => { f.y -= 40 * dt; });
      if (this.shake > 0) this.shake -= dt;
    },

    // ---------- 绘制 ----------
    draw() {
      const g = this.g, P = this.pal, W = this.viewW, t = this.t, cam = this.cam, L = this.L;
      const sx = this.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
      g.setTransform(this.k, 0, 0, this.k, sx * this.k, 0);

      // 天空
      const sky = g.createLinearGradient(0, 0, 0, 165);
      sky.addColorStop(0, P.skyA); sky.addColorStop(1, P.skyB);
      g.fillStyle = sky; g.fillRect(-10, 0, W + 20, 166);
      if (P === PAL.night) {
        g.fillStyle = 'rgba(255,255,255,.8)';
        for (let i = 0; i < 40; i++) { const x = (i * 97.3) % W, y = (i * 53.7) % 140; g.fillRect(x, y, (i % 3) ? 1 : 1.6, (i % 3) ? 1 : 1.6); }
      }
      g.fillStyle = P.sun; g.beginPath(); g.arc(W * 0.8, 46, P === PAL.night ? 14 : 20, 0, 7); g.fill();
      g.fillStyle = P.cloud;
      for (let i = 0; i < 4; i++) {
        const span = W + 220, x = ((i * 260 - cam * 0.06 - t * 6) % span + span) % span - 110, y = 30 + (i % 3) * 26;
        g.beginPath(); g.ellipse(x, y, 34, 10, 0, 0, 7); g.ellipse(x + 20, y - 8, 20, 10, 0, 0, 7); g.fill();
      }
      // 江之岛
      const span = W + 520, ix = ((W * 0.62 - cam * 0.04) % span + span) % span - 260;
      g.fillStyle = P.island;
      g.beginPath(); g.moveTo(ix - 80, 160); g.bezierCurveTo(ix - 50, 132, ix - 10, 118, ix + 30, 120); g.bezierCurveTo(ix + 70, 122, ix + 110, 140, ix + 140, 160); g.fill();
      g.fillRect(ix + 22, 92, 5, 30); g.fillRect(ix + 17, 90, 15, 5);
      // 海
      const sea = g.createLinearGradient(0, 160, 0, 212);
      sea.addColorStop(0, P.seaA); sea.addColorStop(1, P.seaB);
      g.fillStyle = sea; g.fillRect(-10, 160, W + 20, 54);
      g.fillStyle = P.glint;
      for (let i = 0; i < 14; i++) {
        const x = ((i * 71 - cam * 0.25) % (W + 40) + W + 40) % (W + 40) - 20, y = 168 + (i * 13) % 36;
        if (Math.sin(t * 3 + i) > 0.2) g.fillRect(x, y, 6, 1.2);
      }
      // 轨道 + 远处的江之电
      g.fillStyle = '#5B6470'; g.fillRect(-10, 212, W + 20, 3);
      const loop = W + 900, tx = W + 300 - ((t * 150 + cam * 0.5) % loop);
      this.drawTrain(g, tx, 186, 0.62);
      // 海堤 + 栏杆
      g.fillStyle = P.wall; g.fillRect(-10, 215, W + 20, GROUND - 215);
      g.strokeStyle = P.wallLine; g.lineWidth = 1;
      for (let x = -((cam * 0.9) % 50); x < W; x += 50) { g.beginPath(); g.moveTo(x, 217); g.lineTo(x, GROUND); g.stroke(); }
      g.strokeStyle = P.rail; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-10, 226); g.lineTo(W + 10, 226); g.stroke();
      for (let x = -(cam % 60); x < W; x += 60) { g.beginPath(); g.moveTo(x, 226); g.lineTo(x, GROUND); g.stroke(); }

      // 地面 + 海沟
      g.fillStyle = P.road; g.fillRect(-10, GROUND, W + 20, VIEW_H - GROUND);
      g.fillStyle = P.roadEdge; g.fillRect(-10, GROUND, W + 20, 4);
      g.strokeStyle = P.tile; g.lineWidth = 1;
      for (let x = -(cam % 40); x < W; x += 40) { g.beginPath(); g.moveTo(x, GROUND + 4); g.lineTo(x - 8, VIEW_H); g.stroke(); }
      for (const gp of L.gaps) {
        const x = gp.x - cam;
        if (x > W || x + gp.w < 0) continue;
        g.fillStyle = P.water; g.fillRect(x, GROUND, gp.w, VIEW_H - GROUND);
        g.fillStyle = P.waterTop;
        for (let k = 0; k < gp.w; k += 12) g.fillRect(x + k, GROUND + 14 + Math.sin(t * 4 + k) * 2, 8, 2);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, GROUND, 4, VIEW_H - GROUND); g.fillRect(x + gp.w - 4, GROUND, 4, VIEW_H - GROUND);
      }

      // 终点站
      const ex = L.end - cam;
      if (ex < W + 300) this.drawGoal(g, ex);

      // 冲浪板平台
      const boards = ['#FF7A8A', '#FFC94D', '#36C2C9', '#7FA6FF'];
      L.plats.forEach((p, i) => {
        const x = p.x - cam; if (x > W || x + p.w < 0) return;
        g.fillStyle = 'rgba(0,0,0,.12)'; rr(g, x + 4, p.y + 8, p.w, 10, 5); g.fill();
        g.fillStyle = boards[i % boards.length]; rr(g, x, p.y, p.w, 12, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x + 10, p.y + 5, p.w - 20, 2);
      });

      // 小鱼干
      L.fish.forEach((f, i) => {
        if (f.got) return;
        const x = f.x - cam; if (x < -20 || x > W + 20) return;
        this.drawFish(g, x, f.y + Math.sin(t * 4 + i) * 2);
      });
      // 回忆照片
      L.photos.forEach((p) => {
        if (p.got) return;
        const x = p.x - cam; if (x < -40 || x > W + 40) return;
        this.drawPhoto(g, x, p.y + Math.sin(t * 2.5 + p.i) * 3, p.i);
      });
      // 螃蟹
      L.crabs.forEach((k) => { const x = k.x - cam; if (x > -30 && x < W + 30 && k.y < VIEW_H + 30) this.drawCrab(g, x, k.y, k.dead); });
      // 海鸥 + 提示
      L.gulls.forEach((s) => {
        if (!s.go) return;
        const x = s.x - cam;
        if (x > W + 8 && x < W + 300) this.drawWarn(g, W, s.y);
        else if (x > -30 && x <= W + 8) this.drawGull(g, x, s.y);
      });

      // 小猫
      const c = this.cat;
      if (!(c.inv > 0 && Math.floor(c.inv * 10) % 2 === 0)) this.drawCat(g, this.catSX, c.y);

      // 粒子 + 飘字
      this.parts.forEach((p) => { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.c; g.beginPath(); g.arc(p.x - cam, p.y, p.r, 0, 7); g.fill(); });
      g.globalAlpha = 1;
      g.font = '800 13px -apple-system, "PingFang SC", sans-serif';
      g.textAlign = 'center';
      this.floats.forEach((f) => {
        g.globalAlpha = Math.min(1, f.life * 2);
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(f.text, f.x - cam, f.y);
        g.fillStyle = f.color; g.fillText(f.text, f.x - cam, f.y);
      });
      g.globalAlpha = 1;
    },

    drawTrain(g, x, y, s) {
      const len = 150 * s * 2 + 6;
      if (x > this.viewW + 10 || x + len < -10) return;
      for (let k = 0; k < 2; k++) {
        const x0 = x + k * (150 * s + 6), w = 150 * s, h = 40 * s;
        g.fillStyle = '#F4E8CC'; rr(g, x0, y, w, h, 5 * s); g.fill();
        g.fillStyle = '#1F5FAF'; g.fillRect(x0, y + h * 0.62, w, h * 0.1);
        g.fillStyle = '#1B3556';
        for (let j = 0; j < 6; j++) g.fillRect(x0 + 8 * s + j * 23 * s, y + h * 0.22, 15 * s, h * 0.3);
        g.fillStyle = '#3A424D'; g.fillRect(x0 + 6 * s, y + h, w - 12 * s, 4 * s);
      }
    },

    drawGoal(g, x) {
      // 站台、站名牌和停着的电车
      this.drawTrain(g, x + 60, 172, 1);
      g.fillStyle = '#9AA3AD'; g.fillRect(x - 30, GROUND - 6, 600, 6);
      g.fillStyle = '#5A6470'; g.fillRect(x + 6, GROUND - 92, 5, 86); g.fillRect(x + 109, GROUND - 92, 5, 86);
      g.fillStyle = '#FDFEFF'; rr(g, x - 6, GROUND - 120, 132, 46, 5); g.fill();
      g.fillStyle = '#1F5FAF'; g.fillRect(x - 6, GROUND - 86, 132, 12);
      g.fillStyle = '#10243C'; g.textAlign = 'center';
      g.font = '800 15px -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif';
      g.fillText(this.goalName || this.api.fill(this.T.goalSign), x + 60, GROUND - 92);
      g.fillStyle = '#fff'; g.font = '700 9px -apple-system, "PingFang SC", sans-serif';
      g.fillText(this.api.fill(this.T.goalSign), x + 60, GROUND - 77);
    },

    drawFish(g, x, y) {
      g.fillStyle = '#FF9F43';
      g.beginPath(); g.ellipse(x, y, 9, 5.5, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x - 14, y - 5); g.lineTo(x - 14, y + 5); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 4, y - 1.5, 1.8, 0, 7); g.fill();
      g.fillStyle = '#3A2530'; g.beginPath(); g.arc(x + 4.4, y - 1.5, 0.9, 0, 7); g.fill();
    },

    drawPhoto(g, x, y, i) {
      const glow = g.createRadialGradient(x, y, 4, x, y, 34);
      glow.addColorStop(0, 'rgba(255,230,120,.55)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = glow; g.beginPath(); g.arc(x, y, 34, 0, 7); g.fill();
      g.save(); g.translate(x, y); g.rotate(Math.sin(this.t * 2 + i) * 0.12);
      g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 4;
      g.fillRect(-16, -20, 32, 38); g.shadowBlur = 0;
      const im = this.imgs[i];
      if (im && im.complete && im.naturalWidth) {
        const s = Math.min(im.naturalWidth, im.naturalHeight);
        g.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) * 0.3, s, s, -13, -17, 26, 26);
      } else { g.fillStyle = '#9CC9F0'; g.fillRect(-13, -17, 26, 26); }
      g.restore();
    },

    drawCrab(g, x, y, dead) {
      g.save(); g.translate(x, y - 10);
      if (dead) g.rotate(Math.PI);
      const step = Math.sin(this.t * 14) * 2;
      g.strokeStyle = '#C83A44'; g.lineWidth = 2;
      for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 3; j++) {
        g.beginPath(); g.moveTo(i * 8, 2 + j * 2); g.lineTo(i * (15 + j * 2), 9 + (j % 2 ? step : -step)); g.stroke();
      }
      g.fillStyle = '#F2545B'; g.beginPath(); g.ellipse(0, 0, 14, 9, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(-15, -7, 5, 0, 7); g.arc(15, -7, 5, 0, 7); g.fill();
      g.strokeStyle = '#F2545B'; g.beginPath(); g.moveTo(-4, -7); g.lineTo(-5, -13); g.moveTo(4, -7); g.lineTo(5, -13); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-5, -14, 2.6, 0, 7); g.arc(5, -14, 2.6, 0, 7); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(-5, -14, 1.2, 0, 7); g.arc(5, -14, 1.2, 0, 7); g.fill();
      g.restore();
    },

    drawGull(g, x, y) {
      const f = Math.sin(this.t * 14) * 7;
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 18, y - f); g.quadraticCurveTo(x - 8, y - 6, x, y); g.quadraticCurveTo(x + 8, y - 6, x + 18, y - f); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y + 1, 9, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#FFB020'; g.beginPath(); g.moveTo(x - 9, y + 1); g.lineTo(x - 14, y + 2); g.lineTo(x - 9, y + 3); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(x - 5, y - 1, 1.2, 0, 7); g.fill();
    },

    drawWarn(g, W, y) {
      const text = '! ' + this.api.fill(this.T.gullWarn);
      g.font = '800 12px -apple-system, "PingFang SC", sans-serif';
      const w = g.measureText(text).width + 14;
      const a = 0.6 + 0.4 * Math.sin(this.t * 12);
      g.globalAlpha = a;
      g.fillStyle = '#FF6F91'; rr(g, W - w - 6, y - 11, w, 22, 11); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, W - w / 2 - 6, y + 4);
      g.globalAlpha = 1;
    },

    drawCat(g, x, y) {
      const c = this.cat, t = this.t;
      const air = !c.onGround && this.state === 'play';
      const done = this.state === 'done';
      const run = this.state === 'play' && c.onGround ? c.run : 0;
      const bob = run ? Math.abs(Math.sin(run)) * -2 : 0;
      g.save(); g.translate(x, y + bob);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const fur = '#FFE2B8', stripe = '#F5A04A', line = '#7A5236';
      // 尾巴
      g.strokeStyle = stripe; g.lineWidth = 6;
      g.beginPath(); g.moveTo(6, -18); g.quadraticCurveTo(-12, -26 + Math.sin(t * 8) * 6, -6, -40 + Math.sin(t * 6) * 3); g.stroke();
      // 腿
      g.strokeStyle = fur; g.lineWidth = 6;
      const legs = [10, 18, 30, 37];
      legs.forEach((lx, i) => {
        let dx = 0, dy = 0;
        if (air) { dx = i < 2 ? -3 : 3; dy = -4; }
        else if (run) { const ph = run * 2 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0); dx = Math.sin(ph) * 5; dy = Math.min(0, Math.cos(ph) * 3); }
        g.beginPath(); g.moveTo(lx, -10); g.lineTo(lx + dx, -2 + dy); g.stroke();
      });
      // 身体
      g.fillStyle = fur; g.strokeStyle = line; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(24, -17, 19, 11, 0, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = stripe; g.lineWidth = 3;
      [16, 23, 30].forEach((sx) => { g.beginPath(); g.moveTo(sx, -27); g.lineTo(sx + 2, -21); g.stroke(); });
      // 头
      const hx = 41, hy = done ? -30 : -28;
      g.fillStyle = fur; g.strokeStyle = line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(hx - 11, hy - 6); g.lineTo(hx - 9, hy - 19); g.lineTo(hx - 2, hy - 11); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(hx + 11, hy - 6); g.lineTo(hx + 9, hy - 19); g.lineTo(hx + 2, hy - 11); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(hx, hy, 13, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#FFB3C1';
      g.beginPath(); g.moveTo(hx - 9, hy - 9); g.lineTo(hx - 8.5, hy - 15); g.lineTo(hx - 5, hy - 10); g.fill();
      g.beginPath(); g.moveTo(hx + 9, hy - 9); g.lineTo(hx + 8.5, hy - 15); g.lineTo(hx + 5, hy - 10); g.fill();
      g.strokeStyle = stripe; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(hx - 3, hy - 12); g.lineTo(hx - 2, hy - 8); g.moveTo(hx + 3, hy - 12); g.lineTo(hx + 2, hy - 8); g.stroke();
      // 眼睛
      if (c.inv > 0 && this.state === 'play') {
        g.strokeStyle = '#3A2530'; g.lineWidth = 1.8;
        [[-5, 0], [5, 0]].forEach(([ex]) => { g.beginPath(); g.moveTo(hx + ex - 2.5, hy - 3); g.lineTo(hx + ex + 2.5, hy + 1); g.moveTo(hx + ex + 2.5, hy - 3); g.lineTo(hx + ex - 2.5, hy + 1); g.stroke(); });
      } else if (done) {
        g.strokeStyle = '#3A2530'; g.lineWidth = 1.8;
        [-5, 5].forEach((ex) => { g.beginPath(); g.arc(hx + ex, hy, 2.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
      } else {
        g.fillStyle = '#3A2530';
        [-5, 5].forEach((ex) => { g.beginPath(); g.arc(hx + ex, hy - 1, 2.8, 0, 7); g.fill(); });
        g.fillStyle = '#fff';
        [-5, 5].forEach((ex) => { g.beginPath(); g.arc(hx + ex + 1, hy - 2, 1, 0, 7); g.fill(); });
      }
      g.fillStyle = '#FF9FB2'; g.globalAlpha = 0.6;
      g.beginPath(); g.arc(hx - 8, hy + 4, 2.6, 0, 7); g.arc(hx + 8, hy + 4, 2.6, 0, 7); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = '#F07A93'; g.beginPath(); g.moveTo(hx - 1.6, hy + 2); g.lineTo(hx + 1.6, hy + 2); g.lineTo(hx, hy + 3.8); g.fill();
      g.strokeStyle = '#3A2530'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(hx, hy + 3.8); g.quadraticCurveTo(hx - 2, hy + 6, hx - 3.5, hy + 4.6); g.moveTo(hx, hy + 3.8); g.quadraticCurveTo(hx + 2, hy + 6, hx + 3.5, hy + 4.6); g.stroke();
      g.strokeStyle = 'rgba(122,82,54,.6)';
      g.beginPath(); g.moveTo(hx + 9, hy + 2); g.lineTo(hx + 17, hy); g.moveTo(hx + 9, hy + 4); g.lineTo(hx + 17, hy + 5); g.stroke();
      if (done) { // 到站后冒爱心
        g.fillStyle = '#FF6F91';
        const hy2 = hy - 26 - ((t * 20) % 14);
        g.beginPath(); g.moveTo(hx, hy2 + 3); g.bezierCurveTo(hx, hy2, hx - 5, hy2, hx - 5, hy2 + 3); g.bezierCurveTo(hx - 5, hy2 + 6, hx, hy2 + 8, hx, hy2 + 10);
        g.bezierCurveTo(hx, hy2 + 8, hx + 5, hy2 + 6, hx + 5, hy2 + 3); g.bezierCurveTo(hx + 5, hy2, hx, hy2, hx, hy2 + 3); g.fill();
      }
      g.restore();
    },
  };
})();
