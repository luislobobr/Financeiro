/**
 * Credit Cards Module
 * Manages credit cards functionality
 */

import { getCreditCardsDocRef, onSnapshot, setDoc, getDoc } from './firebase.js';
import { state } from './state.js';
import { showToast, showElement, hideElement } from './utils.js';
import { getElements } from './ui.js';

/**
 * Setup listener for credit cards
 */
export function setupCreditCardsListener() {
    const docRef = getCreditCardsDocRef();

    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            state.creditCards = docSnap.data().cards || [];
        } else {
            // Create empty array by default
            state.creditCards = [];
            setDoc(docRef, { cards: [] })
                .catch(e => console.error("Erro ao criar documento de cartões:", e));
        }
        renderCreditCardsList();
        updateCreditCardDropdown();

        // Re-render credit cards page if it's currently visible
        const elements = getElements();
        if (elements.pageCreditCards && !elements.pageCreditCards.classList.contains('hidden')) {
            // Import dynamically to avoid circular dependency
            import('./creditCardInvoices.js').then(module => {
                module.renderCreditCardsPage();
            });
        }
        document.dispatchEvent(new CustomEvent('credit-cards-updated'));
    }, (error) => {
        console.error("Erro ao ouvir cartões de crédito:", error);
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
        elements.creditCardsList.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum cartão cadastrado.</p>';
        return;
    }

    state.creditCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-3';
        cardEl.innerHTML = `
            <div>
                <div class="flex items-center">
                    <span class="text-xl mr-2">💳</span>
                    <h4 class="font-bold text-gray-800 dark:text-gray-200">${card.name}</h4>
                    <span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">${card.holder}</span>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Fecha dia <strong>${card.closingDay}</strong> • Vence dia <strong>${card.dueDay}</strong>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button data-id="${card.id}" class="edit-card-btn text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Editar cartão">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button data-id="${card.id}" class="delete-card-btn text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Excluir cartão">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
        elements.creditCardsList.appendChild(cardEl);
    });

    // Add event listeners for edit buttons
    elements.creditCardsList.querySelectorAll('.edit-card-btn').forEach(btn => {
        btn.addEventListener('click', () => handleEditCreditCard(btn.dataset.id));
    });

    // Add event listeners for delete buttons
    elements.creditCardsList.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteCreditCard(btn.dataset.id));
    });
}


/**
 * Handle add credit card
 */
export async function handleAddCreditCard(e) {
    if (e) e.preventDefault();
    const elements = getElements();

    const name = elements.newCardName.value.trim();
    const holder = elements.newCardHolder.value;
    const closingDay = parseInt(elements.newCardClosingDay.value);
    const dueDay = parseInt(elements.newCardDueDay.value);

    // Validações
    if (!name) {
        showToast("Digite o nome do cartão.", true);
        return;
    }
    if (!closingDay || closingDay < 1 || closingDay > 31) {
        showToast("Dia de fechamento inválido.", true);
        return;
    }
    if (!dueDay || dueDay < 1 || dueDay > 31) {
        showToast("Dia de vencimento inválido.", true);
        return;
    }

    const id = 'card_' + Date.now(); // Simple ID generation

    const newCard = {
        id,
        name,
        holder,
        closingDay,
        dueDay
    };

    try {
        const newCards = [...(state.creditCards || []), newCard];
        await setDoc(getCreditCardsDocRef(), { cards: newCards });

        // Reset inputs
        elements.newCardName.value = '';
        elements.newCardClosingDay.value = '';
        elements.newCardDueDay.value = '';
        elements.newCardName.focus();

        showToast("Cartão adicionado com sucesso!");
    } catch (error) {
        console.error("Erro ao adicionar cartão:", error);
        showToast("Erro ao adicionar cartão.", true);
    }
}

/**
 * Handle delete credit card
 */
export async function handleDeleteCreditCard(id) {
    if (!confirm("Tem certeza que deseja remover este cartão? As faturas históricas podem ser afetadas.")) return;

    try {
        const newCards = state.creditCards.filter(c => c.id !== id);
        await setDoc(getCreditCardsDocRef(), { cards: newCards });
        showToast("Cartão removido!");
    } catch (error) {
        console.error("Erro ao remover cartão:", error);
        showToast("Erro ao remover cartão.", true);
    }
}

/**
 * Get sorted credit cards
 */
export function getSortedCreditCards() {
    return (state.creditCards || []).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update credit card dropdown in transaction modal
 */
export function updateCreditCardDropdown() {
    const elements = getElements();
    if (!elements.cardSelect) return;

    const currentValue = elements.cardSelect.value;
    elements.cardSelect.innerHTML = '<option value="">Selecione o Cartão...</option>';

    const sortedCards = getSortedCreditCards();
    sortedCards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = `${card.name} (Final ${card.id.substr(-4)}) - ${card.holder}`;
        elements.cardSelect.appendChild(option);
    });

    if (currentValue) {
        elements.cardSelect.value = currentValue;
    }
}

// Store the card being edited
let editingCardId = null;

/**
 * Handle edit credit card - populate form with card data
 */
export function handleEditCreditCard(id) {
    const elements = getElements();
    const card = state.creditCards.find(c => c.id === id);

    if (!card) {
        showToast("Cartão não encontrado.", true);
        return;
    }

    // Store the ID being edited
    editingCardId = id;

    // Populate form fields
    elements.newCardName.value = card.name;
    elements.newCardHolder.value = card.holder;
    elements.newCardClosingDay.value = card.closingDay;
    elements.newCardDueDay.value = card.dueDay;

    // Change button text to indicate edit mode
    const submitBtn = elements.addCreditCardForm.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '✏️ Salvar Alterações';
        submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }

    // Add cancel button if not exists
    let cancelBtn = elements.addCreditCardForm.querySelector('.cancel-edit-btn');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'cancel-edit-btn w-full bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 text-sm mt-2';
        cancelBtn.textContent = '❌ Cancelar Edição';
        cancelBtn.addEventListener('click', cancelEditMode);
        submitBtn.after(cancelBtn);
    }

    // Focus on name field
    elements.newCardName.focus();

    showToast("Editando cartão: " + card.name);
}

/**
 * Cancel edit mode
 */
export function cancelEditMode() {
    const elements = getElements();
    editingCardId = null;

    // Reset form
    elements.newCardName.value = '';
    elements.newCardHolder.value = 'Titular';
    elements.newCardClosingDay.value = '';
    elements.newCardDueDay.value = '';

    // Reset button
    const submitBtn = elements.addCreditCardForm.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Adicionar Cartão';
        submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }

    // Remove cancel button
    const cancelBtn = elements.addCreditCardForm.querySelector('.cancel-edit-btn');
    if (cancelBtn) cancelBtn.remove();
}

/**
 * Check if we're in edit mode
 */
export function isEditingCard() {
    return editingCardId !== null;
}

/**
 * Get the ID of the card being edited
 */
export function getEditingCardId() {
    return editingCardId;
}

/**
 * Handle update credit card (used when form is submitted in edit mode)
 */
export async function handleUpdateCreditCard(e) {
    if (e) e.preventDefault();
    const elements = getElements();

    const name = elements.newCardName.value.trim();
    const holder = elements.newCardHolder.value;
    const closingDay = parseInt(elements.newCardClosingDay.value);
    const dueDay = parseInt(elements.newCardDueDay.value);

    // Validações
    if (!name) {
        showToast("Digite o nome do cartão.", true);
        return;
    }
    if (!closingDay || closingDay < 1 || closingDay > 31) {
        showToast("Dia de fechamento inválido.", true);
        return;
    }
    if (!dueDay || dueDay < 1 || dueDay > 31) {
        showToast("Dia de vencimento inválido.", true);
        return;
    }

    try {
        // Update the card in the array
        const newCards = state.creditCards.map(c => {
            if (c.id === editingCardId) {
                return {
                    ...c,
                    name,
                    holder,
                    closingDay,
                    dueDay
                };
            }
            return c;
        });

        await setDoc(getCreditCardsDocRef(), { cards: newCards });

        // Exit edit mode
        cancelEditMode();

        showToast("Cartão atualizado com sucesso!");
    } catch (error) {
        console.error("Erro ao atualizar cartão:", error);
        showToast("Erro ao atualizar cartão.", true);
    }
}
