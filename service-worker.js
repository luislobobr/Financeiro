/**
 * Service Worker para Notificações Push - Financeiro App
 * Gerencia notificações de contas a vencer
 */

const CACHE_NAME = 'financeiro-v1';
const NOTIFICATION_TAG = 'contas-vencer';

// Arquivos para cache offline
const urlsToCache = [
    '/',
    '/index.html',
    '/js/app.js',
    '/js/state.js',
    '/js/ui.js',
    '/js/utils.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.log('[SW] Cache failed:', error);
            })
    );
    self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch com cache fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Receber mensagens do app principal
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'CHECK_BILLS') {
        checkAndNotifyBills(event.data.bills);
    }

    if (event.data.type === 'SCHEDULE_CHECK') {
        // Agendar verificação periódica (a cada 6 horas)
        schedulePeriodicCheck();
    }
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

    let data = { title: 'Financeiro', body: 'Você tem contas a vencer!' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: NOTIFICATION_TAG,
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'view', title: '👀 Ver Contas' },
            { action: 'dismiss', title: '❌ Dispensar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // Se já tem uma janela aberta, foca nela
                for (const client of clientList) {
                    if (client.url.includes('index.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Senão, abre uma nova
                if (clients.openWindow) {
                    return clients.openWindow('/index.html');
                }
            })
        );
    }
});

// Função para verificar e notificar sobre contas
function checkAndNotifyBills(bills) {
    if (!bills || bills.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);

    // Filtrar contas vencendo
    const dueSoon = bills.filter(bill => {
        if (bill.status === 'Pago') return false;
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= threeDays;
    });

    if (dueSoon.length === 0) return;

    // Separar por urgência
    const dueToday = dueSoon.filter(b => {
        const d = new Date(b.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    const dueTomorrow = dueSoon.filter(b => {
        const d = new Date(b.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === tomorrow.getTime();
    });

    // Criar notificação apropriada
    let title, body;

    if (dueToday.length > 0) {
        title = '⚠️ Contas Vencendo HOJE!';
        body = `Você tem ${dueToday.length} conta(s) vencendo hoje. Não esqueça de pagar!`;
    } else if (dueTomorrow.length > 0) {
        title = '📅 Contas Vencendo Amanhã';
        body = `Você tem ${dueTomorrow.length} conta(s) vencendo amanhã.`;
    } else {
        title = '💰 Contas Próximas';
        body = `Você tem ${dueSoon.length} conta(s) vencendo nos próximos dias.`;
    }

    // Mostrar notificação
    self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: NOTIFICATION_TAG,
        vibrate: [200, 100, 200],
        requireInteraction: dueToday.length > 0,
        actions: [
            { action: 'view', title: '👀 Ver Contas' },
            { action: 'dismiss', title: '❌ Dispensar' }
        ]
    });
}

// Agendar verificações periódicas (simulado)
function schedulePeriodicCheck() {
    // O Service Worker não suporta setInterval de longa duração
    // Usamos a Periodic Background Sync API quando disponível
    if ('periodicSync' in self.registration) {
        self.registration.periodicSync.register('check-bills', {
            minInterval: 6 * 60 * 60 * 1000 // 6 horas
        }).catch(err => {
            console.log('[SW] Periodic sync not available:', err);
        });
    }
}

// Evento de sync periódico
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-bills') {
        console.log('[SW] Periodic sync: checking bills');
        event.waitUntil(notifyClientsToCheck());
    }
});

// Notificar clientes para verificar contas
async function notifyClientsToCheck() {
    const allClients = await clients.matchAll({ includeUncontrolled: true });
    for (const client of allClients) {
        client.postMessage({ type: 'CHECK_BILLS_REQUEST' });
    }
}

console.log('[SW] Service Worker loaded');
