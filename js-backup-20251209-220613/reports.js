/**
 * Reports Module
 * Handles DRE (Income Statement) reports
 */

import { formatCurrency } from './utils.js';
import { getElements, showElement, hideElement } from './ui.js';
import { state } from './state.js';

/**
 * Populate report filters
 */
export function populateReportFilters() {
    const elements = getElements();
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    if (elements.reportMonthSelect) {
        elements.reportMonthSelect.innerHTML = months.map((m, i) =>
            `<option value="${i + 1}">${m}</option>`
        ).join('');
    }

    const now = new Date();
    state.currentReportMonth = now.getMonth() + 1;
    state.currentReportYear = now.getFullYear();

    if (elements.reportMonthSelect) {
        elements.reportMonthSelect.value = state.currentReportMonth;
    }
    if (elements.reportYearInput) {
        elements.reportYearInput.value = state.currentReportYear;
    }
}

/**
 * Render DRE Report
 */
export function renderDREReport(allTransactions) {
    const elements = getElements();

    const month = state.currentReportMonth;
    const year = state.currentReportYear;

    if (!month || !year) {
        if (elements.dreReportContainer) {
            elements.dreReportContainer.innerHTML = '';
        }
        showElement(elements.dreReportEmpty);
        return;
    }

    hideElement(elements.dreReportEmpty);

    // Filter transactions for selected month/year (paid only)
    const filteredTransactions = allTransactions.filter(t => {
        if (t.status !== 'Pago' || !t.paymentDate) return false;

        const paymentDate = new Date(t.paymentDate + 'T00:00:00');
        return paymentDate.getFullYear() === year && (paymentDate.getMonth() + 1) === month;
    });

    // Group by Revenue/Expense and Category
    let totalReceita = 0;
    const despesasPorCategoria = {};

    filteredTransactions.forEach(t => {
        if (t.type === 'Receita') {
            totalReceita += t.amount;
        } else if (t.type === 'Despesa') {
            despesasPorCategoria[t.category] = (despesasPorCategoria[t.category] || 0) + t.amount;
        }
    });

    // Calculate totals
    const totalDespesas = Object.values(despesasPorCategoria).reduce((sum, amount) => sum + amount, 0);
    const resultadoLiquido = totalReceita - totalDespesas;

    // Build DRE table
    let html = `
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
    `;

    // REVENUES
    html += `
        <tr class="bg-green-50 dark:bg-green-900/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 dark:text-green-300">RECEITAS TOTAIS</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 dark:text-green-300 text-right">${formatCurrency(totalReceita)}</td>
        </tr>
    `;

    // EXPENSES
    html += `
        <tr class="bg-red-50 dark:bg-red-900/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700 dark:text-red-300">(-) DESPESAS E CUSTOS</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700 dark:text-red-300 text-right">(${formatCurrency(totalDespesas)})</td>
        </tr>
    `;

    // Expense details
    const sortedCategories = Object.keys(despesasPorCategoria).sort();
    sortedCategories.forEach(category => {
        const amount = despesasPorCategoria[category];
        html += `
            <tr class="text-gray-700 dark:text-gray-300">
                <td class="px-6 py-2 whitespace-nowrap text-sm pl-10">${category}</td>
                <td class="px-6 py-2 whitespace-nowrap text-sm text-right">(${formatCurrency(amount)})</td>
            </tr>
        `;
    });

    // NET RESULT
    const resultadoClass = resultadoLiquido >= 0
        ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200'
        : 'bg-red-100 dark:bg-red-900/70 text-red-800 dark:text-red-200';

    html += `
        <tr class="${resultadoClass} text-lg">
            <td class="px-6 py-4 whitespace-nowrap font-bold">RESULTADO LÍQUIDO MENSAL</td>
            <td class="px-6 py-4 whitespace-nowrap font-bold text-right">${formatCurrency(resultadoLiquido)}</td>
        </tr>
    `;

    html += `</tbody></table>`;

    if (elements.dreReportContainer) {
        elements.dreReportContainer.innerHTML = html;
    }
}
