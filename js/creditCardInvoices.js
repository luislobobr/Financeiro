import { state } from './state.js';
import { getElements } from './ui.js';
import { formatCurrency, formatDate, today } from './utils.js'; // Ensure 'today' is exported from utils.js or use new Date
import { openTransactionModal } from './ui.js';

/**
 * Populate Month Filter Dropdown
 */
function populateMonthFilter() {
    const elements = getElements();
    if (!elements.creditCardMonthFilter) return;

    // Get all unique invoice months from credit card transactions
    const cardTransactions = state.allTransactions.filter(t =>
        t.paymentMethod === 'credito' && t.cardId && t.invoiceMonth
    );

    const uniqueMonths = [...new Set(cardTransactions.map(t => t.invoiceMonth))];
    uniqueMonths.sort().reverse(); // Most recent first

    // Keep "Todos os Meses" option
    const currentValue = elements.creditCardMonthFilter.value;
    elements.creditCardMonthFilter.innerHTML = '<option value="all">Todos os Meses</option>';

    uniqueMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        const monthDate = new Date(month + '-02');
        const monthName = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        elements.creditCardMonthFilter.appendChild(option);
    });

    // Restore previous selection if still valid
    if (currentValue && (currentValue === 'all' || uniqueMonths.includes(currentValue))) {
        elements.creditCardMonthFilter.value = currentValue;
    }
}

/**
 * Render the Credit Cards Invoices Page
 * @param {string} selectedMonth - Filter by specific month (format: YYYY-MM) or 'all' for all months
 */
export function renderCreditCardsPage(selectedMonth = 'all') {
    const elements = getElements();
    const container = document.getElementById('creditCardsPageContent');
    if (!container) return;

    // Populate month filter dropdown
    populateMonthFilter();

    container.innerHTML = '<div class="text-center py-4"><div class="spinner border-4 border-blue-500 rounded-full w-8 h-8 mx-auto"></div></div>';

    // 1. Filter Credit Card Transactions
    const cardTransactions = state.allTransactions.filter(t =>
        t.paymentMethod === 'credito' && t.cardId && t.invoiceMonth
    );

    // 2. Group by Card -> Month
    const grouped = {}; // { cardId: { card: {}, invoices: { month: { total: 0, transactions: [] } } } }

    state.creditCards.forEach(card => {
        grouped[card.id] = {
            card: card,
            invoices: {}
        };
    });

    // Populate Groups
    cardTransactions.forEach(t => {
        if (!grouped[t.cardId]) return; // Card might have been deleted?

        // Apply month filter
        if (selectedMonth !== 'all' && t.invoiceMonth !== selectedMonth) {
            return; // Skip transactions not in selected month
        }

        if (!grouped[t.cardId].invoices[t.invoiceMonth]) {
            grouped[t.cardId].invoices[t.invoiceMonth] = {
                total: 0,
                status: t.status, // Assuming invoice status logic might be needed later
                transactions: []
            };
        }

        grouped[t.cardId].invoices[t.invoiceMonth].transactions.push(t);
        grouped[t.cardId].invoices[t.invoiceMonth].total += t.amount;
    });

    // 3. Render
    container.innerHTML = '';

    if (Object.keys(grouped).length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Nenhum cartão cadastrado.</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';

    Object.values(grouped).forEach(group => {
        const cardCard = createCardComponent(group, selectedMonth);
        grid.appendChild(cardCard);
    });

    container.appendChild(grid);

    // Event delegation for delete buttons (works even when elements are hidden)
    container.addEventListener('click', async (e) => {
        // Check if click is on delete button or its children (SVG path)
        const deleteBtn = e.target.classList.contains('delete-card-transaction-btn')
            ? e.target
            : e.target.closest('.delete-card-transaction-btn');

        if (deleteBtn) {
            console.log('Delete button clicked!', deleteBtn.dataset.id);
            e.preventDefault();
            e.stopPropagation();

            const transactionId = deleteBtn.dataset.id;
            if (!transactionId) {
                console.error('Transaction ID not found!');
                alert('Erro: ID da transação não encontrado');
                return;
            }

            console.log('Starting deletion directly...');
            try {
                const { handleDeleteTransaction } = await import('./transactions.js');
                console.log('handleDeleteTransaction imported, calling it...');
                await handleDeleteTransaction(transactionId);
                console.log('Transaction deleted successfully!');
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                alert('Erro ao excluir transação: ' + error.message);
            }
        }
    });
}

function createCardComponent(group, selectedMonth = 'all') {
    const card = group.card;
    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden';

    // Header
    div.innerHTML = `
        <div class="bg-gradient-to-r from-gray-800 to-gray-900 p-4 text-white flex justify-between items-center">
            <div>
                <h3 class="font-bold text-lg">${card.name}</h3>
                <p class="text-xs text-gray-400">Titular: ${card.holder}</p>
            </div>
            <div class="text-right text-xs">
                <p>Fecha dia: <span class="font-mono text-yellow-400">${card.closingDay}</span></p>
                <p>Vence dia: <span class="font-mono text-red-400">${card.dueDay}</span></p>
            </div>
        </div>
        <div class="p-4 space-y-4">
            ${Object.keys(group.invoices).length === 0
            ? `<p class="text-center text-sm text-gray-500">${selectedMonth === 'all' ? 'Nenhuma fatura encontrada.' : 'Nenhuma fatura neste período.'}</p>`
            : ''}
        </div>
    `;

    const invoicesContainer = div.querySelector('.p-4');

    // Sort invoices descending (newest first)
    const sortedMonths = Object.keys(group.invoices).sort().reverse();

    sortedMonths.forEach(month => {
        const invoice = group.invoices[month];
        const monthDate = new Date(month + '-02'); // Avoid timezone issues
        const monthName = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        // Check if Paid
        const paidTransaction = state.allTransactions.find(t =>
            t.isInvoicePayment &&
            t.cardId === card.id &&
            t.invoiceMonth === month
        );

        const isPaid = !!paidTransaction;

        const invoiceDiv = document.createElement('div');
        invoiceDiv.className = `border ${isPaid ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'} rounded-lg overflow-hidden`;

        // Invoice Header
        const headerId = `header-${card.id}-${month}`;
        const contentId = `content-${card.id}-${month}`;

        // Status Badge Logic
        let statusBadge = '';
        if (isPaid) {
            statusBadge = `<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ml-2">PAGO</span>`;
        } else {
            statusBadge = `<span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 ml-2">ABERTA</span>`;
        }

        invoiceDiv.innerHTML = `
            <div class="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700">
                <button class="flex items-center flex-grow text-left hover:underline" onclick="document.getElementById('${contentId}').classList.toggle('hidden')">
                    <span class="text-sm font-bold text-gray-700 dark:text-gray-200">${capitalizedMonth}</span>
                    ${statusBadge}
                </button>
                <div class="flex items-center">
                    <span class="font-bold text-gray-800 dark:text-gray-100 mr-3">${formatCurrency(invoice.total)}</span>
                    ${!isPaid ? `
                        <button class="pay-invoice-btn bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded transition-colors"
                                data-card-id="${card.id}" data-month="${month}" data-total="${invoice.total}"
                                title="Pagar Fatura">
                            Pagar
                        </button>
                    ` : `
                        <button class="text-xs text-gray-500 hover:text-red-500" onclick="alert('Funcionalidade de estornar ainda não implementada')">
                           ↺
                        </button>
                    `}
                </div>
            </div>
            <div id="${contentId}" class="hidden bg-white dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-700">
                <ul class="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                    ${invoice.transactions.map(t => `
                        <li class="py-2 flex justify-between items-center text-xs">
                            <div class="flex flex-col flex-1">
                                <span class="text-gray-700 dark:text-gray-300 font-medium">${t.description}</span>
                                <span class="text-gray-400">${formatDate(t.dueDate)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-gray-800 dark:text-gray-200 font-semibold">${formatCurrency(t.amount)}</span>
                                <button class="delete-card-transaction-btn text-gray-400 hover:text-red-500 p-1"
                                        data-id="${t.id}" title="Excluir transação">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        invoicesContainer.appendChild(invoiceDiv);

        // Add Listener to Pay Button

        const payBtn = invoiceDiv.querySelector('.pay-invoice-btn');
        if (payBtn) {
            payBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openTransactionModal(false, {
                    description: `Fatura ${card.name} - ${month}`,
                    amount: invoice.total,
                    isInvoicePayment: true,
                    invoiceCardId: card.id,
                    invoiceMonthDate: month, // Must match hidden field ID in index.html and ui.js overrides
                    category: 'Despesas com Cartão',
                    paidBy: 'Eu',
                    type: 'Despesa',
                    expenseType: 'Fixa',
                    status: 'Pago'
                });
            });
        }
    });

    return div;
}
