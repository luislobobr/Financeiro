/**
 * Budget Module
 * Handles budget/planning functionality
 */

import { getBudgetDocRef, onSnapshot, setDoc } from './firebase.js';
import { showToast, formatCurrency, categoryColorClasses } from './utils.js';
import { getElements, showElement, hideElement } from './ui.js';
import { state } from './state.js';
import { updateAllUI } from './app.js';

let unsubscribeBudget = null;

/**
 * Setup budget listener
 */
export function setupBudgetListener() {
    if (unsubscribeBudget) unsubscribeBudget();

    const budgetDocRef = getBudgetDocRef();
    unsubscribeBudget = onSnapshot(budgetDocRef, (docSnap) => {
        if (docSnap.exists()) {
            state.monthlyBudget = docSnap.data();
        } else {
            state.monthlyBudget = {};
        }
        updateBudgetFormInputs();
        updateAllUI(state.allTransactions);
    }, (error) => {
        console.error("Erro ao ouvir orçamento:", error);
    });
}

/**
 * Initialize budget form
 */
export function initBudgetForm() {
    const elements = getElements();
    if (!elements.budgetForm) return;

    elements.budgetForm.innerHTML = '';
    const expenseCategories = state.categories.filter(c => c !== 'Salário');

    expenseCategories.forEach(category => {
        const div = document.createElement('div');
        div.className = "grid grid-cols-3 gap-4 items-center";

        const colorClass = categoryColorClasses[category] || categoryColorClasses['Outros'];

        div.innerHTML = `
            <label for="budget-${category}" class="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <span class="w-3 h-3 rounded-full mr-2 ${colorClass}"></span>
                ${category}
            </label>
            <div class="col-span-2 relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">R$</span>
                <input type="number" step="0.01" min="0" 
                           id="budget-${category}" 
                           data-category="${category}"
                           placeholder="0,00"
                           class="budget-input pl-10 pr-4 py-2 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            </div>
        `;
        elements.budgetForm.appendChild(div);
    });

    // Add listeners for auto-save
    elements.budgetForm.querySelectorAll('.budget-input').forEach(input => {
        input.addEventListener('change', handleBudgetChange);
    });

    updateBudgetFormInputs();
}

/**
 * Update budget form inputs
 */
export function updateBudgetFormInputs() {
    const elements = getElements();
    if (!elements.budgetForm) return;

    elements.budgetForm.querySelectorAll('.budget-input').forEach(input => {
        const category = input.dataset.category;
        input.value = state.monthlyBudget[category] || '';
    });
}

/**
 * Handle budget change
 */
export async function handleBudgetChange(e) {
    const category = e.target.dataset.category;
    const amount = parseFloat(e.target.value) || 0;

    try {
        const budgetUpdate = {};
        budgetUpdate[category] = amount;

        await setDoc(getBudgetDocRef(), budgetUpdate, { merge: true });
        showToast(`Orçamento de ${category} salvo!`);
    } catch (error) {
        console.error("Erro ao salvar orçamento:", error);
        showToast("Erro ao salvar orçamento.", true);
    }
}

/**
 * Render budget progress
 */
export function renderBudgetProgress(monthTransactions) {
    const elements = getElements();
    if (!elements.budgetProgressContainer) return;

    elements.budgetProgressContainer.innerHTML = '';

    const expensesByCategory = {};
    monthTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    if (Object.keys(state.monthlyBudget).length === 0 && Object.keys(expensesByCategory).length === 0) {
        elements.budgetProgressContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center">Defina seus orçamentos na aba "Planejamento" para começar.</p>';
        return;
    }

    const allBudgetCategories = new Set([...Object.keys(state.monthlyBudget), ...Object.keys(expensesByCategory)]);

    allBudgetCategories.forEach(category => {
        if (category === 'Salário') return;

        const spent = expensesByCategory[category] || 0;
        const limit = state.monthlyBudget[category] || 0;
        const percent = (limit > 0) ? (spent / limit) * 100 : 0;
        const remaining = limit - spent;

        let progressBarClass = 'bg-blue-500';
        let remainingText = `${formatCurrency(remaining)} restantes`;

        if (spent > limit && limit > 0) {
            progressBarClass = 'bg-red-500';
            remainingText = `${formatCurrency(Math.abs(remaining))} acima`;
        } else if (percent > 85 && limit > 0) {
            progressBarClass = 'bg-yellow-500';
        } else if (limit === 0 && spent > 0) {
            progressBarClass = 'bg-gray-400';
            remainingText = 'Sem limite definido';
        } else if (limit > 0 && spent === 0) {
            remainingText = `Limite de ${formatCurrency(limit)}`;
        }

        const div = document.createElement('div');
        div.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${category}</span>
                <span class="text-sm font-semibold ${spent > limit && limit > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-800 dark:text-gray-200'}">
                    ${formatCurrency(spent)} / ${limit > 0 ? formatCurrency(limit) : '...'}
                </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div class="${progressBarClass} h-2.5 rounded-full" style="width: ${Math.min(percent, 100)}%"></div>
            </div>
            <p class="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">${remainingText}</p>
        `;
        elements.budgetProgressContainer.appendChild(div);
    });
}
