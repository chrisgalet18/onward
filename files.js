/* Onward · fichiers locaux (photos, PDF) stockés sur l'appareil dans IndexedDB.
   Rien n'est envoyé sur un serveur. */
(function () {
  'use strict';
  var DB = 'onward-files', STORE = 'files';
  var dbp = null;

  function db() {
    if (!dbp) {
      dbp = new Promise(function (res, rej) {
        var r = indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    }
    return dbp;
  }

  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(STORE, mode);
        var req = fn(t.objectStore(STORE));
        t.oncomplete = function () { res(req ? req.result : undefined); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('Transaction annulée')); };
      });
    });
  }

  function newId() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function typeOf(mime) {
    if (!mime) return 'Fichier';
    if (mime.indexOf('image/') === 0) return 'Photo';
    if (mime === 'application/pdf') return 'PDF';
    return 'Fichier';
  }

  // Enregistre un fichier et renvoie la pièce jointe correspondante (sans le contenu).
  function save(file) {
    var id = newId();
    return tx('readwrite', function (s) { return s.put(file, id); }).then(function () {
      return {
        id: id, fid: id, local: true,
        name: file.name || 'Fichier', type: typeOf(file.type), mime: file.type || '',
        size: file.size, added: Date.now()
      };
    });
  }

  function get(id) { return tx('readonly', function (s) { return s.get(id); }); }
  function remove(id) { return tx('readwrite', function (s) { return s.delete(id); }); }
  function url(id) {
    return get(id).then(function (b) { return b ? URL.createObjectURL(b) : null; });
  }

  window.OnwardFiles = { save: save, get: get, remove: remove, url: url, typeOf: typeOf };
})();
