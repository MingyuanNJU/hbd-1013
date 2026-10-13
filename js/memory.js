// 3 · 回忆翻牌
(window.HBD_MODULES = window.HBD_MODULES || {}).memory = {
  init(api) {
    this.api = api;
    this.photos = api.C.memory.photos.slice(0, 8);
    api.$('#memTotal').textContent = this.photos.length;
    api.$('#memReset').addEventListener('click', () => this.build());
    this.build();
  },

  build() {
    const { $ } = this.api;
    const deck = this.photos.concat(this.photos);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const grid = $('#memory');
    grid.innerHTML = '';
    this.moves = 0; this.pairs = 0; this.first = null; this.lock = false;
    deck.forEach((src, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mcard';
      b.dataset.key = src;
      b.setAttribute('aria-label', '第 ' + (k + 1) + ' 张牌');
      b.innerHTML = '<span class="mcard__face mcard__back">♥</span><span class="mcard__face mcard__front"><img alt=""></span>';
      b.querySelector('img').src = src;
      b.addEventListener('click', () => this.flip(b));
      grid.appendChild(b);
    });
    this.paint();
    $('#memDone').hidden = true;
  },

  paint() {
    this.api.$('#memMoves').textContent = this.moves;
    this.api.$('#memPairs').textContent = this.pairs;
  },

  flip(card) {
    if (this.lock || card.classList.contains('is-open') || card.classList.contains('is-done')) return;
    card.classList.add('is-open');
    this.api.sound.blip(72, 0.1);
    if (!this.first) { this.first = card; return; }
    const a = this.first;
    this.first = null;
    this.moves++;
    if (a.dataset.key === card.dataset.key) {
      [a, card].forEach((c) => { c.classList.remove('is-open'); c.classList.add('is-done'); });
      this.pairs++;
      this.api.sound.chord([76, 79, 84]);
      if (this.pairs === this.photos.length) this.finish();
    } else {
      this.lock = true;
      setTimeout(() => { a.classList.remove('is-open'); card.classList.remove('is-open'); this.lock = false; }, 850);
    }
    this.paint();
  },

  finish() {
    const { $ } = this.api;
    setTimeout(() => {
      $('#memDone').hidden = false;
      this.api.confetti.burst(140, { hearts: true });
      $('#memDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  },

  reset() { this.build(); },
};
