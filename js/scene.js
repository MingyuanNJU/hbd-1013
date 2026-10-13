// 像素风湘南海岸：参考鎌倉高校前的踏切。全部逐像素绘制，低分辨率画布放大显示。
window.HBD_SCENE = (() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // ---------- 调色板 ----------
  const DAY = {
    sky: ['#3E8FDA', '#559EE0', '#6DAEE6', '#89BFEC', '#A7D0F1', '#C6E2F6'],
    haze: '#E4F2FA', cloud: '#FFFFFF', cloudS: '#DCEAF5', cloudSS: '#BFD6EA',
    island: '#86B3DA', islandS: '#729FC8',
    sea: ['#62AEE4', '#4C9FDD', '#3A90D4', '#2C82C9', '#2477BF'], glint: '#FFFFFF', glint2: '#CFEAFF',
    fenceRail: '#D8D0C2', fencePost: '#A9553A', fencePostS: '#8C4330',
    wall: '#D9D3C4', wallHi: '#F0EBDF', wallS: '#BDB6A5',
    road: '#ABAAA3', roadS: '#9D9C95', roadLine: '#E9E6DC',
    ballast: '#8E857A', ballastA: '#776E63', ballastB: '#A69D90', sleeper: '#5A4636',
    rail: '#6C7177', railHi: '#D2D7DB',
    ground: '#8F8E88', groundS: '#83827C', hatchY: '#F2C230', hatchK: '#262626',
    pole: '#A9ABA7', poleS: '#8B8D89', wire: '#2C3138',
    bird: '#F4F7FA', fuji: '#B9D6EE',
  };
  const NIGHT = {
    sky: ['#070D22', '#0A1430', '#0F1C3E', '#14264D', '#1B315C', '#243D6B'],
    haze: '#2E4A7A', cloud: '#2A3B60', cloudS: '#22314F', cloudSS: '#1C2944',
    island: '#0F1E3D', islandS: '#0B1731',
    sea: ['#1A3561', '#152D55', '#11264A', '#0E2040', '#0B1A36'], glint: '#FFE9A8', glint2: '#9FB8E0',
    fenceRail: '#5E6375', fencePost: '#5A3530', fencePostS: '#472A26',
    wall: '#4A5064', wallHi: '#5E6579', wallS: '#3C4152',
    road: '#3A3F4E', roadS: '#343846', roadLine: '#6A6F7E',
    ballast: '#3D3A40', ballastA: '#333037', ballastB: '#49464C', sleeper: '#2A221E',
    rail: '#4B5058', railHi: '#9AA3B0',
    ground: '#34373F', groundS: '#2E3138', hatchY: '#9C8530', hatchK: '#18181A',
    pole: '#555A63', poleS: '#454951', wire: '#0E1220',
    bird: '#9FB0CC', fuji: '#141C38',
  };
  const DUSK = {
    sky: ['#2B2F6B', '#4B3F86', '#7E4F93', '#C0607F', '#F08A6A', '#FFC07A'],
    haze: '#FFD9A0', cloud: '#FFC9A8', cloudS: '#E99A8C', cloudSS: '#B9708A',
    island: '#5E4270', islandS: '#4A3360',
    sea: ['#E8957A', '#C07A88', '#86628F', '#56528A', '#3E4278'], glint: '#FFE2A8', glint2: '#FFB27A',
    fenceRail: '#C9A99A', fencePost: '#8E3F33', fencePostS: '#73322A',
    wall: '#C9A893', wallHi: '#E4C3A8', wallS: '#A88A7A',
    road: '#8F8396', roadS: '#847990', roadLine: '#D6BFB5',
    ballast: '#76686F', ballastA: '#655962', ballastB: '#8A7B80', sleeper: '#4A3530',
    rail: '#5E5A66', railHi: '#F0B89A',
    ground: '#7A7080', groundS: '#6F6676', hatchY: '#E0A83A', hatchK: '#2A2228',
    pole: '#8E8790', poleS: '#746E78', wire: '#2B2236',
    bird: '#3A2A40', fuji: '#4A3866',
  };

  // ---------- 一天的时间：0 = 白天，1 = 黄昏，2 = 夜晚（随站点推进） ----------
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function lerpPal(a, b, t) {
    const o = {};
    for (const k in a) o[k] = Array.isArray(a[k]) ? a[k].map((c, i) => mix(c, b[k][i], t)) : mix(a[k], b[k], t);
    return o;
  }
  const palAt = (tod, D = DAY, K = DUSK, N = NIGHT) => (tod <= 1 ? lerpPal(D, K, Math.max(0, tod)) : lerpPal(K, N, Math.min(1, tod - 1)));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // ---------- 江之电（绿 + 奶油），x 为车头左端，railY 为轨面 ----------
  const TC = {
    roof: '#9AA0A6', roofS: '#7D848B', roofHi: '#C3C8CD', panto: '#3B4148',
    cream: '#EFE6C9', creamS: '#D9CEAB', green: '#2F6B4F', greenD: '#24533D', greenL: '#4A8A69',
    win: '#1D3A45', winHi: '#5F8E99', winLit: '#F6D58B', winLitS: '#D9B060',
    skirt: '#2A2E33', bogie: '#3B4046', wheel: '#1C1F23', wheelHi: '#6A7076',
    head: '#FFF3B0', led: '#121212', ledOn: '#FFB21E', num: '#EFE6C9', door: '#C9BE9C',
  };
  const DIG = { 0: '111101101101111', 1: '010110010010111', 3: '111001111001111' }; // 3x5 数字
  function digits(g, str, x, y, c) {
    g.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const m = DIG[str[i]]; if (!m) continue;
      for (let p = 0; p < 15; p++) if (m[p] === '1') g.fillRect(x + i * 4 + (p % 3), y + ((p / 3) | 0), 1, 1);
    }
  }
  function trainDims(H) {
    const k = H / 200;
    const r = (v) => Math.max(1, Math.round(v * k));
    return { k, r, carL: r(118), gap: r(3), bodyH: r(46), roofH: r(4), panto: r(15), bogieH: r(7), skirtH: r(3) };
  }
  function trainLength(H, cars = 2) { const d = trainDims(H); return d.carL * cars + d.gap * (cars - 1); }
  function trainTop(H) { const d = trainDims(H); return d.bogieH + d.skirtH + d.bodyH + d.roofH + d.panto; }
  function drawTrain(g, x0, railY, H, night, cars = 2) {
    const d = trainDims(H), r = d.r;
    x0 = Math.round(x0);
    const bodyB = railY - d.bogieH - d.skirtH;
    const bodyT = bodyB - d.bodyH;
    const greenT = bodyT + Math.round(d.bodyH * 0.52);
    const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    for (let c = 0; c < cars; c++) {
      const x = x0 + c * (d.carL + d.gap), L = d.carL, front = c === 0, tail = c === cars - 1;
      // 车顶 + 空调
      f(TC.roofS, x + 2, bodyT - d.roofH, L - 4, d.roofH);
      f(TC.roof, x + 2, bodyT - d.roofH, L - 4, d.roofH - 1);
      f(TC.roofHi, x + 3, bodyT - d.roofH, L - 6, 1);
      f(TC.roofS, x + Math.round(L * 0.3), bodyT - d.roofH - r(3), r(18), r(3));
      f(TC.roofS, x + Math.round(L * 0.62), bodyT - d.roofH - r(3), r(18), r(3));
      if (front) { // 集电弓
        const px = x + Math.round(L * 0.18), top = bodyT - d.roofH - d.panto;
        g.fillStyle = TC.panto;
        for (let i = 0; i < d.panto; i++) {
          const w = Math.round((i / d.panto) * r(10));
          g.fillRect(px + r(10) - w, bodyT - d.roofH - 1 - i, 1, 1);
          g.fillRect(px + r(10) + w, bodyT - d.roofH - 1 - i, 1, 1);
        }
        f(TC.panto, px - r(2), top, r(24), 1);
      }
      // 车身：上奶油、下绿
      f(TC.cream, x, bodyT, L, greenT - bodyT);
      f(TC.green, x, greenT, L, bodyB - greenT);
      f(TC.greenD, x, bodyB - 1, L, 1);
      f(TC.greenL, x, greenT, L, 1);
      f(TC.creamS, x, greenT - 1, L, 1);
      if (front) { g.clearRect(x, bodyT - d.roofH, 2, d.roofH + 1); g.clearRect(x, bodyT, 1, 2); }
      if (tail) { g.clearRect(x + L - 2, bodyT - d.roofH, 2, d.roofH + 1); g.clearRect(x + L - 1, bodyT, 1, 2); }
      // 门（每节两扇）与窗
      const doorW = r(11), doorX = [Math.round(L * 0.2), Math.round(L * 0.7)];
      const winT = bodyT + r(6), winH = r(13);
      doorX.forEach((dx) => {
        f(TC.door, x + dx - 1, bodyT + r(3), doorW + 2, bodyB - bodyT - r(3));
        f(TC.cream, x + dx, bodyT + r(4), doorW, greenT - bodyT - r(4));
        f(TC.green, x + dx, greenT, doorW, bodyB - greenT - 1);
        f(night ? TC.winLit : TC.win, x + dx + 2, winT, doorW - 4, winH + r(4));
        if (!night) f(TC.winHi, x + dx + 2, winT + 1, 1, r(5));
      });
      const segs = [[r(5), doorX[0] - r(3)], [doorX[0] + doorW + r(3), doorX[1] - r(3)], [doorX[1] + doorW + r(3), L - r(5)]];
      segs.forEach(([a, b]) => {
        const n = Math.max(1, Math.round((b - a) / r(17)));
        const gapW = r(3), w = Math.floor((b - a - (n - 1) * gapW) / n);
        for (let j = 0; j < n; j++) {
          const wx = x + a + j * (w + gapW);
          f(night ? TC.winLitS : TC.creamS, wx - 1, winT - 1, w + 2, winH + 2);
          f(night ? TC.winLit : TC.win, wx, winT, w, winH);
          if (!night) { f(TC.winHi, wx + 1, winT + 1, Math.max(1, Math.round(w * 0.35)), 1); f(TC.winHi, wx + 1, winT + 2, 1, Math.round(winH * 0.4)); }
        }
      });
      // 侧面行先牌 + 车号
      const lx = x + Math.round(L * 0.42), ly = bodyT + r(2);
      f(TC.led, lx, ly, r(16), r(3));
      g.fillStyle = TC.ledOn;
      for (let i = 1; i < r(16) - 1; i += 2) g.fillRect(lx + i, ly + 1, 1, Math.max(1, r(3) - 2));
      if (d.k > 0.6) digits(g, c === 0 ? '1013' : '1011', x + L - r(22), bodyB - r(10), TC.num);
      // 车头
      if (front) {
        f(TC.win, x + r(2), winT - r(1), r(6), winH + r(3));
        if (!night) f(TC.winHi, x + r(3), winT, 1, r(6));
        f(TC.head, x, bodyB - r(9), r(2), r(2));
        if (night) { g.fillStyle = 'rgba(255,240,170,.22)'; g.fillRect(x - r(30), bodyB - r(11), r(30), r(6)); g.fillStyle = 'rgba(255,240,170,.12)'; g.fillRect(x - r(52), bodyB - r(13), r(22), r(10)); }
        f(TC.led, x + r(1), bodyT + r(1), r(7), r(3));
        g.fillStyle = TC.ledOn; g.fillRect(x + r(2), bodyT + r(2), r(5), 1);
      }
      if (tail) f('#D8332B', x + L - r(2), bodyB - r(9), r(2), r(2));
      // 裙板 + 转向架 + 车轮
      f(TC.skirt, x + r(2), bodyB, L - r(4), d.skirtH);
      [0.2, 0.8].forEach((p) => {
        const bx = x + Math.round(L * p);
        f(TC.bogie, bx - r(13), bodyB + d.skirtH, r(26), d.bogieH - r(2));
        [-r(8), r(8)].forEach((o) => {
          const wr = r(3);
          f(TC.wheel, bx + o - wr, railY - wr * 2, wr * 2, wr * 2);
          g.clearRect(bx + o - wr, railY - wr * 2, 1, 1); g.clearRect(bx + o + wr - 1, railY - wr * 2, 1, 1);
          f(TC.wheelHi, bx + o - 1, railY - wr - 1, 2, 2);
        });
      });
      if (!tail) f('#2B2F35', x + L, bodyT + r(6), d.gap, d.bodyH - r(8));
    }
  }

  // ---------- 场景 ----------
  const cv = document.getElementById('bg');
  const g = cv.getContext('2d');
  let W = 0, H = 0, S = 4, P = DAY, L = {};
  let tod = 0, todTo = 0;
  const st = { t: 0, alarm: false, bar: 0, barTo: 0, trains: [], cyclist: null, nextAmb: 20, nextCyc: 5, busy: false };
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const fr = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const dither = (c, y) => { g.fillStyle = c; for (let x = y & 1; x < W; x += 2) g.fillRect(x, y, 1, 1); };

  function layout() {
    const r = Math.round;
    L = { hy: r(H * 0.42), seaB: r(H * 0.585), trackY: r(H * 0.80), k: H / 200 };
    L.sigX = Math.max(8, r(Math.min(W * 0.12, 44 * L.k)));
    L.poleX = W - Math.max(6, r(W * 0.06));
    L.wallB = L.seaB + Math.max(3, r(5 * L.k));
    L.contactY = L.trackY - trainTop(H) - 1;
    seed = 7;
    L.glints = Array.from({ length: r(W * 0.35) }, () => ({ x: (rnd() * W) | 0, y: L.hy + 2 + ((rnd() * (L.seaB - L.hy - 4)) | 0), p: rnd() * 6, w: 1 + ((rnd() * 3) | 0) }));
    L.stars = Array.from({ length: r(W * 0.4) }, () => ({ x: (rnd() * W) | 0, y: (rnd() * L.hy * 0.9) | 0, p: rnd() * 6 }));
    L.gravel = Array.from({ length: r(W * 1.2) }, () => ({ x: (rnd() * W) | 0, y: L.trackY - 2 + ((rnd() * 7) | 0), c: rnd() < 0.5 }));
    L.clouds = [0.05, 0.3, 0.55, 0.82].map((fx, i) => ({ x: fx * W, y: L.hy - 1 - ((i % 2) * 3), w: r((24 + (i * 13) % 20) * L.k) }));
    L.highClouds = [0.15, 0.7].map((fx, i) => ({ x: fx * W, y: r(H * (0.13 + i * 0.08)), w: r((18 + i * 10) * L.k) }));
    L.birds = [0.35, 0.42, 0.6].map((fx, i) => ({ x: fx * W, y: r(H * (0.2 + i * 0.04)), p: i }));
  }

  function resize() {
    S = Math.max(2, Math.floor(window.innerHeight / 190));
    W = Math.ceil(window.innerWidth / S);
    H = Math.ceil(window.innerHeight / S);
    cv.width = W; cv.height = H;
    cv.style.width = W * S + 'px';
    cv.style.height = H * S + 'px';
    P = palAt(tod);
    layout();
    draw();
  }

  function cloud(x, y, w, cs) {
    x = Math.round(x);
    const h = Math.max(3, Math.round(w * 0.28)), bump = Math.max(2, Math.round(h * 0.6));
    fr(cs[2], x + 1, y, w - 2, 1);
    fr(cs[1], x, y - 2, w, 2);
    fr(cs[0], x + 1, y - h + 1, w - 2, h - 3);
    fr(cs[0], x + Math.round(w * 0.2), y - h - 1, Math.round(w * 0.35), 2);
    fr(cs[0], x + Math.round(w * 0.5), y - h - bump, Math.round(w * 0.3), bump + 1);
  }

  function drawSky() {
    const bands = P.sky, n = bands.length, top = L.hy;
    for (let i = 0; i < n; i++) {
      const y0 = Math.round((top * i) / n), y1 = Math.round((top * (i + 1)) / n);
      fr(bands[i], 0, y0, W, y1 - y0);
      if (i > 0) { dither(bands[i - 1], y0); }
    }
    const starA = clamp01((tod - 1.3) / 0.5);
    if (starA > 0) L.stars.forEach((s) => { if (s.p / 6 < starA && Math.sin(st.t * 2 + s.p * 3) > -0.3) fr(s.p > 4 ? '#FFFFFF' : '#AFC3E8', s.x, s.y, 1, 1); });
    // 夕阳：慢慢落进海里
    const sunT = (tod - 0.45) / 1.0;
    if (sunT > 0 && sunT < 1.05) {
      const sr = Math.max(5, Math.round(7 * L.k)), sx = Math.round(W * 0.4), sy = Math.round(H * 0.15 + (L.hy + sr * 0.6 - H * 0.15) * clamp01(sunT));
      const c = mix('#FFF4D0', '#FF6A30', clamp01(sunT));
      g.fillStyle = 'rgba(255,170,90,' + (0.12 * (1 - Math.abs(sunT - 0.7))).toFixed(3) + ')';
      g.fillRect(sx - sr * 3, sy - sr * 2, sr * 6, sr * 4);
      g.fillStyle = c;
      for (let yy = -sr; yy <= sr; yy++) { const w = Math.round(Math.sqrt(sr * sr - yy * yy)); g.fillRect(sx - w, sy + yy, w * 2, 1); }
      fr(mix(c, '#FFFFFF', 0.45), sx - Math.round(sr * 0.4), sy - Math.round(sr * 0.5), Math.max(1, Math.round(sr * 0.4)), Math.max(1, Math.round(sr * 0.3)));
    }
    if (tod > 1.5) {
      const rise = clamp01((tod - 1.5) / 0.5);
      const mx = Math.round(W * 0.78), mr = Math.max(4, Math.round(6 * L.k)), my = Math.round(L.hy - mr - (L.hy - mr - H * 0.14) * rise);
      g.fillStyle = 'rgba(255,240,200,.07)'; g.fillRect(mx - mr * 2, my - mr * 2, mr * 4, mr * 4);
      g.fillStyle = '#FFF4D2';
      for (let yy = -mr; yy <= mr; yy++) { const w = Math.round(Math.sqrt(mr * mr - yy * yy)); g.fillRect(mx - w, my + yy, w * 2, 1); }
      fr('#E8DDBB', mx + 1, my - 2, 2, 2); fr('#E8DDBB', mx - 3, my + 2, 2, 1);
    }
    const cs = [P.cloud, P.cloudS, P.cloudSS];
    L.highClouds.forEach((c) => cloud(((c.x + st.t * 0.6) % (W + c.w * 2)) - c.w, c.y, c.w, cs));
    if (tod < 1.3) L.birds.forEach((b) => {
      const x = Math.round(((b.x + st.t * 2.2) % (W + 20)) - 10), y = b.y + Math.round(Math.sin(st.t + b.p) * 2);
      g.fillStyle = P.bird; g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y, 1, 1); g.fillRect(x + 1, y + 1, 1, 1);
      if (Math.sin(st.t * 6 + b.p) > 0) { g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 3, y - 1, 1, 1); }
    });
  }

  function drawSea() {
    const { hy, seaB } = L;
    // 远处的低云（在富士山和江之岛后面）
    const cs = [P.cloud, P.cloudS, P.cloudSS];
    L.clouds.forEach((c) => cloud(((c.x + st.t * 0.35) % (W + c.w * 2)) - c.w, c.y, c.w, cs));
    // 富士山剪影（黄昏最清楚，夜里淡淡的）
    const fv = clamp01((tod - 0.5) / 0.45) * (1 - 0.55 * clamp01((tod - 1.5) / 0.5));
    if (fv > 0.02) {
      const bw = Math.min(Math.round(100 * L.k), Math.round(W * 0.62)), fh = Math.round(bw * 0.24), fx = Math.round(W * 0.24);
      const col = mix(P.sky[P.sky.length - 1], P.fuji, fv), snow = mix(col, '#F2B8C0', 0.32 * fv * clamp01(1.6 - tod));
      for (let i = -(bw >> 1); i <= bw >> 1; i++) {
        const d = Math.max(0, (Math.abs(i) / (bw / 2) - 0.07) / 0.93);
        const h = Math.round(fh * Math.pow(1 - d, 1.7));
        if (h <= 0) continue;
        g.fillStyle = col; g.fillRect(fx + i, hy - h, 1, h);
        const cap = Math.round(h - fh * 0.72);
        if (cap > 0) { g.fillStyle = snow; g.fillRect(fx + i, hy - h, 1, Math.min(cap + ((i * 7) & 1), h)); }
      }
    }
    // 远处的江之岛 + 展望灯台
    const iw = Math.round(46 * L.k), ih = Math.round(9 * L.k), ix = Math.round(W * 0.64);
    g.fillStyle = P.island;
    for (let i = 0; i < iw; i++) {
      const t = i / iw, hh = Math.round(ih * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7));
      g.fillRect(ix + i, hy - hh, 1, hh);
    }
    const tx = ix + Math.round(iw * 0.45), th = Math.round(8 * L.k);
    fr(P.islandS, tx, hy - ih - th, 1, th + 1);
    fr(P.islandS, tx - 1, hy - ih - th, 3, 1);
    if (tod > 1.4 && Math.sin(st.t * 1.5) > 0.6) fr('#FFE9A8', tx, hy - ih - th - 1, 1, 1);
    fr(P.haze, 0, hy, W, 1);
    const bands = P.sea, n = bands.length, hh = seaB - hy - 1;
    for (let i = 0; i < n; i++) {
      const y0 = hy + 1 + Math.round((hh * i) / n), y1 = hy + 1 + Math.round((hh * (i + 1)) / n);
      fr(bands[i], 0, y0, W, y1 - y0);
      if (i > 0) dither(bands[i - 1], y0);
    }
    const refl = (x, c, a) => { for (let y = hy + 2; y < seaB; y += 2) if (Math.sin(st.t * 3 + y) > 1 - 2 * a) fr(c, x - 2 + ((y * 7) % 5), y, 2 + ((y * 3) % 4), 1); };
    const sunT = (tod - 0.45) / 1.0;
    if (sunT > 0.25 && sunT < 1.05) refl(Math.round(W * 0.4), '#FFC47A', 0.6 * (1 - Math.abs(sunT - 0.75)));
    if (tod > 1.6) refl(Math.round(W * 0.78), '#E9D9A0', 0.6 * clamp01((tod - 1.6) / 0.4));
    L.glints.forEach((s) => { if (Math.sin(st.t * 2.2 + s.p * 4) > 0.55) fr(s.p > 3 ? P.glint : P.glint2, s.x, s.y, s.w, 1); });
  }

  function drawShore() {
    const { seaB, wallB, trackY, k } = L;
    const r = (v) => Math.max(1, Math.round(v * k));
    const fh = r(7);
    fr(P.wall, 0, seaB, W, wallB - seaB);
    fr(P.wallHi, 0, seaB, W, 1);
    fr(P.wallS, 0, wallB - 1, W, 1);
    fr(P.fenceRail, 0, seaB - fh, W, 1);
    fr(P.fenceRail, 0, seaB - Math.round(fh * 0.5), W, 1);
    for (let x = 1; x < W; x += r(7)) { fr(P.fencePost, x, seaB - fh, r(2), fh); fr(P.fencePostS, x + r(2) - 1, seaB - fh + 1, 1, fh - 1); }
    fr(P.road, 0, wallB, W, trackY - 3 - wallB);
    for (let y = wallB + 1; y < trackY - 3; y += 2) dither(P.roadS, y);
    fr(P.roadLine, 0, wallB + Math.round((trackY - wallB) * 0.35), W, 1);
    fr(P.ballast, 0, trackY - 3, W, 9);
    L.gravel.forEach((p) => fr(p.c ? P.ballastA : P.ballastB, p.x, p.y, 1, 1));
    for (let x = 0; x < W; x += r(6)) fr(P.sleeper, x, trackY + 1, r(3), 2);
    fr(P.rail, 0, trackY, W, 1);
    fr(P.railHi, 0, trackY - 1, W, 1);
    fr(P.ground, 0, trackY + 6, W, H - trackY - 6);
    for (let y = trackY + 9; y < H; y += 2) dither(P.groundS, y);
    for (let x = 0; x < W; x++) fr(((x >> 1) & 1) ? P.hatchY : P.hatchK, x, trackY + 6, 1, 2);
  }

  function drawWires() {
    const { k, poleX, contactY } = L;
    const r = (v) => Math.max(1, Math.round(v * k));
    const top = r(4);
    g.fillStyle = P.wire;
    [[top + r(2), r(6)], [top + r(6), r(9)], [top + r(11), r(5)]].forEach(([y0, sag]) => {
      for (let x = 0; x < poleX; x++) { const t = x / poleX; g.fillRect(x, Math.round(y0 + 4 * sag * t * (1 - t)), 1, 1); }
    });
    for (let x = poleX; x < W; x++) g.fillRect(x, Math.round(top + r(2) - (x - poleX) * 0.6), 1, 1);
    fr(P.wire, 0, contactY, W, 1);
    fr(P.wire, 0, contactY - r(4), W, 1);
    for (let x = poleX % r(40); x < W; x += r(40)) fr(P.wire, x, contactY - r(4), 1, r(4));
  }

  function drawPole() {
    const { k, trackY, poleX, contactY } = L;
    const r = (v) => Math.max(1, Math.round(v * k));
    const pw = r(3), top = r(4);
    fr(P.pole, poleX, 0, pw, trackY + 6);
    fr(P.poleS, poleX + pw - 1, 0, 1, trackY + 6);
    fr(P.poleS, poleX - r(8), top, r(16) + pw, r(2));
    fr(P.wire, poleX - r(18), contactY - r(4), r(18), 1);
  }

  function drawCrossing() {
    const { sigX, trackY, k } = L;
    const r = (v) => Math.max(1, Math.round(v * k));
    const poleTop = Math.round(H * 0.3), cx = sigX + 1, cy = poleTop + r(2);
    fr('#B9BDC1', sigX, poleTop, r(2), trackY + 6 - poleTop);
    for (let y = trackY - r(16); y < trackY + 6; y += 2) fr(((y >> 1) & 1) ? '#F2C230' : '#222', sigX, y, r(2), 2);
    // 踏切标志（黄黑 X）
    const len = r(9);
    for (let i = -len; i <= len; i++) {
      g.fillStyle = ((i + 20) >> 1) & 1 ? '#F5C518' : '#1E1E1E';
      g.fillRect(cx + i, cy + i, 2, 2);
      g.fillRect(cx + i, cy - i, 2, 2);
    }
    // 警报灯（左右交替闪）
    const ly = cy + len + r(4), lr = r(3);
    fr('#1E1E1E', cx - r(8), ly - 1, r(16) + 2, 2);
    const on = st.alarm && Math.floor(st.t * 2.8) % 2;
    [[cx - r(7), on], [cx + r(7), st.alarm && !on]].forEach(([lx, lit]) => {
      fr('#1E1E1E', lx - lr - 1, ly + 1, lr * 2 + 3, lr * 2 + 2);
      fr(lit ? '#FF3B30' : '#5A1A18', lx - lr + 1, ly + 2, lr * 2 - 1, lr * 2);
      if (lit) { fr('#FFB0A8', lx - lr + 2, ly + 3, 1, 1); g.fillStyle = 'rgba(255,60,48,.25)'; g.fillRect(lx - lr * 2 - 2, ly - lr + 2, lr * 4 + 5, lr * 4); }
    });
    fr('#1E1E1E', cx - r(3), ly + lr * 2 + r(3), r(7), r(4));
    fr('#FFFFFF', cx - r(1), ly + lr * 2 + r(4), r(3), 1);
    // 栏杆：bar 0 = 竖起，1 = 放下
    const pivotY = trackY - r(10), pivotX = sigX + r(2);
    fr('#2A2A2A', pivotX - 1, pivotY - 2, r(4), r(5));
    const ang = (1 - st.bar) * (Math.PI / 2) * 0.96;
    const len2 = Math.min(Math.round(W * 0.55), r(120));
    for (let i = 0; i < len2; i++) {
      g.fillStyle = ((i >> 2) & 1) ? '#F5C518' : '#1E1E1E';
      g.fillRect(Math.round(pivotX + r(2) + Math.cos(ang) * i), Math.round(pivotY - Math.sin(ang) * i), 1, 2);
    }
  }

  function drawCyclist(c) {
    const x = Math.round(c.x), y = c.y, ph = Math.floor(st.t * 8) % 2;
    const ring = (wx) => { fr('#2B2B2B', wx - 2, y - 1, 5, 1); fr('#2B2B2B', wx - 2, y - 5, 5, 1); fr('#2B2B2B', wx - 3, y - 4, 1, 3); fr('#2B2B2B', wx + 3, y - 4, 1, 3); };
    ring(x); ring(x + 9);
    fr('#C9CDD2', x, y - 3, 9, 1); fr('#C9CDD2', x + 4, y - 6, 1, 4);
    fr('#2E3550', x + 3, y - 8, 3, 3);
    fr('#2E3550', x + 3 + ph, y - 5, 1, 2);
    fr('#D63B3B', x + 4, y - 13, 4, 5);
    fr('#E8B796', x + 6, y - 16, 3, 3);
    fr('#2A1E1A', x + 5, y - 17, 4, 2);
    fr('#E8B796', x + 7, y - 10, 3, 1);
  }

  function draw() {
    if (!W) return;
    g.clearRect(0, 0, W, H);
    drawSky();
    drawSea();
    drawWires();
    drawShore();
    if (st.cyclist) drawCyclist(st.cyclist);
    st.trains.forEach((tr) => drawTrain(g, tr.x, L.trackY, H, tod > 1.25));
    drawCrossing();
    drawPole();
  }

  // ---------- 动画（平时 10fps，有东西在动时满帧） ----------
  let last = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    st.t += dt;
    st.bar += Math.sign(st.barTo - st.bar) * Math.min(Math.abs(st.barTo - st.bar), dt * 1.8);
    st.trains.forEach((tr) => { tr.x -= tr.v * dt; if (!tr.mid && tr.x + tr.len / 2 < W / 2) { tr.mid = true; if (tr.onMid) tr.onMid(); } });
    const gone = st.trains.filter((tr) => tr.x + tr.len < -4);
    if (gone.length) { st.trains = st.trains.filter((tr) => !gone.includes(tr)); gone.forEach((tr) => tr.onEnd && tr.onEnd()); }
    if (st.cyclist) { st.cyclist.x += 9 * L.k * dt; if (st.cyclist.x > W + 4) st.cyclist = null; }
    if (!reduce && !st.busy && !document.hidden) {
      st.nextAmb -= dt; st.nextCyc -= dt;
      if (st.nextCyc <= 0) { st.nextCyc = 25 + Math.random() * 20; st.cyclist = { x: -14, y: L.wallB + Math.round((L.trackY - L.wallB) * 0.8) }; }
      if (st.nextAmb <= 0) { st.nextAmb = 45 + Math.random() * 30; if (!st.trains.length) runTrain({ speedDur: 3.4 }); }
    }
    if (tod !== todTo) {
      tod += Math.sign(todTo - tod) * Math.min(Math.abs(todTo - tod), dt * 0.42);
      P = palAt(tod);
    }
    const moving = st.trains.length || st.cyclist || st.bar !== st.barTo || tod !== todTo;
    acc += dt;
    if (moving || acc > 0.1) { acc = 0; draw(); }
    requestAnimationFrame(loop);
  }

  function runTrain({ speedDur = 2.0, onMid, onStart } = {}) {
    return new Promise((resolve) => {
      st.alarm = true; st.barTo = 1;
      const len = trainLength(H);
      setTimeout(() => {
        if (onStart) onStart();
        st.trains.push({
          x: W + 2, len, v: (W + len + 6) / speedDur, onMid, mid: false,
          onEnd: () => { st.barTo = 0; setTimeout(() => { st.alarm = false; resolve(); }, 450); },
        });
      }, 650);
    });
  }

  // 换站：踏切响 → 栏杆放下 → 电车驶过（经过画面中央时换内容）→ 栏杆抬起
  function pass(onMid, hooks = {}) {
    if (reduce) { onMid(); return Promise.resolve(); }
    st.busy = true;
    st.trains = [];
    return runTrain({ speedDur: 1.9, onMid, onStart: hooks.onStart }).then(() => { st.busy = false; });
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);

  return {
    pass, reduce, drawTrain, trainLength, trainTop, isDark, lerpPal, mix,
    get scale() { return S; },
    get tod() { return tod; },
    get todTarget() { return todTo; },
    // 设定天色：instant 为 true 时立即切换，否则在几秒内慢慢过渡
    setTime(t, instant) { todTo = Math.max(0, Math.min(2, t)); if (instant) { tod = todTo; P = palAt(tod); draw(); } },
  };
})();
