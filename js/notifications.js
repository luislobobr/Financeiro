/**
 * Notifications Module - Financeiro App
 * Gerencia permissões e envio de notificações push
 */

import { state } from './state.js';
import { showToast } from './utils.js';

// Verifica se o navegador suporta notificações
export function isNotificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
}

// Solicita permissão para notificações
export async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        showToast('Seu navegador não suporta notificações.', true);
        return false;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            showToast('🔔 Notificações ativadas!');
            await registerServiceWorker();
            return true;
        } else if (permission === 'denied') {
            showToast('Notificações bloqueadas. Verifique as configurações do navegador.', true);
            return false;
        } else {
            showToast('Permissão de notificações pendente.', true);
            return false;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        showToast('Erro ao solicitar permissão.', true);
        return false;
    }
}

// Registra o Service Worker
export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration.scope);

        // Aguardar o SW estar ativo
        if (registration.installing) {
            console.log('Service Worker installing');
        } else if (registration.waiting) {
            console.log('Service Worker installed, waiting');
        } else if (registration.active) {
            console.log('Service Worker active');
        }

        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

// Verifica e notifica sobre contas a vencer
export function checkAndNotifyDueBills() {
    if (Notification.permission !== 'granted') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);

    // Filtrar transações pendentes vencendo em breve
    const dueSoon = state.allTransactions.filter(t => {
        if (t.status === 'Pago' || t.type === 'Receita') return false;
        const dueDate = new Date(t.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= threeDays;
    });

    if (dueSoon.length === 0) return;

    // Enviar dados para o Service Worker
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_BILLS',
            bills: dueSoon.map(t => ({
                id: t.id,
                description: t.description,
                amount: t.amount,
                dueDate: t.dueDate,
                status: t.status
            }))
        });
    } else {
        // Fallback: mostrar notificação diretamente
        showLocalNotification(dueSoon);
    }
}

// Notificação local (fallback)
function showLocalNotification(bills) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueToday = bills.filter(b => {
        const d = new Date(b.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    let title, body;

    if (dueToday.length > 0) {
        title = '⚠️ Contas Vencendo HOJE!';
        body = `Você tem ${dueToday.length} conta(s) vencendo hoje.`;
    } else {
        title = '📅 Contas Próximas';
        body = `Você tem ${bills.length} conta(s) vencendo em breve.`;
    }

    new Notification(title, {
        body: body,
        icon: '/icon-192.png',
        tag: 'contas-vencer',
        requireInteraction: dueToday.length > 0
    });
}

// Agenda verificação diária de contas
export function scheduleDailyCheck() {
    // Verificar imediatamente
    setTimeout(() => {
        checkAndNotifyDueBills();
    }, 5000); // Espera 5 segundos após carregar

    // Verificar a cada 6 horas
    setInterval(() => {
        checkAndNotifyDueBills();
    }, 6 * 60 * 60 * 1000);

    // Notificar SW para agendar sync periódico
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_CHECK'
        });
    }
}

// Atualiza o ícone/botão de notificações na UI
export function updateNotificationUI() {
    const notifBtn = document.getElementById('toggleNotificationsBtn');
    if (!notifBtn) return;

    if (!isNotificationSupported()) {
        notifBtn.style.display = 'none';
        return;
    }

    const isEnabled = Notification.permission === 'granted';
    // Apenas muda a cor do botão, sem adicionar texto
    if (isEnabled) {
        notifBtn.classList.remove('text-amber-600', 'dark:text-amber-400');
        notifBtn.classList.add('text-green-600', 'dark:text-green-400', 'bg-green-100', 'dark:bg-green-900/30');
        notifBtn.title = 'Notificações Ativadas';
    } else {
        notifBtn.classList.remove('text-green-600', 'dark:text-green-400', 'bg-green-100', 'dark:bg-green-900/30');
        notifBtn.classList.add('text-amber-600', 'dark:text-amber-400');
        notifBtn.title = 'Ativar Notificações';
    }
}


// Listener para mensagens do Service Worker
export function setupServiceWorkerMessageListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CHECK_BILLS_REQUEST') {
            checkAndNotifyDueBills();
        }
    });
}

// Inicialização
export function initNotifications() {
    if (!isNotificationSupported()) return;

    // Registrar SW se ainda não estiver
    registerServiceWorker();

    // Configurar listener de mensagens
    setupServiceWorkerMessageListener();

    // Atualizar UI
    updateNotificationUI();

    // Se já tem permissão, agendar verificações
    if (Notification.permission === 'granted') {
        scheduleDailyCheck();
    }
}

console.log('Notifications module loaded');
