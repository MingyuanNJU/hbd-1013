// 5 · 照片墙：云端（Supabase）优先；没配置或连不上时存到本机 IndexedDB，下次能连上会自动同步
(() => {
  // ---------- 本机存储 ----------
  const idb = (() => {
    let dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((res, rej) => {
        if (!window.indexedDB) { rej(new Error('no idb')); return; }
        const r = indexedDB.open('hbd-wall', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      return dbp;
    }
    function tx(mode, fn) {
      return open().then((db) => new Promise((res, rej) => {
        const t = db.transaction('photos', mode);
        const req = fn(t.objectStore('photos'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      }));
    }
    return {
      all: () => tx('readonly', (s) => s.getAll()).catch(() => []),
      add: (item) => tx('readwrite', (s) => s.add(item)),
      del: (id) => tx('readwrite', (s) => s.delete(id)),
    };
  })();

  // ---------- 压缩：长边 1600px，JPEG 0.85 ----------
  function compress(file, max = 1600, q = 0.85) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }

  function withTimeout(ms) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    return { signal: ac.signal, done: () => clearTimeout(t) };
  }

  (window.HBD_MODULES = window.HBD_MODULES || {}).wall = {
    init(api) {
      this.api = api;
      const { $, C } = api;
      const S = C.supabase || {};
      this.S = S;
      this.cloud = !!(S.url && S.anonKey);
      this.base = (S.url || '').replace(/\/+$/, '');
      this.cloudOk = this.cloud; // 乐观；第一次失败后改为 false
      this.n = 0;

      this.grid = $('#wall');
      this.staticFrag = document.createDocumentFragment();
      C.timeline.forEach((it) => this.staticFrag.appendChild(this.card(it.img, api.fill(it.place || ''), '')));
      this.grid.appendChild(this.staticFrag);

      const file = $('#wallFile');
      $('#wallAdd').addEventListener('click', () => file.click());
      file.addEventListener('change', () => { if (file.files.length) this.ask(Array.from(file.files)); file.value = ''; });
      $('#upCancel').addEventListener('click', () => this.closeModal());
      $('#upOk').addEventListener('click', () => this.submit());
    },

    enter() {
      if (this.loaded) return;
      this.loaded = true;
      this.load();
    },

    status(t) { this.api.$('#wallStatus').textContent = t || ''; },

    headers(extra) {
      const k = this.S.anonKey;
      return Object.assign({ apikey: k, Authorization: 'Bearer ' + k }, extra || {});
    },
    publicUrl(path) {
      return this.base + '/storage/v1/object/public/' + encodeURIComponent(this.S.bucket) + '/' + path.split('/').map(encodeURIComponent).join('/');
    },

    async fetchCloud() {
      const to = withTimeout(12000);
      try {
        const r = await fetch(this.base + '/rest/v1/' + this.S.table + '?select=id,path,caption,created_at&order=created_at.desc&limit=500',
          { headers: this.headers(), signal: to.signal });
        if (!r.ok) throw new Error('list ' + r.status);
        return await r.json();
      } finally { to.done(); }
    },

    async uploadCloud(blob, caption) {
      const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      const to = withTimeout(30000);
      try {
        const up = await fetch(this.base + '/storage/v1/object/' + encodeURIComponent(this.S.bucket) + '/' + path, {
          method: 'POST',
          headers: this.headers({ 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'cache-control': 'max-age=31536000' }),
          body: blob,
          signal: to.signal,
        });
        if (!up.ok) throw new Error('upload ' + up.status + ' ' + (await up.text()).slice(0, 200));
        const row = await fetch(this.base + '/rest/v1/' + this.S.table, {
          method: 'POST',
          headers: this.headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify({ path, caption: caption || null }),
          signal: to.signal,
        });
        if (!row.ok) throw new Error('insert ' + row.status + ' ' + (await row.text()).slice(0, 200));
        return path;
      } finally { to.done(); }
    },

    async load() {
      this.status('正在加载照片…');
      let local = await idb.all();
      let cloudRows = [];
      if (this.cloud) {
        try {
          cloudRows = await this.fetchCloud();
          this.cloudOk = true;
          // 之前存在本机的，现在补传到云端
          if (local.length) {
            for (const it of local) {
              try { await this.uploadCloud(it.blob, it.caption); await idb.del(it.id); } catch (e) { console.warn(e); break; }
            }
            local = await idb.all();
            cloudRows = await this.fetchCloud();
          }
        } catch (e) {
          console.warn('cloud unavailable', e);
          this.cloudOk = false;
        }
      }
      const items = cloudRows.map((r) => ({ src: this.publicUrl(r.path), cap: r.caption || '', t: Date.parse(r.created_at) || 0, tag: '' }))
        .concat(local.map((it) => ({ src: URL.createObjectURL(it.blob), cap: it.caption || '', t: it.created_at || 0, tag: '仅本机' })))
        .sort((a, b) => b.t - a.t);
      const first = this.grid.firstChild;
      items.forEach((it) => this.grid.insertBefore(this.card(it.src, it.cap, it.tag), first));
      this.status(this.modeNote());
    },

    modeNote() {
      if (!this.cloud) return '照片暂存在这台设备上';
      if (!this.cloudOk) return '暂时连不上云端，新照片会先存在这台设备上，之后自动同步';
      return '';
    },

    card(src, cap, tag) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'polaroid';
      const rot = ((this.n++ * 37) % 7) - 3; // -3° ~ 3°
      b.style.setProperty('--rot', (rot * 0.8).toFixed(1) + 'deg');
      b.innerHTML = '<img loading="lazy" decoding="async" alt=""><div class="polaroid__cap"></div>';
      const img = b.querySelector('img');
      img.src = src; img.alt = cap || tag || '照片';
      const c = b.querySelector('.polaroid__cap');
      c.textContent = cap || '';
      if (tag) {
        const t = document.createElement('span');
        t.className = 'polaroid__tag';
        t.textContent = (cap ? ' · ' : '') + tag;
        c.appendChild(t);
      }
      b.addEventListener('click', () => this.api.lightbox.open(src, cap || tag));
      return b;
    },

    ask(files) {
      const { $ } = this.api;
      this.pending = files.slice(0, 20);
      const box = $('#upThumbs');
      box.innerHTML = '';
      this.thumbUrls = this.pending.map((f) => URL.createObjectURL(f));
      this.thumbUrls.forEach((u) => { const i = document.createElement('img'); i.src = u; i.alt = ''; box.appendChild(i); });
      $('#upCaption').value = '';
      $('#upModal').hidden = false;
      setTimeout(() => $('#upCaption').focus(), 50);
    },

    closeModal() {
      this.api.$('#upModal').hidden = true;
      (this.thumbUrls || []).forEach((u) => URL.revokeObjectURL(u));
      this.thumbUrls = [];
    },

    async submit() {
      const { $ } = this.api;
      const files = this.pending || [];
      const caption = $('#upCaption').value.trim().slice(0, 200);
      this.closeModal();
      if (!files.length) return;
      $('#wallAdd').disabled = true;
      let ok = 0, bad = 0;
      for (let i = 0; i < files.length; i++) {
        this.status('正在贴第 ' + (i + 1) + ' / ' + files.length + ' 张…');
        let blob;
        try { blob = await compress(files[i]); } catch (e) { bad++; continue; }
        let src, tag = '';
        if (this.cloud && this.cloudOk) {
          try {
            const path = await this.uploadCloud(blob, caption);
            src = this.publicUrl(path);
          } catch (e) {
            console.warn('upload failed', e);
            this.cloudOk = false;
          }
        }
        if (!src) {
          try { await idb.add({ blob, caption, created_at: Date.now() }); } catch (e) { /* 无痕模式：只在这次显示 */ }
          src = URL.createObjectURL(blob);
          tag = '仅本机';
        }
        const card = this.card(src, caption, tag);
        card.classList.add('is-new');
        this.grid.insertBefore(card, this.grid.firstChild);
        ok++;
      }
      $('#wallAdd').disabled = false;
      const msg = ok ? '贴好啦！' : '';
      const err = bad ? bad + ' 张照片格式打不开，换一张试试？' : '';
      this.status([msg, err, this.modeNote()].filter(Boolean).join(' '));
      if (ok) {
        this.api.confetti.burst(90, { hearts: true, y: 160 });
        this.api.sound.chord([76, 79, 84]);
        this.grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  };
})();
