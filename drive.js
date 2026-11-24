/* Onward · pièces jointes Google Drive.
   Seules les références (identifiant, nom, type, lien) sont enregistrées sur l'appareil.
   Le contenu des fichiers reste dans Google Drive. */
(function () {
  'use strict';

  var cfg = window.ONWARD_DRIVE_CONFIG || {};
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var token = null;

  function isConfigured() { return !!(cfg.clientId && cfg.apiKey); }

  // Accepte uniquement les liens Google Drive / Docs, ou un identifiant seul.
  function parseRef(raw) {
    var s = String(raw || '').trim();
    if (!s) return null;
    var rules = [
      { re: /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]{10,})/, kind: 'folder' },
      { re: /drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([\w-]{10,})/, kind: 'file' },
      { re: /docs\.google\.com\/document\/d\/([\w-]{10,})/, kind: 'document' },
      { re: /docs\.google\.com\/spreadsheets\/d\/([\w-]{10,})/, kind: 'sheet' },
      { re: /docs\.google\.com\/presentation\/d\/([\w-]{10,})/, kind: 'slides' },
      { re: /drive\.google\.com\/open\?(?:.*&)?id=([\w-]{10,})/, kind: 'file' },
      { re: /^([\w-]{20,})$/, kind: 'file' }
    ];
    for (var i = 0; i < rules.length; i++) {
      var m = s.match(rules[i].re);
      if (m) return { fileId: m[1], kind: rules[i].kind, url: urlFor(rules[i].kind, m[1]) };
    }
    return null;
  }

  function urlFor(kind, id) {
    switch (kind) {
      case 'folder': return 'https://drive.google.com/drive/folders/' + id;
      case 'document': return 'https://docs.google.com/document/d/' + id + '/edit';
      case 'sheet': return 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
      case 'slides': return 'https://docs.google.com/presentation/d/' + id + '/edit';
      default: return 'https://drive.google.com/file/d/' + id + '/view';
    }
  }

  function typeLabel(kind, mime) {
    if (kind === 'folder') return 'Dossier';
    if (kind === 'document') return 'Document';
    if (kind === 'sheet') return 'Tableur';
    if (kind === 'slides') return 'Présentation';
    if (mime) {
      if (mime.indexOf('image/') === 0) return 'Photo';
      if (mime.indexOf('video/') === 0) return 'Vidéo';
      if (mime === 'application/pdf') return 'PDF';
      if (mime.indexOf('spreadsheet') >= 0) return 'Tableur';
      if (mime.indexOf('presentation') >= 0) return 'Présentation';
      if (mime.indexOf('document') >= 0 || mime.indexOf('word') >= 0) return 'Document';
    }
    return 'Fichier';
  }

  function newId() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // Crée une pièce jointe à partir d'une référence collée (nom facultatif).
  function fromLink(raw, name) {
    var ref = parseRef(raw);
    if (!ref) return null;
    return {
      id: newId(), fileId: ref.fileId, kind: ref.kind, url: ref.url,
      name: (name && name.trim()) || 'Fichier Google Drive', type: typeLabel(ref.kind, ''), added: Date.now()
    };
  }

  // Crée une pièce jointe à partir d'un élément choisi dans le sélecteur Drive.
  function fromPicked(doc) {
    var kind = 'file';
    if (doc.mimeType === 'application/vnd.google-apps.folder') kind = 'folder';
    else if (doc.mimeType === 'application/vnd.google-apps.document') kind = 'document';
    else if (doc.mimeType === 'application/vnd.google-apps.spreadsheet') kind = 'sheet';
    else if (doc.mimeType === 'application/vnd.google-apps.presentation') kind = 'slides';
    return {
      id: newId(), fileId: doc.id, kind: kind, url: doc.url || urlFor(kind, doc.id),
      name: doc.name || 'Fichier Google Drive', type: typeLabel(kind, doc.mimeType), added: Date.now()
    };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Chargement impossible (réseau ?)')); };
      document.head.appendChild(s);
    });
  }

  function requestToken() {
    return new Promise(function (resolve, reject) {
      var client = google.accounts.oauth2.initTokenClient({
        client_id: cfg.clientId,
        scope: SCOPE,
        callback: function (resp) {
          if (resp && resp.access_token) resolve(resp.access_token);
          else reject(new Error((resp && resp.error) || 'Autorisation refusée'));
        },
        error_callback: function (err) { reject(new Error((err && err.type) || 'Autorisation refusée')); }
      });
      client.requestAccessToken({ prompt: token ? '' : 'consent' });
    });
  }

  // Ouvre le sélecteur Google Drive. Résout avec la liste des pièces jointes choisies.
  function pick() {
    if (!isConfigured()) return Promise.reject(new Error('Google Drive n’est pas encore configuré.'));
    return Promise.all([
      loadScript('https://accounts.google.com/gsi/client'),
      loadScript('https://apis.google.com/js/api.js')
    ]).then(function () {
      return new Promise(function (resolve) { gapi.load('picker', resolve); });
    }).then(function () {
      return token ? token : requestToken().then(function (t) { token = t; return t; });
    }).then(function (t) {
      return new Promise(function (resolve, reject) {
        var view = new google.picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false);
        new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(t)
          .setDeveloperKey(cfg.apiKey)
          .setCallback(function (d) {
            if (d.action === google.picker.Action.PICKED) resolve(d.docs.map(fromPicked));
            else if (d.action === google.picker.Action.CANCEL) resolve([]);
          })
          .build()
          .setVisible(true);
      });
    }).catch(function (err) {
      token = null; // jeton peut-être expiré : on le redemandera à la prochaine ouverture
      throw err;
    });
  }

  window.OnwardDrive = {
    isConfigured: isConfigured,
    parseRef: parseRef,
    fromLink: fromLink,
    fromPicked: fromPicked,
    typeLabel: typeLabel,
    pick: pick
  };
})();
