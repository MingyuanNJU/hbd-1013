// 湘南海岸场景：海浪、背景小电车、换站时整屏驶过的江之电
window.HBD_SCENE = (() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- 海浪：按元素高度生成振幅一致的波形 ----------
  function wavePath(period, amp) {
    const base = amp + 6;
    let d = 'M0 ' + base;
    for (let x = 0; x < 1600; x += period) {
      d += ' Q' + (x + period / 4) + ' ' + (base - amp) + ' ' + (x + period / 2) + ' ' + base +
           ' Q' + (x + period * 3 / 4) + ' ' + (base + amp) + ' ' + (x + period) + ' ' + base;
    }
    return d + ' V1000 H0 Z';
  }
  const WAVES = [[200, 34], [160, 52], [100, 95]];
  document.querySelectorAll('.scene .wave').forEach((svg, i) => {
    const [p, a] = WAVES[i] || WAVES[0];
    svg.setAttribute('viewBox', '0 0 1600 1000');
    svg.querySelector('path').setAttribute('d', wavePath(p, a));
  });

  // ---------- 电车 SVG（车头朝左，向左行驶） ----------
  const CAR = 2400, GAP = 70, NOSE = 170, H = 1000;
  function trainSVG({ cars = 2, sign = '', dest = '', id = 't' } = {}) {
    const W = NOSE + cars * CAR + (cars - 1) * GAP + 40;
    const p = [];
    p.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible">');
    p.push('<defs>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8E8"/><stop offset=".55" stop-color="#F4E8CC"/><stop offset="1" stop-color="#E2D2AE"/></linearGradient>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B6FA6"/><stop offset=".5" stop-color="#1B3556"/><stop offset="1" stop-color="#0C1A2C"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + id + 'h" cx="1" cy=".5" r="1"><stop offset="0" stop-color="#FFF6C8" stop-opacity=".95"/><stop offset=".25" stop-color="#FFF1B0" stop-opacity=".35"/><stop offset="1" stop-color="#FFF1B0" stop-opacity="0"/></radialGradient>' +
      '</defs>');
    // 车头灯打在前方的光
    p.push('<ellipse cx="-260" cy="700" rx="620" ry="260" fill="url(#' + id + 'h)"/>');

    function windowPane(x, y, w, h) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="20" fill="url(#' + id + 'g)"/>' +
             '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="20" fill="url(#' + id + 'r)"/>';
    }

    for (let c = 0; c < cars; c++) {
      const x0 = NOSE + c * (CAR + GAP);
      const last = c === cars - 1;
      // 车顶 + 空调
      p.push('<rect x="' + (x0 + 30) + '" y="74" width="' + (CAR - 60) + '" height="70" rx="34" fill="#8E99A6"/>');
      p.push('<rect x="' + (x0 + CAR * 0.28) + '" y="30" width="320" height="58" rx="14" fill="#B9C2CC"/>');
      p.push('<rect x="' + (x0 + CAR * 0.62) + '" y="30" width="320" height="58" rx="14" fill="#B9C2CC"/>');
      if (c === 0) { // 集电弓
        p.push('<path d="M' + (x0 + 520) + ' 74 L' + (x0 + 640) + ' -60 L' + (x0 + 760) + ' 74 M' + (x0 + 560) + ' -60 H' + (x0 + 720) + '" stroke="#4A525C" stroke-width="12" fill="none"/>');
      }
      // 车身
      p.push('<rect x="' + x0 + '" y="112" width="' + CAR + '" height="756" rx="' + (last ? 70 : 24) + '" fill="url(#' + id + 'b)"/>');
      // 腰线
      p.push('<rect class="tb" x="' + x0 + '" y="262" width="' + CAR + '" height="18" fill="#1F5FAF"/>');
      p.push('<rect class="tb" x="' + x0 + '" y="610" width="' + CAR + '" height="62" fill="#1F5FAF"/>');
      // 车门与车窗
      const doors = [0.13, 0.5, 0.87].map((f) => x0 + CAR * f - 115);
      doors.forEach((dx) => {
        p.push('<rect x="' + dx + '" y="196" width="230" height="664" rx="14" fill="#FBF3E0" stroke="#CDBB92" stroke-width="8"/>');
        p.push(windowPane(dx + 26, 290, 74, 290) + windowPane(dx + 130, 290, 74, 290));
        p.push('<line x1="' + (dx + 115) + '" y1="200" x2="' + (dx + 115) + '" y2="856" stroke="#CDBB92" stroke-width="6"/>');
      });
      const bounds = [x0 + 40].concat(doors.flatMap((dx) => [dx - 30, dx + 260])).concat([x0 + CAR - 40]);
      for (let k = 0; k < bounds.length; k += 2) {
        const a = bounds[k], b = bounds[k + 1];
        const n = Math.max(1, Math.round((b - a) / 330));
        const w = (b - a - (n - 1) * 36) / n;
        for (let j = 0; j < n; j++) p.push(windowPane(a + j * (w + 36), 310, w, 250));
      }
      // 行先牌
      if (sign || dest) {
        const sx = x0 + CAR * 0.3;
        p.push('<rect x="' + sx + '" y="160" width="560" height="84" rx="10" fill="#0B0F14"/>');
        p.push('<text x="' + (sx + 280) + '" y="219" text-anchor="middle" font-size="52" font-weight="700" fill="#FFB21E" font-family="PingFang SC, Hiragino Sans GB, sans-serif">' + esc(sign + '  ' + dest) + '</text>');
      }
      p.push('<text x="' + (x0 + CAR - 230) + '" y="820" font-size="44" font-weight="700" fill="#1F5FAF" class="tb-t" font-family="Helvetica, Arial, sans-serif">10' + (13 + c) + '</text>');
      // 裙板 + 转向架 + 车轮
      p.push('<rect x="' + (x0 + 10) + '" y="856" width="' + (CAR - 20) + '" height="40" rx="10" fill="#38404A"/>');
      [0.2, 0.8].forEach((f) => {
        const bx = x0 + CAR * f;
        p.push('<rect x="' + (bx - 250) + '" y="880" width="500" height="72" rx="16" fill="#262B32"/>');
        p.push('<circle cx="' + (bx - 140) + '" cy="950" r="48" fill="#17191D" stroke="#5B636D" stroke-width="9"/>');
        p.push('<circle cx="' + (bx + 140) + '" cy="950" r="48" fill="#17191D" stroke="#5B636D" stroke-width="9"/>');
      });
      // 贯通道
      if (!last) p.push('<rect x="' + (x0 + CAR - 4) + '" y="200" width="' + (GAP + 8) + '" height="640" fill="#2B3139"/>');
      if (last) p.push('<circle cx="' + (x0 + CAR - 40) + '" cy="720" r="20" fill="#E8333B"/>');
    }
    // 车头
    const n = NOSE + 80;
    p.push('<path d="M' + n + ' 112 L130 112 Q36 130 22 380 L12 800 Q14 866 96 868 L' + n + ' 868 Z" fill="url(#' + id + 'b)"/>');
    p.push('<path class="tb" d="M16 610 H' + n + ' V672 H14 Z" fill="#1F5FAF"/>');
    p.push('<path d="M130 172 Q62 190 50 380 L46 560 L168 560 L168 172 Z" fill="url(#' + id + 'g)"/><path d="M130 172 Q62 190 50 380 L46 560 L168 560 L168 172 Z" fill="url(#' + id + 'r)"/>');
    p.push('<circle cx="50" cy="740" r="26" fill="#FFF7CF"/><circle cx="50" cy="740" r="44" fill="#FFF3B5" opacity=".35"/>');
    p.push('<rect x="10" y="852" width="' + n + '" height="40" rx="10" fill="#38404A"/>');
    p.push('</svg>');
    return { svg: p.join(''), aspect: W / H, nose: NOSE };
  }

  // ---------- 换站：整屏驶过 ----------
  let big = null;
  function prepare(sign, dest) { big = trainSVG({ cars: 2, sign, dest, id: 'bt' }); document.getElementById('passTrain').innerHTML = big.svg; }

  function pass(onMid) {
    return new Promise((resolve) => {
      const box = document.getElementById('pass');
      const tr = document.getElementById('passTrain');
      if (reduce || !tr.animate || !big) { onMid(); resolve(); return; }
      const vw = window.innerWidth, vh = window.innerHeight;
      const h = Math.min(vh * 0.62, vw * 1.1), w = h * big.aspect, top = (vh - h) / 2 + vh * 0.04;
      tr.style.width = w + 'px';
      tr.style.height = h + 'px';
      tr.style.top = top + 'px';
      document.getElementById('passRail').style.top = (top + h * 0.99) + 'px';
      box.hidden = false;
      box.classList.add('is-on');
      const dur = 1700;
      const bg = document.getElementById('passBg').animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.16 }, { opacity: 1, offset: 0.82 }, { opacity: 0 }],
        { duration: dur, fill: 'forwards' }
      );
      const anim = tr.animate(
        [{ transform: 'translateX(' + (vw + 60) + 'px)' }, { transform: 'translateX(' + (-w - 80) + 'px)' }],
        { duration: dur, easing: 'linear', fill: 'forwards' }
      );
      let mid = false;
      const doMid = () => { if (!mid) { mid = true; onMid(); } };
      setTimeout(doMid, dur / 2);
      anim.finished.then(() => {
        doMid();
        box.hidden = true;
        box.classList.remove('is-on');
        anim.cancel();
        bg.cancel();
        resolve();
      });
    });
  }

  // ---------- 背景里偶尔开过的小电车 ----------
  function ambient(sign, dest) {
    const el = document.getElementById('miniTrain');
    if (!el || reduce || !el.animate) return;
    const small = trainSVG({ cars: 2, sign, dest, id: 'mt' });
    el.innerHTML = small.svg;
    const hh = 46, ww = hh * small.aspect;
    el.style.width = ww + 'px';
    el.style.height = hh + 'px';
    const run = () => {
      if (document.hidden) { setTimeout(run, 4000); return; }
      const vw = window.innerWidth;
      el.animate(
        [{ transform: 'translateX(' + (vw + 20) + 'px)' }, { transform: 'translateX(' + (-ww - 20) + 'px)' }],
        { duration: 7000 + ww * 4, easing: 'linear', fill: 'forwards' }
      ).finished.then(() => setTimeout(run, 14000 + Math.random() * 12000));
    };
    setTimeout(run, 2500);
  }

  return { prepare, pass, ambient, reduce };
})();
