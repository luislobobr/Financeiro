// console.log("DEBUG: transactions_v2.js loaded");
import {
    getTransactionsCollectionRef,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from './firebase.js';
import { showToast, formatCurrency, formatDate, getCategoryIcon, today, showElement, hideElement } from './utils.js';
import { getElements, openTransactionModal } from './ui.js';
import { state } from './state.js'; // FIX: proper state import

// Helper to dispatch UI update event
const triggerUpdateUI = () => document.dispatchEvent(new CustomEvent('app-update-ui'));

let unsubscribeTransactions = null;

/**
 * Setup transaction listener
 */
export function setupTransactionListener() {
    if (unsubscribeTransactions) unsubscribeTransactions();

    const transCollectionRef = getTransactionsCollectionRef();
    const q = query(transCollectionRef, orderBy("dueDate", "desc"));

    const elements = getElements();

    unsubscribeTransactions = onSnapshot(q, (snapshot) => {
        state.allTransactions = [];
        snapshot.forEach(doc => {
            state.allTransactions.push({ id: doc.id, ...doc.data() });
        });

        triggerUpdateUI();

        hideElement(elements.loadingIndicator);
        showElement(elements.appContainer);
        showElement(elements.addTransactionBtn);

    }, (error) => {
        console.error("Erro ao ouvir transações:", error);
        hideElement(elements.loadingIndicator);
        showToast("Erro ao carregar dados. Verifique o console.", true);
    });
}

/**
 * Create future recurring transactions (12 months)
 */
export async function createFutureRecurringTransactions(baseTransaction) {
    try {
        const promises = [];
        const originalDueDate = new Date(baseTransaction.dueDate + 'T00:00:00');

        for (let i = 1; i <= 12; i++) {
            const nextTransaction = { ...baseTransaction };
            delete nextTransaction.id;

            const nextDueDate = new Date(originalDueDate.getFullYear(), originalDueDate.getMonth() + i, originalDueDate.getDate());

            if (nextDueDate.getDate() < originalDueDate.getDate()) {
                nextDueDate.setDate(0);
            }

            nextTransaction.dueDate = nextDueDate.toISOString().split('T')[0];
            nextTransaction.status = "A Pagar";
            nextTransaction.paymentDate = "";
            nextTransaction.createdAt = new Date().toISOString();

            promises.push(addDoc(getTransactionsCollectionRef(), nextTransaction));
        }

        await Promise.all(promises);
        showToast("12 contas recorrentes futuras foram criadas!");

    } catch (error) {
        console.error("Erro ao criar contas recorrentes:", error);
        showToast("Erro ao gerar contas recorrentes.", true);
    }
}

/**
 * Handle transaction form submit (add or update)
 */
export async function handleTransactionSubmit(e) {
    e.preventDefault();

    const elements = getElements();
    const formData = new FormData(elements.transactionForm);
    const amount = parseFloat(formData.get('amount'));

    if (isNaN(amount) || amount <= 0) {
        showToast("Por favor, insira um valor válido.", true);
        return;
    }

    const transactionData = {
        description: formData.get('description'),
        amount: amount,
        type: formData.get('type'),
        category: formData.get('category'),
        paidBy: formData.get('paidBy'),
        status: formData.get('status'),
        dueDate: formData.get('dueDate'),
        paymentDate: formData.get('paymentDate') || '',
        paymentMethod: formData.get('paymentMethod') || '',
        expenseType: formData.get('type') === 'Despesa' ? formData.get('expenseType') : '',
        isRecurring: formData.get('isRecurring') === 'on'
    };

    if (transactionData.status === 'Pago' && !transactionData.paymentDate) {
        transactionData.paymentDate = today;
    } else if (transactionData.status === 'A Pagar') {
        transactionData.paymentDate = '';
    }

    if (transactionData.type === 'Receita') {
        // Allow Receita to be A Pagar/Pago based on form
        // Only clear expense specific fields
        transactionData.expenseType = '';
    }

    try {
        if (state.currentEditId) {
            const docRef = doc(getTransactionsCollectionRef(), state.currentEditId);
            await updateDoc(docRef, transactionData);
            showToast("Transação atualizada!");
        } else {
            transactionData.createdAt = new Date().toISOString();
            await addDoc(getTransactionsCollectionRef(), transactionData);
            showToast("Transação adicionada!");

            if (transactionData.isRecurring) {
                await createFutureRecurringTransactions(transactionData);
            }
        }

        // Close modal - import dynamically to avoid circular dependency
        const { closeTransactionModal } = await import('./ui.js');
        closeTransactionModal();
    } catch (error) {
        console.error("Erro ao salvar transação:", error);
        showToast("Erro ao salvar transação.", true);
    }
}

/**
 * Handle delete transaction
 */
export async function handleDeleteTransaction(id) {
    try {
        const docRef = doc(getTransactionsCollectionRef(), id);
        await deleteDoc(docRef);
        showToast("Transação excluída!");
    } catch (error) {
        console.error("Erro ao excluir transação:", error);
        showToast("Não foi possível excluir a transação.", true);
    }
}

/**
 * Handle edit transaction
 */
export function handleEditTransaction(transaction) {
    const elements = getElements();
    state.currentEditId = transaction.id;

    elements.transactionForm.description.value = transaction.description;
    elements.transactionForm.amount.value = transaction.amount;
    elements.transactionForm.type.value = transaction.type;
    elements.transactionForm.category.value = transaction.category;
    elements.transactionForm.paidBy.value = transaction.paidBy;
    elements.transactionForm.status.value = transaction.status;
    elements.transactionForm.dueDate.value = transaction.dueDate;
    elements.transactionForm.paymentDate.value = transaction.paymentDate;
    elements.transactionForm.expenseType.value = transaction.expenseType || 'Variável';
    elements.transactionForm.isRecurring.checked = transaction.isRecurring || false;

    // Import and call UI functions + populate payment methods dropdown
    Promise.all([
        import('./ui.js'),
        import('./paymentMethods.js')
    ]).then(([ui, pm]) => {
        // Populate dropdown first, then set value
        pm.updatePaymentMethodDropdowns();
        elements.transactionForm.paymentMethod.value = transaction.paymentMethod || '';

        ui.togglePaymentDateVisibility();
        ui.toggleExpenseTypeVisibility();
        ui.openTransactionModal(true);
    });
}

/**
 * Handle mark as paid
 * @param {string} id - Transaction ID
 * @param {string} paymentMethod - Optional payment method ID
 */
export async function handleMarkAsPaid(id, paymentMethod = '') {
    try {
        const docRef = doc(getTransactionsCollectionRef(), id);
        const updateData = {
            status: "Pago",
            paymentDate: today
        };
        if (paymentMethod) {
            updateData.paymentMethod = paymentMethod;
        }
        await updateDoc(docRef, updateData);
        showToast("Conta marcada como paga!");

    } catch (error) {
        console.error("Erro ao marcar como pago:", error);
        showToast("Erro ao atualizar conta.", true);
    }
}

/**
 * Render generic transaction list
 * @param {HTMLElement} element - The list element to render into
 * @param {Array} transactions - Transactions to render
 * @param {HTMLElement} showEmptyStateEl - Empty state element
 * @param {boolean} showCheckbox - Whether to show selection checkboxes
 */
export function renderGenericTransactionList(element, transactions, showEmptyStateEl, showCheckbox = false) {
    element.innerHTML = '';

    if (transactions.length === 0) {
        showElement(showEmptyStateEl);
        return;
    }

    hideElement(showEmptyStateEl);

    transactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between';
        li.dataset.id = t.id;
        li.dataset.amount = t.amount;

        const amountColor = t.type === 'Receita' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
        const amountSign = t.type === 'Receita' ? '+' : '-';
        const iconColor = t.type === 'Receita' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : (
            t.status === 'Pago' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        );

        const isSelected = state.selectedPendingItems.includes(t.id);
        const checkboxHtml = showCheckbox ? `
            <input type="checkbox" class="pending-item-checkbox w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3" 
                   data-id="${t.id}" data-amount="${t.amount}" ${isSelected ? 'checked' : ''}>
        ` : '';

        const isOverdue = t.dueDate < today && t.status === 'A Pagar';

        li.innerHTML = `
            <div class="flex items-center mb-2 sm:mb-0 flex-grow mr-4">
                ${checkboxHtml}
                <div class="flex-shrink-0 h-10 w-10 rounded-full ${iconColor} flex items-center justify-center mr-3">
                    ${getCategoryIcon(t.category)}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-base font-medium text-gray-900 dark:text-gray-100 truncate ${isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : ''}">
                        ${t.description}
                        ${t.isRecurring ? `<span class="text-xs text-blue-500 ml-1">(Recorrente)</span>` : ''}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        ${t.status === 'Pago' ? `Pago em ${formatDate(t.paymentDate)}` : `Vence em ${formatDate(t.dueDate)}`}
                        · ${t.category}
                        ${t.expenseType ? `· ${t.expenseType}` : ''}
                        ${t.paymentMethod ? `<span class="text-xs text-purple-500 ml-1">(${t.paymentMethod})</span>` : ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end mt-2 sm:mt-0 flex-shrink-0">
                <span class="text-lg font-semibold ${amountColor} sm:mr-4">
                    ${amountSign} ${formatCurrency(t.amount)}
                </span>
                
                ${t.status === 'A Pagar' ? `
                <button title="Marcar como Pago" class="pay-btn p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-gray-700 rounded-full transition duration-300" data-id="${t.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
                ` : ''}
                
                <button title="Editar" class="edit-btn p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-full transition duration-300" data-id="${t.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button title="Excluir" class="delete-btn p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-gray-700 rounded-full transition duration-300" data-id="${t.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;

        const fullTransaction = state.allTransactions.find(trans => trans.id === t.id);

        li.querySelector('.delete-btn')?.addEventListener('click', () => handleDeleteTransaction(t.id));
        li.querySelector('.edit-btn')?.addEventListener('click', () => {
            if (fullTransaction) {
                handleEditTransaction(fullTransaction);
            } else {
                console.error("Não foi possível encontrar a transação para editar.");
            }
        });
        // Pay button opens confirmation modal
        li.querySelector('.pay-btn')?.addEventListener('click', () => {
            import('./ui.js').then(ui => ui.openConfirmPaymentModal(t.id));
        });

        element.appendChild(li);
    });
}
