// 4 · 打小猪（打地鼠玩法）
(() => {
  const PIG =
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<ellipse cx="21" cy="26" rx="12" ry="15" fill="#F48DA6" transform="rotate(-28 21 26)"/>' +
    '<ellipse cx="79" cy="26" rx="12" ry="15" fill="#F48DA6" transform="rotate(28 79 26)"/>' +
    '<ellipse cx="21" cy="28" rx="6" ry="8" fill="#E36E8C" transform="rotate(-28 21 28)"/>' +
    '<ellipse cx="79" cy="28" rx="6" ry="8" fill="#E36E8C" transform="rotate(28 79 28)"/>' +
    '<circle cx="50" cy="58" r="38" fill="#FFC2D1"/>' +
    '<ellipse cx="50" cy="40" rx="20" ry="10" fill="#FFD6E0" opacity=".7"/>' +
    '<g class="pig__eyes"><circle cx="35" cy="50" r="5.2" fill="#3A2530"/><circle cx="65" cy="50" r="5.2" fill="#3A2530"/>' +
    '<circle cx="36.8" cy="48.2" r="1.8" fill="#fff"/><circle cx="66.8" cy="48.2" r="1.8" fill="#fff"/></g>' +
    '<g class="pig__ouch" stroke="#3A2530" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
    '<path d="M29 45 L39 50 L29 55"/><path d="M71 45 L61 50 L71 55"/></g>' +
    '<circle cx="25" cy="66" r="6.5" fill="#FF8DA8" opacity=".55"/><circle cx="75" cy="66" r="6.5" fill="#FF8DA8" opacity=".55"/>' +
    '<ellipse cx="50" cy="68" rx="15" ry="11" fill="#F48DA6"/>' +
    '<ellipse cx="44.5" cy="68" rx="3" ry="4.6" fill="#B04F69"/><ellipse cx="55.5" cy="68" rx="3" ry="4.6" fill="#B04F69"/>' +
    '<path d="M44 84 Q50 88 56 84" stroke="#B04F69" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  (window.HBD_MODULES = window.HBD_MODULES || {}).whack = {
    init(api) {
      this.api = api;
      const { $, C } = api;
      this.cfg = C.whack;
      this.seconds = Math.max(10, C.whack.seconds | 0 || 30);
      $('#whTime').textContent = this.seconds;
      const face = C.whack.moleImage ? '<img alt="" draggable="false">' : PIG;
      const grid = $('#whack');
      this.holes = [];
      for (let i = 0; i < 9; i++) {
        const h = document.createElement('div');
        h.className = 'hole';
        h.innerHTML = '<div class="pit"><button type="button" class="mole" tabindex="-1" aria-label="打它">' + face + '<span class="cake">🎂</span></button></div>';
        if (C.whack.moleImage) h.querySelector('img').src = C.whack.moleImage;
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
      this.popTimer = setTimeout(() => this.pop(), 500);
    },

    pop() {
      if (!this.running) return;
      const p = Math.min(1, (performance.now() - this.t0) / (this.seconds * 1000)); // 越来越快
      const free = this.holes.filter((h) => !h.classList.contains('is-up'));
      const count = p > 0.5 && Math.random() < 0.35 ? 2 : 1;
      for (let k = 0; k < count && free.length; k++) {
        const h = free.splice((Math.random() * free.length) | 0, 1)[0];
        h.dataset.type = Math.random() < 0.12 ? 'cake' : 'pig';
        h.classList.remove('is-hit');
        h.classList.add('is-up');
        const stay = 1150 - 500 * p + Math.random() * 250;
        h._down = setTimeout(() => h.classList.remove('is-up'), stay);
      }
      this.popTimer = setTimeout(() => this.pop(), 650 - 300 * p + Math.random() * 350);
    },

    hit(h) {
      if (!this.running || !h.classList.contains('is-up') || h.classList.contains('is-hit')) return;
      const cake = h.dataset.type === 'cake';
      this.score += cake ? 3 : 1;
      this.api.$('#whScore').textContent = this.score;
      h.classList.add('is-hit');
      clearTimeout(h._down);
      setTimeout(() => h.classList.remove('is-up', 'is-hit'), 260);
      const lines = this.cfg.hitLines;
      const f = document.createElement('span');
      f.className = 'float';
      f.textContent = this.api.fill(cake ? this.cfg.cakeText : lines[(Math.random() * lines.length) | 0]);
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
})();
