/**
 * Budget Module
 * Handles budget/planning functionality
 */

import { getBudgetDocRef, onSnapshot, setDoc } from './firebase.js';
import { showToast, formatCurrency, categoryColorClasses, showElement, hideElement } from './utils.js';
import { getElements } from './ui.js';
import { state } from './state.js'; // FIX: proper state import

// Helper to dispatch UI update event
const triggerUpdateUI = () => document.dispatchEvent(new CustomEvent('app-update-ui'));

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
        triggerUpdateUI();
        triggerUpdateUI();
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
 * Render budget progress (legacy progress bars + new donut chart)
 */
export function renderBudgetProgress(monthTransactions) {
    const elements = getElements();

    // Calculate totals for all categories
    const expensesByCategory = {};
    monthTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    // Calculate overall budget totals
    let totalBudget = 0;
    let totalSpent = 0;

    Object.keys(state.monthlyBudget).forEach(category => {
        if (category !== 'Salário') {
            totalBudget += state.monthlyBudget[category] || 0;
        }
    });

    Object.keys(expensesByCategory).forEach(category => {
        if (category !== 'Salário') {
            totalSpent += expensesByCategory[category] || 0;
        }
    });

    const totalRemaining = Math.max(0, totalBudget - totalSpent);

    // Render Donut Chart
    renderBudgetDonut(totalSpent, totalRemaining, totalBudget);

    // Update summary values
    const budgetTotalValue = document.getElementById('budgetTotalValue');
    const budgetSpentValue = document.getElementById('budgetSpentValue');
    const budgetRemainingValue = document.getElementById('budgetRemainingValue');

    if (budgetTotalValue) budgetTotalValue.textContent = formatCurrency(totalBudget);
    if (budgetSpentValue) budgetSpentValue.textContent = formatCurrency(totalSpent);
    if (budgetRemainingValue) {
        budgetRemainingValue.textContent = formatCurrency(totalRemaining);
        if (totalSpent > totalBudget && totalBudget > 0) {
            budgetRemainingValue.classList.remove('text-green-500');
            budgetRemainingValue.classList.add('text-red-500');
            budgetRemainingValue.textContent = `-${formatCurrency(totalSpent - totalBudget)}`;
        } else {
            budgetRemainingValue.classList.remove('text-red-500');
            budgetRemainingValue.classList.add('text-green-500');
        }
    }
}

/**
 * Render budget donut chart using D3.js
 */
function renderBudgetDonut(spent, remaining, total) {
    if (typeof d3 === 'undefined') return;

    const container = d3.select("#budgetDonutChart");
    if (!container.node()) return;
    container.html('');

    // If no budget, show empty state
    if (total === 0 && spent === 0) {
        container.html('<p class="text-sm text-gray-400 text-center py-8">Defina orçamentos em Planejamento</p>');
        return;
    }

    const width = 160;
    const height = 160;
    const radius = Math.min(width, height) / 2;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // Data for donut
    const data = [
        { label: 'Gasto', value: spent, color: '#ef4444' },
        { label: 'Disponível', value: Math.max(0, remaining), color: '#22c55e' }
    ];

    // If over budget, show as all red
    if (spent > total && total > 0) {
        data[0].value = total;
        data[1].value = 0;
    }

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);

    // Draw arcs
    svg.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => d.data.value > 0 ? d.data.color : 'transparent')
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 2);

    // Calculate percentage
    const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;
    const displayPercent = Math.min(percentage, 999);

    // Center text - percentage
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.1em")
        .attr("class", `text-2xl font-bold ${percentage > 100 ? 'fill-red-500' : 'fill-gray-200'}`)
        .text(`${displayPercent}%`);

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.8em")
        .attr("class", "text-xs fill-gray-400")
        .text("usado");
}

