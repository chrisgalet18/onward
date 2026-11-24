/* Onward · interface web (tableau de bord). Données locales (localStorage), sans serveur. */
(() => {
  'use strict';

  /* ---------- Configuration ---------- */
  const KEY = 'onward.web.v1';
  const BIRTH = '1981-02-16';            // date de naissance de la démonstration
  const TODAY_OVERRIDE = '2026-09-08';   // date de référence de la maquette ; mettre null pour la date réelle
  const LIFE_YEARS = 80;
  const WPY = 52;
  const TOTAL = LIFE_YEARS * WPY;
  const DAY = 864e5;

  const CATS = [
    { k: 'v', n: 'Voyage', c: '#3f7fa6' }, { k: 'fa', n: 'Famille', c: '#5f9e6e' },
    { k: 't', n: 'Travail', c: '#7a5aa6' }, { k: 's', n: 'Santé', c: '#c94f4f' },
    { k: 'e', n: 'Études', c: '#f0c94a' }, { k: 'l', n: 'Amitié', c: '#d4608f' },
    { k: 'k', n: 'Projet', c: '#2f9c9a' }, { k: 'a', n: 'Autre', c: '#5b4f47' },
  ];
  const CAT = {};
  CATS.forEach((x) => { CAT[x.k] = x; });
  const KEYS = CATS.map((x) => x.k);

  const TITLES = {
    v: ['Week-end à la mer', 'Road trip', 'City break', 'Séjour à la montagne', 'Visite de famille'],
    fa: ['Dîner en famille', 'Anniversaire', 'Journée au parc', 'Vacances chez les grands-parents', 'Déménagement'],
    t: ['Réunion de lancement', 'Mission client', 'Nouveau poste', 'Formation', 'Salon professionnel'],
    s: ['Bilan médical', 'Séance de sport', 'Rééducation', 'Vaccins', 'Contrôle annuel'],
    e: ['Examen', 'Cours du soir', 'Certification', 'Rentrée', 'Mémoire'],
    l: ['Soirée entre amis', 'Retrouvailles', 'Pique-nique', 'Concert avec des amis', 'Anniversaire d’un ami'],
    k: ['Lancement de projet', 'Atelier créatif', 'Chantier maison', 'Projet personnel', 'Prototype'],
    a: ['Moment libre', 'Démarches administratives', 'Journée calme', 'Rangement', 'Lecture'],
  };

  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const WD = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const fmtNum = (n) => Number(n).toLocaleString('fr-FR');

  /* ---------- Dates et semaines (semaines alignées sur le lundi) ---------- */
  function localDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  const birthD = localDate(BIRTH);
  const birthMon = addDays(birthD, -((birthD.getDay() + 6) % 7));
  function todayD() {
    if (TODAY_OVERRIDE) return localDate(TODAY_OVERRIDE);
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function idxOf(d) { return Math.floor(Math.round((d - birthMon) / DAY) / 7); }
  function weekStart(idx) { return addDays(birthMon, idx * 7); }
  function nowIdx() { return idxOf(todayD()); }
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / DAY + 1) / 7);
  }
  function fmtRange(s, e) {
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
    }
    return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
  }
  function fmtLong(d) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  function fmtEvent(d) { return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; }

  /* ---------- Données ---------- */
  function seedMoments() {
    const list = [
      { id: 'd1', demo: true, title: 'Séjour à Londres', cat: 'v', start: '2026-09-07', end: '2026-09-13', place: 'Londres', who: 'En famille', desc: 'Une semaine à Londres en famille : visites, musées et balades. Les enfants s’en souviennent encore.', tags: ['v', 'fa', 'k'], img: 'london', featured: true, created: 3 },
      { id: 'd2', demo: true, title: 'Séjour au lac d’Annecy', cat: 'fa', start: '2026-08-20', end: '2026-08-26', place: 'Annecy', who: 'En famille', desc: 'Une semaine au bord du lac, baignades et randonnées.', tags: ['fa', 'v'], img: 'annecy', featured: true, created: 2 },
      { id: 'd3', demo: true, title: 'Nouveau projet IT', cat: 't', start: '2026-08-03', end: '2026-08-16', place: 'Bureau', who: '', desc: 'Lancement d’un nouveau projet, cadrage et premiers ateliers.', tags: ['t', 'k'], img: 'laptop', featured: true, created: 1 },
      { id: 'd4', demo: true, title: 'Réservation des billets', cat: 'v', start: '2026-09-08', end: '2026-09-08', tags: ['v'] },
      { id: 'd5', demo: true, title: 'Planning des visites', cat: 'k', start: '2026-09-10', end: '2026-09-10', tags: ['k'] },
    ];
    // Historique de démonstration : un moment sur environ une semaine sur neuf, avant la semaine en cours.
    const now = nowIdx();
    for (let i = 0; i < now; i++) {
      const h = Math.imul(i + 1, 2654435761) >>> 0;
      if (h % 9) continue;
      const cat = KEYS[(h >>> 8) % 8];
      const s = weekStart(i);
      list.push({ id: 'f' + i, demo: true, title: TITLES[cat][(h >>> 16) % 5], cat, start: iso(s), end: iso(addDays(s, 6)), tags: [cat] });
    }
    return list;
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.moments)) return d;
    } catch (e) { /* données illisibles : on repart de la démonstration */ }
    const fresh = { moments: seedMoments(), seeded: true };
    try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { /* stockage indisponible */ }
    return fresh;
  }
  let data = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { toast('Impossible d’enregistrer sur cet appareil.'); return false; }
  }

  function weeksByIdx() {
    const map = new Map();
    data.moments.forEach((m) => {
      const s = clamp(idxOf(localDate(m.start)), 0, TOTAL - 1);
      const e = clamp(idxOf(localDate(m.end || m.start)), 0, TOTAL - 1);
      for (let i = s; i <= e; i++) {
        if (!map.has(i)) map.set(i, []);
        map.get(i).push(m);
      }
    });
    return map;
  }

  /* ---------- État ---------- */
  const ui = { view: 'vie', filter: null, sel: 0, q: '' };
  ui.sel = nowIdx();

  /* ---------- Rendu : barre latérale ---------- */
  function renderSide() {
    const counts = {};
    KEYS.forEach((k) => { counts[k] = 0; });
    data.moments.forEach((m) => { counts[m.cat]++; });
    $('#catList').innerHTML = CATS.map((x) =>
      `<li><button type="button" class="${ui.filter === x.k ? 'on' : ''}" data-cat="${x.k}"><i class="sq" style="background:${x.c}"></i><span class="n">${x.n}</span><span class="c">${fmtNum(counts[x.k])}</span></button></li>`
    ).join('');

    const now = nowIdx();
    const t = todayD();
    let age = t.getFullYear() - birthD.getFullYear();
    if (t < new Date(t.getFullYear(), birthD.getMonth(), birthD.getDate())) age--;
    const pct = Math.round((now / TOTAL) * 100);
    $('#pAge').textContent = `${age} ans`;
    $('#pWeeks').textContent = fmtNum(Math.max(0, now));
    $('#pHorizon').textContent = fmtNum(TOTAL);
    $('#pBar').style.width = pct + '%';
    $('#pPct').textContent = `${pct} % de votre vie`;
  }

  function renderFilterSelect() {
    const sel = $('#filterCat');
    sel.innerHTML = '<option value="">Toutes les catégories</option>' +
      CATS.map((x) => `<option value="${x.k}">${x.n}</option>`).join('');
    sel.value = ui.filter || '';
    const mSel = $('#mCat');
    if (!mSel.options.length) mSel.innerHTML = CATS.map((x) => `<option value="${x.k}">${x.n}</option>`).join('');
  }

  /* ---------- Rendu : grille de vie ---------- */
  function cellHtml(idx, now, byWeek, yearLabel) {
    const list = byWeek.get(idx);
    const cat = list && list.length ? list[0].cat : null;
    const status = idx < now ? 'past' : idx === now ? 'now' : 'future';
    let cls = 'c ';
    let style = '';
    if (status === 'now') cls += 'now';
    else if (cat) { style = `background:${CAT[cat].c}${status === 'future' ? ';opacity:.55' : ''}`; cls += ''; }
    else cls += status;
    if (ui.filter && cat !== ui.filter && status !== 'now') cls += ' dim';
    if (idx === ui.sel) cls += ' sel';
    const w = idx % WPY + 1;
    return `<button type="button" class="${cls}" style="${style}" data-i="${idx}" aria-label="Semaine ${w}, ${yearLabel}"></button>`;
  }

  function renderLife() {
    const now = nowIdx();
    const byWeek = weeksByIdx();
    const y0 = birthD.getFullYear();
    const body = $('#lifeBody');
    let html = '';
    if (ui.view === 'vie') {
      $('#lifeTitle').textContent = `Ma vie (${LIFE_YEARS} ans) – ${fmtNum(TOTAL)} semaines`;
      for (let d = 0; d < LIFE_YEARS / 10; d++) {
        let lines = '';
        for (let y = 0; y < 10; y++) {
          const year = d * 10 + y;
          let cells = '';
          for (let w = 0; w < WPY; w++) cells += cellHtml(year * WPY + w, now, byWeek, `année ${y0 + year}`);
          lines += `<div class="line">${cells}</div>`;
        }
        html += `<div class="band" id="band-${d}"><div class="band-y">${y0 + d * 10}</div><div class="band-lines">${lines}</div></div>`;
      }
    } else if (ui.view === 'year') {
      $('#lifeTitle').textContent = 'Par année';
      for (let year = 0; year < LIFE_YEARS; year++) {
        let cells = '';
        for (let w = 0; w < WPY; w++) cells += cellHtml(year * WPY + w, now, byWeek, `année ${y0 + year}`);
        html += `<div class="line yearly"><span class="yl">${y0 + year}</span>${cells}</div>`;
      }
    } else {
      $('#lifeTitle').textContent = 'Par décennie';
      const max = LIFE_YEARS / 10;
      for (let d = 0; d < max; d++) {
        const lo = d * 10 * WPY;
        const hi = lo + 10 * WPY;
        const counts = {};
        KEYS.forEach((k) => { counts[k] = 0; });
        let pastTotal = 0;
        let catPast = 0;
        for (let i = lo; i < Math.min(hi, now); i++) {
          pastTotal++;
          const list = byWeek.get(i);
          if (list && list.length) { counts[list[0].cat]++; catPast++; }
        }
        const emptyPast = pastTotal - catPast;
        const future = Math.max(0, hi - Math.max(now, lo));
        let segs = '';
        KEYS.forEach((k) => { if (counts[k]) segs += `<i style="flex:${counts[k]};background:${CAT[k].c}"></i>`; });
        if (emptyPast) segs += `<i style="flex:${emptyPast};background:var(--empty)"></i>`;
        if (now >= lo && now < hi) segs += `<i style="flex:1;background:var(--or)"></i>`;
        if (future) segs += `<i style="flex:${future};background:var(--future)"></i>`;
        const pct = Math.round((pastTotal / (10 * WPY)) * 100);
        html += `<button type="button" class="dec-row" data-dec="${d}"><span class="dl">${y0 + d * 10}–${y0 + d * 10 + 9}</span><span class="dec-bar">${segs}</span><span class="pc">${pct ? pct + ' %' : 'à venir'}</span></button>`;
      }
    }
    body.innerHTML = html;
  }

  /* ---------- Rendu : détail de la semaine ---------- */
  const GRAD = {
    london: 'linear-gradient(170deg,#f5b679 0%,#d9707f 45%,#3c3a6e 100%)',
    annecy: 'linear-gradient(170deg,#9fdcef 0%,#3f9c8f 60%,#1f5d4f 100%)',
    laptop: 'linear-gradient(160deg,#4a4f5c 0%,#1d1f25 100%)',
    default: 'linear-gradient(160deg,#e8c9a6 0%,#9a7a63 100%)',
  };

  function renderDetail() {
    const idx = ui.sel;
    const byWeek = weeksByIdx();
    const list = byWeek.get(idx) || [];
    const start = weekStart(idx);
    const end = addDays(start, 6);
    $('#wkTitle').textContent = `Semaine ${isoWeek(start)} · ${start.getFullYear()}`;
    $('#wkRange').textContent = fmtRange(start, end);

    const primary = list[0];
    const events = list.slice(1);
    const body = $('#wkBody');

    if (!primary) {
      body.innerHTML = `
        <div class="hero" style="background:${GRAD.default}"><div class="shade"></div><span class="hero-l">Semaine sans moment</span></div>
        <p class="empty-note" style="margin-top:14px">Aucun moment n’est noté pour cette semaine.</p>
        <button type="button" class="add-ev" data-addev="${idx}" style="margin-top:14px">+ Ajouter un moment</button>`;
      return;
    }

    const tags = (primary.tags && primary.tags.length ? primary.tags : [primary.cat])
      .filter((k, i, a) => a.indexOf(k) === i)
      .map((k) => `<span class="tag" style="background:${CAT[k].c}">${CAT[k].n}</span>`).join('');
    const days = Math.round((localDate(primary.end || primary.start) - localDate(primary.start)) / DAY) + 1;
    const dur = days % 7 === 0 && days >= 7
      ? `${days / 7} semaine${days / 7 > 1 ? 's' : ''}`
      : `${days} jour${days > 1 ? 's' : ''}`;
    const endD = localDate(primary.end || primary.start);
    const rangeS = `${localDate(primary.start).getDate()} – ${endD.getDate()} ${MONTHS_S[endD.getMonth()]} ${endD.getFullYear()}`;
    const eventsHtml = events.map((m) => `
      <div class="ev">
        <span class="ico" style="background:${CAT[m.cat].c}">•</span>
        <div class="tx"><b>${esc(m.title)}</b><span>${fmtEvent(localDate(m.start))}</span></div>
        <button type="button" class="more" data-del="${esc(m.id)}" aria-label="Supprimer ${esc(m.title)}" title="Supprimer">⋯</button>
      </div>`).join('');

    body.innerHTML = `
      <div class="hero" style="background:${GRAD[primary.img] || GRAD.default}">
        <div class="shade"></div><span class="hero-l">${esc(primary.place || 'Moment de la semaine')}</span>
      </div>
      <h3 class="m-title">${esc(primary.title)}</h3>
      ${primary.desc ? `<p class="m-desc">${esc(primary.desc)}</p>` : ''}
      <div class="meta">
        <div><i class="ic ic-cal"></i>${rangeS} (${dur})</div>
        ${primary.who ? `<div><i class="ic ic-users"></i>${esc(primary.who)}</div>` : ''}
        ${primary.place ? `<div><i class="ic ic-home"></i>${esc(primary.place)}</div>` : ''}
      </div>
      <div class="chips">${tags}</div>
      <p class="h4">Événements de la semaine (${events.length})</p>
      <div class="ev-list">${eventsHtml || '<p class="empty-note">Aucun autre événement cette semaine.</p>'}</div>
      <button type="button" class="add-ev" data-addev="${idx}">+ Ajouter un événement</button>
      ${attHtml(primary)}`;
  }

  /* ---------- Pièces jointes Google Drive ---------- */
  const ACCEPT_LOCAL = ['image/', 'application/pdf'];

  function attItemHtml(a, mid) {
    const isPhoto = a.local && a.type === 'Photo';
    const thumb = isPhoto
      ? `<img class="att-img" data-fid="${esc(a.fid)}" alt="Photo : ${esc(a.name)}">`
      : `<span class="att-k">${esc(a.type)}</span>`;
    const label = a.local
      ? `<span class="att-n">${esc(a.name)}</span>`
      : `<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`;
    return `<div class="att">${thumb}${label}<button type="button" class="more" data-att-del="${esc(mid)}:${esc(a.id)}" aria-label="Retirer ${esc(a.name)}" title="Retirer">✕</button></div>`;
  }

  function attHtml(m) {
    const list = m.attachments || [];
    const ok = window.OnwardDrive && OnwardDrive.isConfigured();
    return `<div class="att-sec">
      <p class="h4">Pièces jointes (${list.length})</p>
      <div class="att-list">${list.length ? list.map((a) => attItemHtml(a, m.id)).join('') : '<p class="empty-note">Aucun fichier joint à ce moment.</p>'}</div>
      <div class="drop" data-mid="${esc(m.id)}" tabindex="0">
        <span>Glissez vos photos ou PDF ici</span>
        <label class="link-btn">ou parcourir<input type="file" accept="image/*,application/pdf" multiple class="sr" data-att-file data-mid="${esc(m.id)}"></label>
      </div>
      <div class="att-add">
        ${ok ? `<button type="button" class="btn-ghost" data-att-pick="${esc(m.id)}">Choisir dans Google Drive</button>` : ''}
        <details class="att-more">
          <summary>Coller un lien Google Drive</summary>
          <div class="att-paste">
            <input id="attLink" type="text" inputmode="url" autocapitalize="off" placeholder="Lien Google Drive ou Docs" aria-label="Lien Google Drive">
            <button type="button" class="btn-ghost" data-att-link="${esc(m.id)}">Ajouter</button>
          </div>
        </details>
        <p id="attErr" class="err" role="alert"></p>
      </div>
    </div>`;
  }

  function hydrateThumbs() {
    document.querySelectorAll('#wkBody img[data-fid]').forEach((img) => {
      OnwardFiles.url(img.dataset.fid).then((u) => { if (u) img.src = u; }).catch(() => {});
    });
  }

  function addLocalFiles(mid, files) {
    const ok = files.filter((f) => ACCEPT_LOCAL.some((t) => f.type.indexOf(t) === 0));
    if (!ok.length) { setAttErr('Format non pris en charge : photos (JPEG, PNG, HEIC) ou PDF.'); return; }
    setAttErr('');
    Promise.all(ok.map((f) => OnwardFiles.save(f)))
      .then((items) => attachTo(mid, items))
      .catch(() => setAttErr('Impossible d’enregistrer ce fichier sur cet ordinateur.'));
  }

  function setAttErr(msg) { const e = $('#attErr'); if (e) e.textContent = msg; }

  function attachTo(momentId, items) {
    const m = data.moments.find((x) => x.id === momentId);
    if (!m || !items.length) return;
    m.attachments = (m.attachments || []).concat(items);
    if (!save()) { m.attachments.splice(-items.length, items.length); return; }
    renderDetail();
    toast(items.length > 1 ? `${items.length} pièces jointes ajoutées.` : 'Pièce jointe ajoutée.');
  }

  function onAttClick(e) {
    const pick = e.target.closest('[data-att-pick]');
    if (pick) {
      setAttErr('');
      OnwardDrive.pick()
        .then((items) => attachTo(pick.dataset.attPick, items))
        .catch((err) => setAttErr(err.message || 'Google Drive est indisponible.'));
      return true;
    }
    const link = e.target.closest('[data-att-link]');
    if (link) {
      const a = OnwardDrive.fromLink($('#attLink').value);
      if (!a) { setAttErr('Lien non reconnu : utilisez un lien Google Drive ou Google Docs.'); return true; }
      attachTo(link.dataset.attLink, [a]);
      return true;
    }
    const del = e.target.closest('[data-att-del]');
    if (del) {
      const [mid, aid] = del.dataset.attDel.split(':');
      const m = data.moments.find((x) => x.id === mid);
      const att = m && (m.attachments || []).find((x) => x.id === aid);
      if (!att || !confirm(`Retirer « ${att.name} » de ce moment ? Le fichier reste dans Google Drive.`)) return true;
      if (att.local) OnwardFiles.remove(att.fid).catch(() => {});
      m.attachments = m.attachments.filter((x) => x.id !== aid);
      save(); renderDetail();
      toast('Pièce jointe retirée.');
      return true;
    }
    return false;
  }

  /* ---------- Rendu : moments récents et recherche ---------- */
  function cardHtml(m) {
    const s = localDate(m.start);
    const e = localDate(m.end || m.start);
    return `<button type="button" class="rcard" data-open="${idxOf(s)}">
      <div class="thumb" style="background:${GRAD[m.img] || GRAD.default}"><span class="pill" style="background:${CAT[m.cat].c}">${CAT[m.cat].n}</span></div>
      <div class="body"><h3>${esc(m.title)}</h3><p>${fmtRange(s, e)}</p></div>
    </button>`;
  }

  function renderRecent() {
    const h = $('.recent-h h2');
    const box = $('#recentCards');
    if (ui.q) {
      const res = data.moments
        .filter((m) => `${m.title} ${m.desc || ''} ${m.place || ''}`.toLowerCase().includes(ui.q))
        .sort((a, b) => b.start.localeCompare(a.start));
      h.textContent = `Résultats (${res.length})`;
      box.innerHTML = res.length ? res.slice(0, 3).map(cardHtml).join('') : '<p class="empty-note">Aucun moment ne correspond à cette recherche.</p>';
      return;
    }
    h.textContent = 'Moments récents';
    const feat = data.moments.filter((m) => m.featured).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 3);
    box.innerHTML = feat.length ? feat.map(cardHtml).join('') : '<p class="empty-note">Ajoutez un moment pour le voir apparaître ici.</p>';
  }

  function renderAll() {
    renderFilterSelect();
    renderSide();
    renderLife();
    renderDetail();
    renderRecent();
    hydrateThumbs();
    $$('.seg button').forEach((b) => {
      const on = b.dataset.view === ui.view;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const btnDemo = $('#btnDemo');
    btnDemo.style.display = data.moments.some((m) => m.demo) ? '' : 'none';
  }

  /* ---------- Sélection ---------- */
  function select(idx) {
    ui.sel = clamp(idx, 0, TOTAL - 1);
    $$('#lifeBody .c.sel').forEach((el) => el.classList.remove('sel'));
    const el = $(`#lifeBody .c[data-i="${ui.sel}"]`);
    if (el) el.classList.add('sel');
    renderDetail();
  }

  /* ---------- Fenêtre d'ajout ---------- */
  function openModal(dateIso) {
    renderFilterSelect();
    $('#mTitle').value = '';
    $('#mCat').value = 'v';
    $('#mStart').value = dateIso || iso(todayD());
    $('#mEnd').value = '';
    $('#mPlace').value = '';
    $('#mDesc').value = '';
    $('#mErr').textContent = '';
    $('#scrim').hidden = false;
    $('#modal').hidden = false;
    setTimeout(() => $('#mTitle').focus(), 30);
  }
  function closeModal() { $('#scrim').hidden = true; $('#modal').hidden = true; }

  function onModalSubmit(e) {
    e.preventDefault();
    const title = $('#mTitle').value.trim();
    const cat = $('#mCat').value;
    const start = $('#mStart').value;
    const end = $('#mEnd').value;
    const err = $('#mErr');
    if (!title) { err.textContent = 'Donnez un titre à ce moment.'; return; }
    if (!start || localDate(start) < birthD) { err.textContent = 'La date de début doit être après la naissance.'; return; }
    if (end && localDate(end) < localDate(start)) { err.textContent = 'La date de fin ne peut pas précéder le début.'; return; }
    const m = {
      id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title, cat, start, end: end || start,
      place: $('#mPlace').value.trim(), desc: $('#mDesc').value.trim(),
      tags: [cat], featured: true, created: Date.now(),
    };
    data.moments.push(m);
    if (!save()) { data.moments.pop(); return; }
    closeModal();
    ui.view = ui.view === 'year' ? 'year' : 'vie';
    ui.sel = idxOf(localDate(start));
    renderAll();
    toast('Moment enregistré.');
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

  /* ---------- Événements ---------- */
  function bind() {
    $('#lifeBody').addEventListener('click', (e) => {
      const cell = e.target.closest('[data-i]');
      if (cell) { select(+cell.dataset.i); return; }
      const row = e.target.closest('[data-dec]');
      if (row) {
        const d = +row.dataset.dec;
        ui.view = 'vie';
        ui.sel = d * 10 * WPY;
        renderAll();
        const band = $(`#band-${d}`);
        if (band) band.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });

    $$('.seg button').forEach((b) => b.addEventListener('click', () => {
      ui.view = b.dataset.view;
      renderAll();
    }));

    $('#filterCat').addEventListener('change', (e) => {
      ui.filter = e.target.value || null;
      renderAll();
    });

    $('#catList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      ui.filter = ui.filter === b.dataset.cat ? null : b.dataset.cat;
      renderAll();
    });

    $('#btnFilterIcon').addEventListener('click', () => toast('Options d’affichage : bientôt.'));

    $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
      const target = { top: '#top', grid: '#grid', analyse: '#analyse', profil: '#profil' }[b.dataset.go];
      $$('.nav-i').forEach((x) => x.classList.toggle('on', x === b));
      const el = target && $(target);
      if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }));

    $('#prevWk').addEventListener('click', () => select(ui.sel - 1));
    $('#nextWk').addEventListener('click', () => select(ui.sel + 1));

    $('#btnAdd').addEventListener('click', () => openModal(null));
    $('#btnAll').addEventListener('click', () => {
      $('#search').value = '';
      ui.q = '';
      renderRecent();
    });

    $('#search').addEventListener('input', (e) => {
      ui.q = e.target.value.trim().toLowerCase();
      renderRecent();
    });

    $('#recentCards').addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (!b) return;
      select(+b.dataset.open);
      $('#grid').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    const wk = $('#wkBody');
    wk.addEventListener('dragover', (e) => {
      const z = e.target.closest('.drop');
      if (z) { e.preventDefault(); z.classList.add('over'); }
    });
    wk.addEventListener('dragleave', (e) => {
      const z = e.target.closest('.drop');
      if (z) z.classList.remove('over');
    });
    wk.addEventListener('drop', (e) => {
      const z = e.target.closest('.drop');
      if (!z) return;
      e.preventDefault();
      z.classList.remove('over');
      addLocalFiles(z.dataset.mid, Array.from(e.dataTransfer.files));
    });
    wk.addEventListener('change', (e) => {
      const inp = e.target.closest('[data-att-file]');
      if (!inp || !inp.files || !inp.files.length) return;
      const files = Array.from(inp.files);
      inp.value = '';
      addLocalFiles(inp.dataset.mid, files);
    });
    $('#wkBody').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'attLink') { e.preventDefault(); $('#wkBody [data-att-link]').click(); }
    });

    $('#wkBody').addEventListener('click', (e) => {
      if (onAttClick(e)) return;
      const add = e.target.closest('[data-addev]');
      if (add) { openModal(iso(weekStart(+add.dataset.addev))); return; }
      const del = e.target.closest('[data-del]');
      if (del) {
        const m = data.moments.find((x) => x.id === del.dataset.del);
        if (!m || !confirm(`Supprimer « ${m.title} » ?`)) return;
        data.moments = data.moments.filter((x) => x.id !== m.id);
        save();
        renderAll();
        toast('Moment supprimé.');
      }
    });

    $('#mCancel').addEventListener('click', closeModal);
    $('#scrim').addEventListener('click', closeModal);
    $('#modal').addEventListener('submit', onModalSubmit);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

    $('#btnDemo').addEventListener('click', () => {
      const n = data.moments.filter((m) => m.demo).length;
      if (!confirm(`Supprimer les ${n} moments de démonstration ? Vos moments restent.`)) return;
      data.moments = data.moments.filter((m) => !m.demo);
      save();
      ui.sel = nowIdx();
      renderAll();
      toast('Données de démonstration supprimées.');
    });
  }

  bind();
  renderAll();
})();
