// 4 · 抓小懒猫（打地鼠）
(window.HBD_MODULES = window.HBD_MODULES || {}).whack = {
  init(api) {
    this.api = api;
    const { $, C } = api;
    this.cfg = C.whack;
    this.seconds = Math.max(10, C.whack.seconds | 0 || 30);
    $('#whTime').textContent = this.seconds;
    const grid = $('#whack');
    this.holes = [];
    for (let i = 0; i < 9; i++) {
      const h = document.createElement('div');
      h.className = 'hole';
      h.innerHTML = '<div class="pit"><button type="button" class="mole" tabindex="-1" aria-label="打它"><img alt="" draggable="false"><span class="cake">🎂</span></button></div>';
      h.querySelector('img').src = C.whack.mole;
      h.querySelector('.mole').addEventListener('pointerdown', (e) => { e.preventDefault(); this.hit(h); });
      grid.appendChild(h);
      this.holes.push(h);
    }
    $('#whStart').addEventListener('click', () => this.start());
    $('#whAgain').addEventListener('click', () => { $('#whDone').hidden = true; this.start(); });
  },

  leave() { this.stop(false); },

  start() {
    const { $ } = this.api;
    this.api.sound.unlock();
    this.score = 0;
    this.left = this.seconds;
    this.running = true;
    this.t0 = performance.now();
    $('#whScore').textContent = 0;
    $('#whTime').textContent = this.left;
    $('#whStartWrap').hidden = true;
    $('#whDone').hidden = true;
    $('#whack').scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.clock = setInterval(() => {
      this.left = Math.max(0, this.seconds - Math.floor((performance.now() - this.t0) / 1000));
      $('#whTime').textContent = this.left;
      if (this.left <= 0) this.stop(true);
    }, 200);
    this.schedule(500);
  },

  schedule(ms) {
    this.popTimer = setTimeout(() => this.pop(), ms);
  },

  pop() {
    if (!this.running) return;
    const p = Math.min(1, (performance.now() - this.t0) / (this.seconds * 1000)); // 0→1 越来越快
    const free = this.holes.filter((h) => !h.classList.contains('is-up'));
    const count = p > 0.5 && Math.random() < 0.35 ? 2 : 1;
    for (let k = 0; k < count && free.length; k++) {
      const h = free.splice((Math.random() * free.length) | 0, 1)[0];
      h.dataset.type = Math.random() < 0.12 ? 'cake' : 'mole';
      h.classList.remove('is-hit');
      h.classList.add('is-up');
      const stay = 1150 - 500 * p + Math.random() * 250;
      h._down = setTimeout(() => h.classList.remove('is-up'), stay);
    }
    this.schedule(650 - 300 * p + Math.random() * 350);
  },

  hit(h) {
    if (!this.running || !h.classList.contains('is-up') || h.classList.contains('is-hit')) return;
    const cake = h.dataset.type === 'cake';
    this.score += cake ? 3 : 1;
    this.api.$('#whScore').textContent = this.score;
    h.classList.add('is-hit');
    clearTimeout(h._down);
    setTimeout(() => { h.classList.remove('is-up', 'is-hit'); }, 260);
    const lines = this.cfg.hitLines;
    const f = document.createElement('span');
    f.className = 'float';
    f.textContent = cake ? '蛋糕 +3' : lines[(Math.random() * lines.length) | 0];
    h.appendChild(f);
    setTimeout(() => f.remove(), 800);
    this.api.sound.blip(cake ? 84 : 64 + ((Math.random() * 8) | 0), 0.12);
  },

  stop(finished) {
    const { $ } = this.api;
    if (!this.running) return;
    this.running = false;
    clearInterval(this.clock);
    clearTimeout(this.popTimer);
    this.holes.forEach((h) => { clearTimeout(h._down); h.classList.remove('is-up', 'is-hit'); });
    if (!finished) { $('#whStartWrap').hidden = false; $('#whTime').textContent = this.seconds; return; }
    const r = this.cfg.results.slice().sort((a, b) => b.min - a.min).find((x) => this.score >= x.min);
    $('#whFinal').textContent = this.score;
    $('#whResult').textContent = this.api.fill(r ? r.text : '');
    $('#whDone').hidden = false;
    $('#whDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.api.confetti.burst(120);
    this.api.sound.chord([72, 76, 79]);
  },

  reset() {
    const { $ } = this.api;
    this.stop(false);
    $('#whDone').hidden = true;
    $('#whStartWrap').hidden = false;
    $('#whScore').textContent = 0;
  },
};
