/**
 * Service Worker para Gerenciador Financeiro Familiar
 * Cache de assets estáticos para funcionalidade offline
 */

const CACHE_NAME = 'financeiro-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    // CSS e JS carregados via CDN - não serão cacheados
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first for Firebase, cache first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip Firebase requests - always go to network
    if (url.hostname.includes('firebase') || url.hostname.includes('firebaseio')) {
        return;
    }

    // Skip CDN requests (Tailwind, D3, SheetJS)
    if (url.hostname.includes('cdn')) {
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, fetch from network
                return fetch(request).then((response) => {
                    // Only cache successful GET requests
                    if (request.method === 'GET' && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Offline fallback
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
