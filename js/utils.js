/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

// Get today's date in YYYY-MM-DD format
export const today = new Date().toISOString().split('T')[0];

/**
 * Format a number as Brazilian Real currency
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Parse various date formats (Excel, DD/MM/YYYY, YYYY-MM-DD) to Date object
 */
export function parseDateFromSheet(dateValue) {
    if (dateValue instanceof Date) {
        return dateValue;
    }
    if (typeof dateValue === 'string') {
        if (dateValue.includes('/')) {
            const parts = dateValue.split('/');
            if (parts.length === 3) {
                return new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
            }
        } else if (dateValue.includes('-')) {
            return new Date(dateValue + 'T00:00:00');
        }
    }
    const dateObj = new Date(dateValue);
    if (dateObj && !isNaN(dateObj.getTime())) {
        return dateObj;
    }
    return null;
}

/**
 * Show an element by removing the 'hidden' class
 */
export function showElement(el) {
    if (el) el.classList.remove('hidden');
}

/**
 * Hide an element by adding the 'hidden' class
 */
export function hideElement(el) {
    if (el) el.classList.add('hidden');
}

/**
 * Copy text to clipboard
 */
export function copyToClipboard(text, button) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = 'Copiado!';
            button.classList.add('bg-green-600', 'text-white');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('bg-green-600', 'text-white');
            }, 2000);
        }
    } catch (err) {
        console.error('Falha ao copiar:', err);
    }
    document.body.removeChild(textarea);
}

// Toast notification element reference
let toastNotification = null;

/**
 * Set the toast notification element
 */
export function setToastElement(element) {
    toastNotification = element;
}

/**
 * Show a toast notification
 */
export function showToast(message, isError = false) {
    if (!toastNotification) {
        console.warn('Toast element not set');
        return;
    }
    toastNotification.textContent = message;
    toastNotification.classList.remove('bg-green-600', 'bg-red-600');
    if (isError) {
        toastNotification.classList.add('bg-red-600');
    } else {
        toastNotification.classList.add('bg-green-600');
    }
    toastNotification.classList.remove('hidden', 'translate-x-[200%]');
    toastNotification.classList.add('translate-x-0');

    setTimeout(() => {
        toastNotification.classList.remove('translate-x-0');
        toastNotification.classList.add('translate-x-[200%]');
        setTimeout(() => toastNotification.classList.add('hidden'), 300);
    }, 3000);
}

/**
 * Get SVG icon for a category
 */
export function getCategoryIcon(category) {
    const icons = {
        'Moradia': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-4a1 1 0 001 1h2a1 1 0 001-1v-1a1 1 0 00-1-1h-2a1 1 0 00-1 1v1z" /></svg>`,
        'Alimentação': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M12 14.5v-5" /></svg>`,
        'Transporte': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75c-2.4 0-4.5-2.03-4.5-4.5s2.1-4.5 4.5-4.5 4.5 2.03 4.5 4.5-2.1 4.5-4.5 4.5zM12 4.5v2.25m-6.364 1.909l1.591 1.591m-3.282 3.282h2.25m1.909 6.364l1.591-1.591m3.282 3.282v-2.25m6.364-1.909l-1.591-1.591m3.282-3.282h-2.25m-1.909-6.364l-1.591 1.591" /></svg>`,
        'Lazer': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>`,
        'Saúde': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m-3-3V8m0 4h.01M12 16h.01" /></svg>`,
        'Conta de Energia': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3c-3.866 0-7 3.134-7 7 0 3.402 2.103 6.26 5 6.87V21h4v-4.13c2.897-.61 5-3.468 5-6.87 0-3.866-3.134-7-7-7z" /></svg>`,
        'Conta de Água': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-1.7-9.7C13.4 9.1 12.3 9 11 9c-2.4 0-4.6.9-6.2 2.3A4 4 0 003 15zM12 19v2M8 19v2m8-2v2" /></svg>`,
        'Internet': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.5a4 4 0 015.778 0M5 13.414a8 8 0 0114 0M1.889 10.328a12 12 0 0120.222 0" /></svg>`,
        'Salário': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" /><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 10.5v3m-6.495-6.495l-2.122 2.122m-5.656 5.656l-2.122 2.122m12.728-2.122l2.122 2.122M4.75 10.5v3M12 21V3" /></svg>`,
        'Outros': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>`
    };
    return icons[category] || icons['Outros'];
}

export const isMobile = window.innerWidth <= 768;

// Category color constants
export const categoryColors = {
    'Moradia': '#3b82f6', 'Alimentação': '#22c55e', 'Transporte': '#eab308',
    'Lazer': '#ec4899', 'Saúde': '#8b5cf6', 'Conta de Energia': '#f59e0b',
    'Conta de Água': '#06b6d4', 'Internet': '#4f46e5', 'Salário': '#14b8a6', 'Outros': '#6b7280',
};

export const categoryColorClasses = {
    'Moradia': 'bg-blue-500', 'Alimentação': 'bg-green-500', 'Transporte': 'bg-yellow-500',
    'Lazer': 'bg-pink-500', 'Saúde': 'bg-violet-500', 'Conta de Energia': 'bg-amber-500',
    'Conta de Água': 'bg-cyan-500', 'Internet': 'bg-indigo-600', 'Salário': 'bg-teal-500', 'Outros': 'bg-gray-500',
};

// Date helper functions
export function getCurrentMonthDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

export function getNextMonthDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

export function getLastMonthDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

export function getLast3MonthsDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}
