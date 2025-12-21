/**
 * Subscriptions Module
 * Manages recurring transactions (subscriptions, monthly bills, etc.)
 */

import { state } from './state.js';
import { getElements } from './ui.js';
import { formatCurrency, formatDate, today, showElement, hideElement } from './utils.js';
import { getTransactionsCollectionRef, deleteDoc, doc } from './firebase.js';
import { handleEditTransaction } from './transactions.js';

/**
 * Get all active subscriptions
 * @returns {Array} Array of subscription groups
 */
export function getActiveSubscriptions() {
    // Filter recurring transactions
    const recurringTransactions = state.allTransactions.filter(t => t.isRecurring === true);

    // Group by description (base name without date info)
    const groups = {};

    recurringTransactions.forEach(t => {
        // Use description as key for grouping
        const key = t.description;

        if (!groups[key]) {
            groups[key] = {
                description: t.description,
                category: t.category,
                amount: t.amount,
                type: t.type,
                paidBy: t.paidBy,
                transactions: [],
                nextDueDate: null,
                futureCount: 0
            };
        }

        groups[key].transactions.push(t);

        // Find next due date (future transactions)
        if (t.dueDate >= today && t.status === 'A Pagar') {
            if (!groups[key].nextDueDate || t.dueDate < groups[key].nextDueDate) {
                groups[key].nextDueDate = t.dueDate;
            }
            groups[key].futureCount++;
        }
    });

    // Convert to array and sort by next due date
    return Object.values(groups)
        .filter(g => g.futureCount > 0) // Only subscriptions with future transactions
        .sort((a, b) => {
            if (!a.nextDueDate) return 1;
            if (!b.nextDueDate) return -1;
            return a.nextDueDate.localeCompare(b.nextDueDate);
        });
}

/**
 * Calculate total monthly commitment from subscriptions
 * @returns {number} Total monthly amount
 */
export function calculateMonthlyCommitment() {
    const subscriptions = getActiveSubscriptions();
    return subscriptions.reduce((total, sub) => total + sub.amount, 0);
}

/**
 * Get future commitments for next N months
 * @param {number} months - Number of months to project
 * @returns {Array} Array of monthly projections
 */
export function getFutureCommitments(months = 3) {
    const projections = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthStart = targetMonth.toISOString().split('T')[0];
        const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).toISOString().split('T')[0];

        // Filter recurring transactions for this month
        const monthlyRecurring = state.allTransactions.filter(t =>
            t.isRecurring === true &&
            t.type === 'Despesa' &&
            t.dueDate >= monthStart &&
            t.dueDate <= monthEnd
        );

        const total = monthlyRecurring.reduce((sum, t) => sum + t.amount, 0);

        projections.push({
            month: targetMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
            monthDate: monthStart.substring(0, 7), // YYYY-MM
            total: total,
            count: monthlyRecurring.length
        });
    }

    return projections;
}

/**
 * Cancel a subscription (delete all future transactions)
 * @param {string} description - Subscription description to cancel
 */
export async function cancelSubscription(description) {
    if (!confirm(`Tem certeza que deseja cancelar a assinatura "${description}"?\n\nTodos os lançamentos futuros serão deletados.`)) {
        return;
    }

    try {
        // Find all future transactions for this subscription
        const futureTransactions = state.allTransactions.filter(t =>
            t.isRecurring === true &&
            t.description === description &&
            t.dueDate >= today &&
            t.status === 'A Pagar'
        );

        if (futureTransactions.length === 0) {
            alert('Nenhum lançamento futuro encontrado para esta assinatura.');
            return;
        }

        // Delete all future transactions
        const deletePromises = futureTransactions.map(t =>
            deleteDoc(doc(getTransactionsCollectionRef(), t.id))
        );

        await Promise.all(deletePromises);

        const { showToast } = await import('./utils.js');
        showToast(`Assinatura cancelada! ${futureTransactions.length} lançamento(s) futuro(s) deletado(s).`);

        // Re-render page
        renderSubscriptionsPage();

    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        alert('Erro ao cancelar assinatura: ' + error.message);
    }
}

/**
 * Render the subscriptions page
 */
export function renderSubscriptionsPage() {
    const container = document.getElementById('subscriptionsPageContent');
    if (!container) return;

    const subscriptions = getActiveSubscriptions();
    const monthlyTotal = calculateMonthlyCommitment();
    const futureCommitments = getFutureCommitments(3);

    container.innerHTML = `
        <!-- Header Stats -->
        <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-blue-100 text-sm font-medium">Compromisso Mensal</p>
                        <p class="text-3xl font-bold mt-1">${formatCurrency(monthlyTotal)}</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-purple-100 text-sm font-medium">Assinaturas Ativas</p>
                        <p class="text-3xl font-bold mt-1">${subscriptions.length}</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-green-100 text-sm font-medium">Próximo Vencimento</p>
                        <p class="text-xl font-bold mt-1">${subscriptions.length > 0 && subscriptions[0].nextDueDate ? formatDate(subscriptions[0].nextDueDate) : 'N/A'}</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Future Projections -->
        <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div class="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <h3 class="text-lg font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Projeção de Compromissos
                </h3>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                ${futureCommitments.map((proj, index) => `
                    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <p class="text-sm text-gray-500 dark:text-gray-400 font-medium capitalize">${proj.month}</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">${formatCurrency(proj.total)}</p>
                        <p class="text-xs text-gray-400 mt-1">${proj.count} assinatura(s)</p>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Subscriptions List -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Assinaturas Ativas
                </h3>
            </div>
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
                ${subscriptions.length === 0 ? `
                    <div class="p-8 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">Nenhuma assinatura ativa</p>
                        <p class="text-gray-400 dark:text-gray-500 text-sm mt-2">Crie uma transação recorrente para vê-la aqui</p>
                    </div>
                ` : subscriptions.map(sub => `
                    <div class="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <h4 class="text-lg font-semibold text-gray-900 dark:text-white">${sub.description}</h4>
                                    <span class="px-2 py-1 text-xs font-medium rounded-full ${sub.type === 'Despesa' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}">
                                        ${sub.type}
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span class="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        ${sub.category}
                                    </span>
                                    <span class="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        ${sub.paidBy}
                                    </span>
                                    <span class="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Próximo: ${formatDate(sub.nextDueDate)}
                                    </span>
                                    <span class="flex items-center text-blue-600 dark:text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        ${sub.futureCount} lançamento(s) futuro(s)
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-4 ml-4">
                                <div class="text-right">
                                    <p class="text-2xl font-bold ${sub.type === 'Despesa' ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}">
                                        ${sub.type === 'Despesa' ? '-' : '+'} ${formatCurrency(sub.amount)}
                                    </p>
                                    <p class="text-xs text-gray-400">por mês</p>
                                </div>
                                <button class="cancel-subscription-btn p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                                        data-description="${sub.description}" 
                                        title="Cancelar assinatura">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Setup event listeners
    setupSubscriptionsListeners();
}

/**
 * Setup event listeners for subscriptions page
 */
export function setupSubscriptionsListeners() {
    // Cancel subscription buttons
    document.querySelectorAll('.cancel-subscription-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const description = btn.dataset.description;
            cancelSubscription(description);
        });
    });
}
