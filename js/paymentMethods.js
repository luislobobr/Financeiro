/**
 * Payment Methods Module
 * Gerencia formas de pagamento (PIX, Dinheiro, Débito, etc.)
 */

import { getPaymentMethodsDocRef, onSnapshot, setDoc, getDoc } from './firebase.js';
import { state } from './state.js';
import { showToast, showElement, hideElement } from './utils.js';
import { getElements } from './ui.js';

// Formas de pagamento padrão
const defaultPaymentMethods = [
    { id: 'pix', name: 'PIX', icon: '📱' },
    { id: 'dinheiro', name: 'Dinheiro', icon: '💵' },
    { id: 'debito', name: 'Débito', icon: '💳' },
    { id: 'credito', name: 'Crédito', icon: '💳' },
    { id: 'transferencia', name: 'Transferência', icon: '🏦' }
];

/**
 * Setup listener for payment methods
 */
export function setupPaymentMethodsListener() {
    const docRef = getPaymentMethodsDocRef();

    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            state.paymentMethods = docSnap.data().methods || [];
        } else {
            // Create default payment methods
            state.paymentMethods = defaultPaymentMethods;
            setDoc(docRef, { methods: defaultPaymentMethods })
                .catch(e => console.error("Erro ao criar formas de pagamento:", e));
        }
        renderPaymentMethodsList();
        updatePaymentMethodDropdowns();
    }, (error) => {
        console.error("Erro ao ouvir formas de pagamento:", error);
    });
}

/**
 * Render payment methods list in modal
 */
export function renderPaymentMethodsList() {
    const elements = getElements();
    if (!elements.paymentMethodsList) return;

    elements.paymentMethodsList.innerHTML = '';

    state.paymentMethods.forEach(method => {
        const methodEl = document.createElement('div');
        methodEl.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
        methodEl.innerHTML = `
            <div class="flex items-center">
                <span class="text-2xl mr-3">${method.icon || '💰'}</span>
                <span class="font-medium text-gray-800 dark:text-gray-200">${method.name}</span>
            </div>
            <button data-id="${method.id}" class="delete-payment-method text-red-500 hover:text-red-700 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        `;
        elements.paymentMethodsList.appendChild(methodEl);
    });

    // Add event listeners for delete buttons
    elements.paymentMethodsList.querySelectorAll('.delete-payment-method').forEach(btn => {
        btn.addEventListener('click', () => handleDeletePaymentMethod(btn.dataset.id));
    });
}

/**
 * Update all payment method dropdowns
 */
export function updatePaymentMethodDropdowns() {
    const elements = getElements();
    // Get payment method selects - use getElementById as fallback to ensure they're found
    const paymentMethodSelect = elements.paymentMethodSelect || document.getElementById('paymentMethod');
    const confirmPaymentMethodSelect = elements.confirmPaymentMethodSelect || document.getElementById('confirmPaymentMethod');

    const dropdowns = [paymentMethodSelect, confirmPaymentMethodSelect];

    dropdowns.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione...</option>';

        state.paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method.id;
            option.textContent = `${method.icon || ''} ${method.name}`;
            select.appendChild(option);
        });

        select.value = currentValue;
    });
}

/**
 * Handle add payment method
 */
export async function handleAddPaymentMethod(e) {
    e.preventDefault();
    const elements = getElements();

    const name = elements.newPaymentMethodName.value.trim();
    const icon = elements.newPaymentMethodIcon.value.trim() || '💰';

    if (!name) {
        showToast("Digite o nome da forma de pagamento.", true);
        return;
    }

    const id = name.toLowerCase().replace(/\s+/g, '_');

    // Check for duplicates
    if (state.paymentMethods.find(m => m.id === id)) {
        showToast("Essa forma de pagamento já existe.", true);
        return;
    }

    try {
        const newMethods = [...state.paymentMethods, { id, name, icon }];
        await setDoc(getPaymentMethodsDocRef(), { methods: newMethods });

        elements.newPaymentMethodName.value = '';
        elements.newPaymentMethodIcon.value = '';
        showToast("Forma de pagamento adicionada!");
    } catch (error) {
        console.error("Erro ao adicionar forma de pagamento:", error);
        showToast("Erro ao adicionar.", true);
    }
}

/**
 * Handle delete payment method
 */
export async function handleDeletePaymentMethod(id) {
    if (!confirm("Remover esta forma de pagamento?")) return;

    try {
        const newMethods = state.paymentMethods.filter(m => m.id !== id);
        await setDoc(getPaymentMethodsDocRef(), { methods: newMethods });
        showToast("Forma de pagamento removida!");
    } catch (error) {
        console.error("Erro ao remover forma de pagamento:", error);
        showToast("Erro ao remover.", true);
    }
}
