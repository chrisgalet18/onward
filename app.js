/* Onward — application web (PWA). Données stockées localement (localStorage), sans serveur. */
(() => {
  'use strict';

  const KEY = 'onward.v1';
  const CATS = [
    ['v', 'Voyage', '#3f7fa6'], ['fa', 'Famille', '#5f9e6e'], ['t', 'Travail', '#7a5aa6'],
    ['s', 'Santé', '#c94f4f'], ['e', 'Études', '#f0c94a'], ['l', 'Amitié', '#d4608f'],
    ['k', 'Projet', '#2f9c9a'], ['a', 'Autre', '#5b4f47'],
  ];
  const CAT = {};
  CATS.forEach(([k, n, c]) => { CAT[k] = { n, c }; });

  const YEARS = 90;
  const WPY = 52;
  const TOTAL = YEARS * WPY;
  const DAY = 864e5;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Données ---------- */
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && typeof d === 'object') {
        return { profile: d.profile || null, moments: Array.isArray(d.moments) ? d.moments : [] };
      }
    } catch (e) { /* stockage illisible : on repart de zéro */ }
    return { profile: null, moments: [] };
  }
  let data = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      toast('Impossible d’enregistrer sur cet appareil.');
      return false;
    }
  }

  /* ---------- Dates et semaines ---------- */
  function localDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function isoOf(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function birth() { return localDate(data.profile.birth); }
  function dayDiff(a, b) { return Math.round((b - a) / DAY); }
  function weekIdxOf(d) { return Math.floor(dayDiff(birth(), d) / 7); }
  function todayIdx() { const t = new Date(); t.setHours(0, 0, 0, 0); return weekIdxOf(t); }
  function weekStart(idx) { const b = birth(); return new Date(b.getFullYear(), b.getMonth(), b.getDate() + idx * 7); }
  function fmtDate(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  function momentsByWeek() {
    const m = new Map();
    data.moments.forEach((x) => {
      const i = weekIdxOf(localDate(x.date));
      if (!m.has(i)) m.set(i, []);
      m.get(i).push(x);
    });
    return m;
  }

  function cellAttrs(idx, now, map) {
    const list = map.get(idx);
    if (list && list.length) {
      const plan = idx > now ? ' plan' : '';
      return { cls: `cat${plan}`, style: `--c:${CAT[list[0].cat].c}` };
    }
    if (idx === now) return { cls: 'now', style: '' };
    return { cls: idx < now ? 'past' : 'future', style: '' };
  }

  /* ---------- Vues ---------- */
  const ui = { tab: 'vie', level: 'dec', dec: 0, age: 0, week: 0, sheetCat: null };

  function initUi() {
    const now = todayIdx();
    ui.age = clamp(Math.floor(now / WPY), 0, YEARS - 1);
    ui.week = clamp(now % WPY, 0, WPY - 1);
    ui.dec = Math.floor(ui.age / 10);
  }

  function renderCrumb() {
    const lo = ui.dec * 10;
    const el = $('#crumb');
    if (ui.level === 'dec') el.innerHTML = '<span>Vie</span>';
    else if (ui.level === 'year') el.innerHTML = `<button type="button" data-action="level" data-level="dec">Vie</button> › <span>${lo}–${lo + 9} ans</span>`;
    else el.innerHTML = `<button type="button" data-action="level" data-level="dec">Vie</button> › <button type="button" data-action="level" data-level="year">${lo}–${lo + 9} ans</button> › <span>Âge ${ui.age}</span>`;
  }

  function renderContent() {
    const now = todayIdx();
    const map = momentsByWeek();
    const el = $('#content');
    let html = '';

    if (ui.level === 'dec') {
      for (let d = 0; d < YEARS / 10; d++) {
        const lo = d * 10 * WPY;
        const hi = lo + 10 * WPY;
        const lived = clamp(now, lo, hi) - lo;
        const pct = Math.round((lived / (10 * WPY)) * 100);
        const counts = {};
        CATS.forEach(([k]) => { counts[k] = 0; });
        let total = 0;
        map.forEach((list, idx) => {
          if (idx >= lo && idx < hi && idx < now) { const k = list[0].cat; counts[k]++; total++; }
        });
        let segs = '';
        CATS.forEach(([k, , c]) => { if (counts[k]) segs += `<i style="flex:${counts[k]};background:${c}"></i>`; });
        if (!segs) segs = `<i style="flex:1;background:${lived > 0 ? 'var(--ink)' : 'var(--future)'}"></i>`;
        html += `<button type="button" class="dec" data-action="dec" data-dec="${d}">
          <span class="dl"><b>${d * 10}–${d * 10 + 9} ans</b><span>${lived > 0 ? pct + ' % vécu' : 'à venir'}</span></span>
          <span class="bar">${segs}</span></button>`;
      }
      el.className = 'content' + (el.classList.contains('in') ? ' in' : '') + ' grow-in';
    } else if (ui.level === 'year') {
      for (let a = ui.dec * 10; a < ui.dec * 10 + 10; a++) {
        let cells = '';
        for (let w = 0; w < WPY; w++) {
          const at = cellAttrs(a * WPY + w, now, map);
          cells += `<i class="cell ${at.cls}" style="${at.style}"></i>`;
        }
        html += `<button type="button" class="yr" data-action="year" data-age="${a}"><b>Âge ${a}</b><span class="strip">${cells}</span></button>`;
      }
      el.className = 'content';
    } else {
      html = '<div class="wgrid">';
      for (let w = 0; w < WPY; w++) {
        const at = cellAttrs(ui.age * WPY + w, now, map);
        const sel = w === ui.week ? ' sel' : '';
        html += `<button type="button" class="cell ${at.cls}${sel}" style="${at.style}" data-action="week" data-w="${w}" aria-label="Semaine ${w + 1}, âge ${ui.age}"></button>`;
      }
      html += '</div>';
      el.className = 'content';
    }
    el.innerHTML = html;
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    if (ui.level === 'dec') {
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('grow-in')));
    }
    renderInfo();
  }

  function renderInfo() {
    const info = $('#info');
    if (ui.level === 'dec') { info.innerHTML = 'Touchez une décennie pour voir ses années.'; return; }
    if (ui.level === 'year') { info.innerHTML = 'Touchez une année pour voir ses semaines.'; return; }

    const idx = ui.age * WPY + ui.week;
    const now = todayIdx();
    const start = weekStart(idx);
    const list = (momentsByWeek().get(idx) || []);
    const state = idx < now ? 'Semaine vécue' : idx === now ? 'Cette semaine' : 'Semaine à venir';
    let html = `<b>${state}</b> · du ${fmtDate(start)}`;
    if (list.length) {
      html += '<ul>' + list.map((m) => `<li>${esc(m.title)} <span style="color:var(--brown)">· ${CAT[m.cat].n}</span></li>`).join('') + '</ul>';
    } else {
      html += '<br>Aucun moment noté pour cette semaine.';
    }
    info.innerHTML = html;
  }

  function renderAna() {
    const now = todayIdx();
    const counts = {};
    CATS.forEach(([k]) => { counts[k] = 0; });
    data.moments.forEach((m) => { counts[m.cat]++; });
    const total = data.moments.length;
    const sorted = CATS.slice().sort((a, b) => counts[b[0]] - counts[a[0]]);
    const dom = total && counts[sorted[0][0]] > 0 ? sorted[0] : null;

    $('#k-weeks').textContent = Math.max(0, Math.min(now, TOTAL)).toLocaleString('fr-FR');
    $('#k-moments').textContent = total.toLocaleString('fr-FR');
    $('#k-dom').textContent = dom ? dom[1] : '—';

    const max = Math.max(1, ...CATS.map(([k]) => counts[k]));
    $('#crows').innerHTML = CATS.map(([k, n, c]) =>
      `<div class="crow"><span class="cn">${n}</span><span class="ctrack"><i data-p="${Math.round(counts[k] / max * 100)}" style="background:${c}"></i></span><b>${counts[k]}</b></div>`
    ).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.ctrack i').forEach((i) => { i.style.width = i.dataset.p + '%'; })));

    const planned = data.moments.filter((m) => weekIdxOf(localDate(m.date)) >= now).length;
    $('#insight').textContent = total === 0
      ? 'Ajoutez un premier moment pour voir apparaître vos tendances.'
      : `Vous avez noté ${total} moment${total > 1 ? 's' : ''}. ${dom ? `La catégorie la plus présente est « ${dom[1]} ».` : ''} ${planned ? `${planned} moment${planned > 1 ? 's sont' : ' est'} déjà prévu${planned > 1 ? 's' : ''} dans le futur.` : ''}`.trim();

    const list = data.moments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
    $('#mlist').innerHTML = list.length ? list.map((m) => `
      <li><span class="sw" style="background:${CAT[m.cat].c}"></span>
        <span class="tx"><b>${esc(m.title)}</b><span>${CAT[m.cat].n} · ${fmtDate(localDate(m.date))}</span></span>
        <button type="button" class="att-btn" data-action="att" data-id="${esc(m.id)}" aria-label="Pièces jointes de ${esc(m.title)}">📎 ${(m.attachments || []).length}</button>
        <button type="button" class="del" data-action="del" data-id="${esc(m.id)}" aria-label="Supprimer ${esc(m.title)}">Supprimer</button></li>`).join('')
      : '<p class="empty">Aucun moment pour le moment.</p>';
  }

  function renderPro() {
    const p = data.profile;
    $('#avatar').textContent = p ? p.name.trim().charAt(0).toUpperCase() : '·';
    $('#p-name').textContent = p ? p.name : '—';
    $('#p-birth').textContent = p ? fmtDate(birth()) : '—';
    $('#p-weeks').textContent = Math.max(0, todayIdx()).toLocaleString('fr-FR');
    $('#p-count').textContent = data.moments.length.toLocaleString('fr-FR');
  }

  function renderAll() {
    renderCrumb();
    renderContent();
    renderAna();
    renderPro();
    $$('.seg button').forEach((b) => b.setAttribute('aria-selected', b.dataset.level === ui.level ? 'true' : 'false'));
  }

  /* ---------- Navigation ---------- */
  function showScreen(id) {
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  }

  function setTab(t) {
    ui.tab = t;
    $$('.view').forEach((v) => v.classList.toggle('on', v.id === 'view-' + t));
    $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    if (t === 'ana') renderAna();
    if (t === 'pro') renderPro();
  }

  function setLevel(l) {
    ui.level = l;
    renderAll();
  }

  /* ---------- Feuille d'ajout ---------- */
  function openSheet(dateIso) {
    const p = data.profile;
    const d = $('#mDate');
    d.min = p.birth;
    d.max = isoOf(new Date(birth().getFullYear() + 110, birth().getMonth(), birth().getDate()));
    d.value = dateIso || isoOf(new Date());
    $('#mTitle').value = '';
    ui.sheetCat = null;
    $$('.chip').forEach((c) => c.classList.remove('sel'));
    $('#shErr').textContent = '';
    $('#scrim').classList.add('on');
    $('#sheet').classList.add('on');
  }

  function closeSheet() {
    $('#scrim').classList.remove('on');
    $('#sheet').classList.remove('on');
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
  }

  function saveMoment(e) {
    e.preventDefault();
    const title = $('#mTitle').value.trim();
    const date = $('#mDate').value;
    const err = $('#shErr');
    if (!title) { err.textContent = 'Donnez un titre à ce moment.'; return; }
    if (!ui.sheetCat) { err.textContent = 'Choisissez une catégorie.'; return; }
    if (!date || date < data.profile.birth) { err.textContent = 'Choisissez une date après votre naissance.'; return; }
    const moment = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title, cat: ui.sheetCat, date };
    data.moments.push(moment);
    if (!save()) { data.moments.pop(); return; }
    closeSheet();
    const idx = weekIdxOf(localDate(date));
    if (idx >= 0 && idx < TOTAL) {
      ui.age = Math.floor(idx / WPY); ui.week = idx % WPY; ui.dec = Math.floor(ui.age / 10);
    }
    renderAll();
    toast('Moment enregistré.');
  }

  /* ---------- Pièces jointes Google Drive ---------- */
  let attId = null;

  function attItemHtml(a) {
    const isPhoto = a.local && a.type === 'Photo';
    const thumb = isPhoto
      ? `<img class="att-img" data-fid="${esc(a.fid)}" alt="Photo : ${esc(a.name)}">`
      : `<span class="att-k">${esc(a.type)}</span>`;
    const label = a.local
      ? `<span class="att-n">${esc(a.name)}</span>`
      : `<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`;
    return `<div class="att">${thumb}${label}<button type="button" class="att-x" data-att-del="${esc(a.id)}" aria-label="Retirer ${esc(a.name)}">✕</button></div>`;
  }

  function attHtml(m) {
    const list = m.attachments || [];
    const ok = window.OnwardDrive && OnwardDrive.isConfigured();
    return `
      <div class="att-list">${list.length ? list.map(attItemHtml).join('') : '<p class="att-empty">Aucun fichier joint. Prenez une photo ou ajoutez un document à ce moment.</p>'}</div>
      <div class="att-add">
        <div class="att-src">
          <label class="btn-primary att-file">Prendre une photo<input type="file" accept="image/*" capture="environment" class="sr" data-att-file></label>
          <label class="btn-ghost att-file">Photothèque ou PDF<input type="file" accept="image/*,application/pdf" multiple class="sr" data-att-file></label>
        </div>
        ${ok ? '<button type="button" class="btn-ghost" data-att-pick>Choisir dans Google Drive</button>' : ''}
        <details class="att-more">
          <summary>Coller un lien Google Drive</summary>
          <div class="att-paste">
            <input id="attLink" type="text" inputmode="url" autocapitalize="off" placeholder="Lien Google Drive ou Docs" aria-label="Lien Google Drive">
            <button type="button" class="btn-ghost" data-att-link>Ajouter</button>
          </div>
        </details>
        <p id="attErr" class="err" role="alert"></p>
      </div>`;
  }

  function hydrateThumbs(root) {
    (root || document).querySelectorAll('img[data-fid]').forEach((img) => {
      OnwardFiles.url(img.dataset.fid).then((u) => { if (u) img.src = u; }).catch(() => {});
    });
  }

  function onAttChange(e) {
    const input = e.target.closest('[data-att-file]');
    if (!input || !input.files || !input.files.length) return;
    const files = Array.from(input.files);
    input.value = '';
    setAttErr('');
    Promise.all(files.map((f) => OnwardFiles.save(f)))
      .then(attachItems)
      .catch(() => setAttErr('Impossible d’enregistrer ce fichier sur l’appareil.'));
  }

  function renderAtt() {
    const m = data.moments.find((x) => x.id === attId);
    if (!m) return;
    $('#attFor').textContent = `${m.title} · ${fmtDate(localDate(m.date))}`;
    $('#attBody').innerHTML = attHtml(m);
    hydrateThumbs($('#attBody'));
  }

  function openAtt(id) {
    if (!data.moments.find((x) => x.id === id)) return;
    attId = id;
    renderAtt();
    $('#attScrim').classList.add('on');
    $('#attSheet').classList.add('on');
  }

  function closeAtt() {
    attId = null;
    $('#attScrim').classList.remove('on');
    $('#attSheet').classList.remove('on');
    renderAll();
  }

  function attachItems(items) {
    const m = data.moments.find((x) => x.id === attId);
    if (!m || !items.length) return;
    m.attachments = (m.attachments || []).concat(items);
    if (!save()) { m.attachments.splice(-items.length, items.length); return; }
    renderAtt();
    toast(items.length > 1 ? `${items.length} pièces jointes ajoutées.` : 'Pièce jointe ajoutée.');
  }

  function setAttErr(msg) { const e = $('#attErr'); if (e) e.textContent = msg; }

  function onAttClick(e) {
    if (e.target.closest('[data-att-close]')) { closeAtt(); return; }
    const m = data.moments.find((x) => x.id === attId);
    if (!m) return;
    if (e.target.closest('[data-att-pick]')) {
      setAttErr('');
      OnwardDrive.pick()
        .then(attachItems)
        .catch((err) => setAttErr(err.message || 'Google Drive est indisponible.'));
      return;
    }
    if (e.target.closest('[data-att-link]')) {
      const a = OnwardDrive.fromLink($('#attLink').value);
      if (!a) { setAttErr('Lien non reconnu : utilisez un lien Google Drive ou Google Docs.'); return; }
      $('#attLink').value = '';
      attachItems([a]);
      return;
    }
    const del = e.target.closest('[data-att-del]');
    if (del) {
      const att = (m.attachments || []).find((x) => x.id === del.dataset.attDel);
      if (!att || !confirm(`Retirer « ${att.name} » de ce moment ? Le fichier reste dans Google Drive.`)) return;
      if (att.local) OnwardFiles.remove(att.fid).catch(() => {});
      m.attachments = m.attachments.filter((x) => x.id !== att.id);
      save(); renderAtt();
      toast('Pièce jointe retirée.');
    }
  }

  /* ---------- Notifications ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
  }

  /* ---------- Actions ---------- */
  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    switch (a) {
      case 'tab': setTab(el.dataset.tab); break;
      case 'level': setLevel(el.dataset.level); break;
      case 'dec': ui.dec = +el.dataset.dec; setLevel('year'); break;
      case 'year': ui.age = +el.dataset.age; ui.week = clamp(ui.week, 0, WPY - 1); setLevel('week'); break;
      case 'week': ui.week = +el.dataset.w; renderAll(); break;
      case 'add':
        // Depuis la vue Semaine, le moment se rattache à la semaine sélectionnée.
        if (ui.tab === 'vie' && ui.level === 'week') openSheet(isoOf(weekStart(ui.age * WPY + ui.week)));
        else openSheet(null);
        break;
      case 'cancel': closeSheet(); break;
      case 'att': openAtt(el.dataset.id); break;
      case 'cat':
        ui.sheetCat = el.dataset.cat;
        $$('.chip').forEach((c) => c.classList.toggle('sel', c === el));
        break;
      case 'del': {
        const m = data.moments.find((x) => x.id === el.dataset.id);
        if (!m) break;
        if (!confirm(`Supprimer « ${m.title} » ?`)) break;
        data.moments = data.moments.filter((x) => x.id !== m.id);
        save(); renderAll(); toast('Moment supprimé.');
        break;
      }
      case 'export': {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'onward-export.json';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
        break;
      }
      case 'reset':
        if (confirm('Effacer toutes vos données sur cet appareil ? Cette action est définitive.')) {
          try { localStorage.removeItem(KEY); } catch (err) { /* ignoré */ }
          location.reload();
        }
        break;
      default: break;
    }
  }

  function onOnboarding(e) {
    e.preventDefault();
    const name = $('#obName').value.trim();
    const birthVal = $('#obBirth').value;
    const err = $('#obErr');
    const today = isoOf(new Date());
    if (!name) { err.textContent = 'Indiquez votre prénom.'; return; }
    if (!birthVal || birthVal > today) { err.textContent = 'Indiquez une date de naissance passée.'; return; }
    const years = (new Date() - localDate(birthVal)) / (365.25 * DAY);
    if (years > 110) { err.textContent = 'Vérifiez la date de naissance.'; return; }
    data.profile = { name, birth: birthVal, createdAt: new Date().toISOString() };
    if (!save()) return;
    err.textContent = '';
    initUi();
    showScreen('main');
    setTab('vie');
    renderAll();
  }

  /* ---------- Démarrage ---------- */
  function start() {
    $('#main').addEventListener('click', onClick);
    $('#scrim').addEventListener('click', closeSheet);
    $('#sheet').addEventListener('click', onClick);
    $('#obForm').addEventListener('submit', onOnboarding);
    $('#attSheet').addEventListener('click', onAttClick);
    $('#attSheet').addEventListener('change', onAttChange);
    $('#attScrim').addEventListener('click', closeAtt);
    $('#attSheet').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'attLink') { e.preventDefault(); $('#attSheet [data-att-link]').click(); }
    });
    $('#sheet').addEventListener('submit', saveMoment);

    if (data.profile && data.profile.birth) {
      initUi();
      showScreen('main');
      setTab('vie');
      renderAll();
    } else {
      showScreen('onboarding');
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne non disponible */ });
      });
    }
  }

  start();
})();
