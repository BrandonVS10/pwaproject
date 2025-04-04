const APP_SHELL_CACHE = 'AppShellv6';
const DYNAMIC_CACHE = 'DinamicoV6';

const APP_SHELL_FILES = [
  '/', '/index.html', '/offline.html', '/index.css', '/App.css',
  '/App.jsx', '/main.jsx', '/components/Home.jsx',
  '/components/Login.jsx', '/components/Register.jsx',
  '/icons/sao_1.png', '/icons/sao_2.png', '/icons/sao_3.png',
  '/icons/carga.png', '/screenshots/cap.png', '/screenshots/cap1.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(cache => cache.addAll(APP_SHELL_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

function InsertIndexedDB(data) {
  const dbRequest = indexedDB.open("database", 2);

  dbRequest.onupgradeneeded = event => {
    let db = event.target.result;
    if (!db.objectStoreNames.contains("Usuarios")) {
      db.createObjectStore("Usuarios", { keyPath: "id", autoIncrement: true });
    }
  };

  dbRequest.onsuccess = event => {
    const db = event.target.result;
    const tx = db.transaction("Usuarios", "readwrite");
    const store = tx.objectStore("Usuarios");
    store.add(data).onsuccess = () => {
      console.log("📦 Guardado en IndexedDB.");
      if (self.registration.sync) {
        self.registration.sync.register("syncUsuarios").catch(console.error);
      }
    };
  };
}

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith("http")) return;

  if (event.request.method === "POST") {
    event.respondWith(
      event.request.clone().json()
        .then(body => fetch(event.request).catch(() => {
          InsertIndexedDB(body);
          return new Response(JSON.stringify({ message: "Guardado offline" }), {
            headers: { "Content-Type": "application/json" }
          });
        }))
        .catch(console.error)
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener('sync', event => {
  if (event.tag === "syncUsuarios") {
    event.waitUntil(new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open("database", 2);

      dbRequest.onsuccess = event => {
        const db = event.target.result;
        const tx = db.transaction("Usuarios", "readonly");
        const store = tx.objectStore("Usuarios");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const usuarios = getAllRequest.result;
          if (usuarios.length === 0) return resolve();

          const requests = usuarios.map(user =>
            fetch('https://backend-be7l.onrender.com/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user)
            })
          );

          Promise.all(requests).then(responses => {
            if (responses.every(r => r.ok)) {
              const txDelete = db.transaction("Usuarios", "readwrite");
              txDelete.objectStore("Usuarios").clear().onsuccess = () =>
                console.log("✅ Usuarios sincronizados y eliminados.");
              resolve();
            } else {
              console.warn("⚠️ Algunas respuestas fallaron.");
              resolve();
            }
          }).catch(reject);
        };

        getAllRequest.onerror = reject;
      };

      dbRequest.onerror = reject;
    }));
  }
});

self.addEventListener("push", (event) => {
  const options = {
    body: event.data.text(),
    image: "./icons/fut1.png",
  };
  self.registration.showNotification("📢 Notificación", options);
});
