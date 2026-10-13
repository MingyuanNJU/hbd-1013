// 4 · 打小猪（打地鼠玩法）
(() => {
  // 默认：你的像素头像 + 猪鼻子猪耳朵（assets/img/pig.png，被打中换 pig-hit.png）
  const PIG = 'assets/img/pig.png', PIG_HIT = 'assets/img/pig-hit.png', CAKE = 'assets/img/cake.png';

  (window.HBD_MODULES = window.HBD_MODULES || {}).whack = {
    init(api) {
      this.api = api;
      const { $, C } = api;
      this.cfg = C.whack;
      this.seconds = Math.max(10, C.whack.seconds | 0 || 30);
      $('#whTime').textContent = this.seconds;
      const face = C.whack.moleImage || PIG, faceHit = C.whack.moleImage || PIG_HIT;
      const grid = $('#whack');
      this.holes = [];
      for (let i = 0; i < 9; i++) {
        const h = document.createElement('div');
        h.className = 'hole';
        h.innerHTML = '<div class="hole__back"></div><div class="hole__clip"><button type="button" class="mole" tabindex="-1" aria-label="打它">' +
          '<img class="pig" alt="" draggable="false"><img class="pig--hit" alt="" draggable="false"><img class="cake-img" alt="" draggable="false"></button></div><div class="hole__front"></div>';
        const [a, b, c] = h.querySelectorAll('img');
        a.src = face; b.src = faceHit; c.src = CAKE;
        h.querySelector('.mole').addEventListener('pointerdown', (e) => { e.preventDefault(); this.hit(h); });
        grid.appendChild(h);
        this.holes.push(h);
      }
      // 玩具锤：电脑上跟着鼠标，手机上点哪儿砸哪儿
      const hammer = document.createElement('div');
      hammer.className = 'hammer';
      hammer.setAttribute('aria-hidden', 'true');
      grid.appendChild(hammer);
      const place = (e) => {
        const r = grid.getBoundingClientRect();
        hammer.style.left = Math.round(e.clientX - r.left) + 'px';
        hammer.style.top = Math.round(e.clientY - r.top) + 'px';
      };
      grid.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { place(e); hammer.classList.add('is-hover'); } });
      grid.addEventListener('pointerleave', () => hammer.classList.remove('is-hover'));
      grid.addEventListener('pointerdown', (e) => {
        place(e);
        hammer.classList.remove('is-swing'); void hammer.offsetWidth; hammer.classList.add('is-swing');
        clearTimeout(this.hamT);
        this.hamT = setTimeout(() => hammer.classList.remove('is-swing'), 420);
        const pow = document.createElement('i');
        pow.className = 'pow';
        pow.style.left = hammer.style.left; pow.style.top = hammer.style.top;
        grid.appendChild(pow);
        setTimeout(() => pow.remove(), 450);
        this.api.sound.whoosh();
      });
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
      h.classList.add('is-hit', 'is-bonk');
      setTimeout(() => h.classList.remove('is-bonk'), 300);
      clearTimeout(h._down);
      setTimeout(() => h.classList.remove('is-up', 'is-hit'), 260);
      const lines = this.cfg.hitLines;
      const f = document.createElement('span');
      f.className = 'float';
      f.textContent = this.api.fill(cake ? this.cfg.cakeText : lines[(Math.random() * lines.length) | 0]);
      h.appendChild(f);
      setTimeout(() => f.remove(), 800);
      this.api.sound.squeak(cake);
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
