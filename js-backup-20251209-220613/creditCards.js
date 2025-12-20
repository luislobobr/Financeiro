/**
 * Credit Cards Module
 * Handles credit card management
 */

import { getCreditCardsDocRef, onSnapshot, setDoc } from './firebase.js';
import { showToast, formatCurrency, formatDate } from './utils.js';
import { getElements, showElement, hideElement } from './ui.js';
import { state } from './state.js';

let unsubscribeCreditCards = null;

/**
 * Setup credit cards listener
 */
export function setupCreditCardsListener() {
    if (unsubscribeCreditCards) unsubscribeCreditCards();

    const creditCardsDocRef = getCreditCardsDocRef();
    unsubscribeCreditCards = onSnapshot(creditCardsDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
            state.creditCards = docSnap.data().list;
        } else {
            state.creditCards = [];
            if (!docSnap.exists()) {
                setDoc(creditCardsDocRef, { list: [] }, { merge: true })
                    .catch(e => console.error("Erro ao criar doc de cartões:", e));
            }
        }

        renderCreditCardsList();
        renderCreditCardsPage();
    }, (error) => {
        console.error("Erro ao ouvir cartões de crédito:", error);
    });
}

/**
 * Populate credit card select
 */
export function populateCreditCardSelect() {
    const elements = getElements();
    if (!elements.creditCardSelect) return;

    elements.creditCardSelect.innerHTML = '<option value="">Selecionar Cartão</option>';

    state.creditCards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.name;
        option.textContent = `${card.name} (Vencimento: dia ${card.dueDay})`;
        elements.creditCardSelect.appendChild(option);
    });
}

/**
 * Render credit cards list in modal
 */
export function renderCreditCardsList() {
    const elements = getElements();
    if (!elements.creditCardsList) return;

    elements.creditCardsList.innerHTML = '';

    if (state.creditCards.length === 0) {
        elements.creditCardsList.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                Nenhum cartão cadastrado.
            </div>
        `;
        return;
    }

    state.creditCards.forEach((card, index) => {
        const cardItem = document.createElement('div');
        cardItem.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
        cardItem.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center">
                    <span class="w-3 h-3 rounded-full mr-3 bg-blue-500"></span>
                    <span class="text-gray-700 dark:text-gray-300 font-medium">${card.name}</span>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Vencimento: dia ${card.dueDay} | Limite: ${formatCurrency(card.limit)}
                </div>
            </div>
            <div class="flex space-x-2">
                <button class="edit-card-btn p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="delete-card-btn p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
        elements.creditCardsList.appendChild(cardItem);
    });

    // Add event listeners
    document.querySelectorAll('.edit-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            editCreditCard(index);
        });
    });

    document.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            deleteCreditCard(index);
        });
    });
}

/**
 * Render credit cards page
 */
export function renderCreditCardsPage() {
    const cardsContainer = document.querySelector('#page-credit-cards .grid');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '';

    if (state.creditCards.length === 0) {
        cardsContainer.innerHTML = `
            <div class="md:col-span-2 lg:col-span-3 text-center text-gray-500 dark:text-gray-400 py-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h4 class="mt-2 text-lg font-semibold dark:text-gray-300">Nenhum cartão cadastrado</h4>
                <p class="mt-1 text-sm">Adicione cartões para começar a controlar suas faturas.</p>
            </div>
        `;
        return;
    }

    state.creditCards.forEach(card => {
        const cardTransactions = state.allTransactions.filter(t =>
            t.creditCard === card.name && t.status === 'A Pagar'
        );

        const totalSpent = cardTransactions.reduce((sum, t) => sum + t.amount, 0);
        const availableLimit = card.limit - totalSpent;
        const usagePercentage = (totalSpent / card.limit) * 100;

        const cardElement = document.createElement('div');
        cardElement.className = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-500';
        cardElement.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">${card.name}</h3>
                <span class="text-sm text-gray-500 dark:text-gray-400">Vencimento: dia ${card.dueDay}</span>
            </div>
            <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Limite disponível</span>
                    <span>${formatCurrency(availableLimit)}</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(usagePercentage, 100)}%"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="text-gray-500 dark:text-gray-400">Limite total</p>
                    <p class="font-semibold text-gray-800 dark:text-gray-200">${formatCurrency(card.limit)}</p>
                </div>
                <div>
                    <p class="text-gray-500 dark:text-gray-400">Gasto atual</p>
                    <p class="font-semibold ${totalSpent > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-800 dark:text-gray-200'}">${formatCurrency(totalSpent)}</p>
                </div>
            </div>
        `;

        cardsContainer.appendChild(cardElement);
    });

    renderOpenInvoices();
    renderInvoicesHistory();
}

/**
 * Render open invoices
 */
export function renderOpenInvoices() {
    const elements = getElements();
    if (!elements.openInvoicesContainer) return;

    elements.openInvoicesContainer.innerHTML = '';

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    let hasOpenInvoices = false;

    state.creditCards.forEach(card => {
        const nextDueDate = new Date(currentYear, currentMonth - 1, card.dueDay);
        if (nextDueDate < new Date()) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

        const invoiceTransactions = state.allTransactions.filter(t =>
            t.creditCard === card.name &&
            t.status === 'A Pagar' &&
            t.dueDate <= nextDueDateStr
        );

        if (invoiceTransactions.length > 0) {
            hasOpenInvoices = true;
            const totalAmount = invoiceTransactions.reduce((sum, t) => sum + t.amount, 0);

            const invoiceElement = document.createElement('div');
            invoiceElement.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow border';
            invoiceElement.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-semibold text-gray-800 dark:text-gray-200">${card.name}</h4>
                    <span class="text-sm text-gray-500 dark:text-gray-400">Vence em ${formatDate(nextDueDateStr)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-red-600 dark:text-red-500">${formatCurrency(totalAmount)}</span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">${invoiceTransactions.length} itens</span>
                </div>
            `;

            elements.openInvoicesContainer.appendChild(invoiceElement);
        }
    });

    if (!hasOpenInvoices) {
        elements.openInvoicesContainer.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 class="mt-2 text-md font-semibold text-gray-700 dark:text-gray-300">Nenhuma fatura em aberto!</h4>
            </div>
        `;
    }
}

/**
 * Render invoices history
 */
export function renderInvoicesHistory() {
    const elements = getElements();
    if (!elements.invoicesHistoryContainer) return;

    elements.invoicesHistoryContainer.innerHTML = '';

    const paidCreditCardTransactions = state.allTransactions.filter(t =>
        t.creditCard && t.status === 'Pago'
    ).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 6);

    if (paidCreditCardTransactions.length === 0) {
        elements.invoicesHistoryContainer.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 class="mt-2 text-md font-semibold text-gray-700 dark:text-gray-300">Nenhuma fatura no histórico</h4>
            </div>
        `;
        return;
    }

    paidCreditCardTransactions.forEach(transaction => {
        const invoiceElement = document.createElement('div');
        invoiceElement.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow border';
        invoiceElement.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-semibold text-gray-800 dark:text-gray-200">${transaction.creditCard}</h4>
                <span class="text-sm text-gray-500 dark:text-gray-400">Pago em ${formatDate(transaction.paymentDate)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">${transaction.description}</span>
                <span class="text-lg font-bold text-green-600 dark:text-green-500">${formatCurrency(transaction.amount)}</span>
            </div>
        `;

        elements.invoicesHistoryContainer.appendChild(invoiceElement);
    });
}

/**
 * Handle add credit card
 */
export async function handleAddCreditCard(e) {
    e.preventDefault();
    const elements = getElements();
    const newCardName = elements.newCardNameInput.value.trim();
    const newCardDueDay = parseInt(elements.newCardDueDayInput.value, 10);
    const newCardLimit = parseFloat(elements.newCardLimitInput.value);

    if (!newCardName) {
        showToast("Por favor, insira um nome para o cartão.", true);
        return;
    }

    if (isNaN(newCardDueDay) || newCardDueDay < 1 || newCardDueDay > 31) {
        showToast("Por favor, insira um dia de vencimento válido (1-31).", true);
        return;
    }

    if (isNaN(newCardLimit) || newCardLimit <= 0) {
        showToast("Por favor, insira um limite válido.", true);
        return;
    }

    if (state.creditCards.some(card => card.name === newCardName)) {
        showToast("Este cartão já existe.", true);
        return;
    }

    try {
        const newCard = {
            name: newCardName,
            dueDay: newCardDueDay,
            limit: newCardLimit
        };

        const updatedCards = [...state.creditCards, newCard];
        await setDoc(getCreditCardsDocRef(), { list: updatedCards }, { merge: true });

        elements.newCardNameInput.value = '';
        elements.newCardDueDayInput.value = '';
        elements.newCardLimitInput.value = '';

        showToast("Cartão adicionado com sucesso!");
    } catch (error) {
        console.error("Erro ao adicionar cartão:", error);
        showToast("Erro ao adicionar cartão.", true);
    }
}

/**
 * Edit credit card
 */
export async function editCreditCard(index) {
    const currentCard = state.creditCards[index];

    let newCardName = prompt("Editar nome do cartão:", currentCard.name);
    if (newCardName === null) return;

    newCardName = newCardName.trim();
    if (!newCardName) {
        showToast("Nome do cartão não pode estar vazio.", true);
        return;
    }

    let newCardDueDayStr = prompt("Editar dia de vencimento (1-31):", currentCard.dueDay.toString());
    if (newCardDueDayStr === null) return;

    const newCardDueDay = parseInt(newCardDueDayStr, 10);
    if (isNaN(newCardDueDay) || newCardDueDay < 1 || newCardDueDay > 31) {
        showToast("Dia de vencimento inválido. Deve ser um número entre 1 e 31.", true);
        return;
    }

    let newCardLimitStr = prompt("Editar limite do cartão:", currentCard.limit.toString());
    if (newCardLimitStr === null) return;

    const newCardLimit = parseFloat(newCardLimitStr.replace(',', '.'));
    if (isNaN(newCardLimit) || newCardLimit <= 0) {
        showToast("Limite inválido. Deve ser um número maior que zero.", true);
        return;
    }

    const isNameDuplicate = state.creditCards.some((card, i) =>
        i !== index && card.name.toLowerCase() === newCardName.toLowerCase()
    );

    if (isNameDuplicate) {
        showToast("Já existe um cartão com este nome.", true);
        return;
    }

    try {
        const updatedCards = [...state.creditCards];
        updatedCards[index] = {
            name: newCardName,
            dueDay: newCardDueDay,
            limit: newCardLimit
        };

        await setDoc(getCreditCardsDocRef(), { list: updatedCards }, { merge: true });
        showToast("Cartão atualizado com sucesso!");
    } catch (error) {
        console.error("Erro ao editar cartão:", error);
        showToast("Erro ao editar cartão: " + error.message, true);
    }
}

/**
 * Delete credit card
 */
export async function deleteCreditCard(index) {
    const cardToDelete = state.creditCards[index];

    const isCardUsed = state.allTransactions.some(t => t.creditCard === cardToDelete.name);

    if (isCardUsed) {
        showToast("Não é possível excluir este cartão pois ele está sendo usado em transações.", true);
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir o cartão "${cardToDelete.name}"?`)) {
        return;
    }

    try {
        const updatedCards = state.creditCards.filter((_, i) => i !== index);
        await setDoc(getCreditCardsDocRef(), { list: updatedCards }, { merge: true });
        showToast("Cartão excluído com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir cartão:", error);
        showToast("Erro ao excluir cartão.", true);
    }
}

/**
 * Open credit cards modal
 */
export function openCreditCardsModal() {
    const elements = getElements();
    showElement(elements.creditCardsModal);
}

/**
 * Close credit cards modal
 */
export function closeCreditCardsModal() {
    const elements = getElements();
    hideElement(elements.creditCardsModal);
}
