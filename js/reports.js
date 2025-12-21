/**
 * Reports Module
 * Handles DRE (Demonstração do Resultado), Comparativo Mensal, 
 * Despesas por Parceiro, and Despesas por Forma de Pagamento
 */

import { formatCurrency, showElement, hideElement } from './utils.js';
import { getElements } from './ui.js';
import { state } from './state.js';

/**
 * Populate report filters (Year and Month)
 */
export function populateReportFilters() {
    const elements = getElements();
    if (!elements.reportYearInput || !elements.reportMonthSelect) return;

    const currentYear = new Date().getFullYear();
    elements.reportYearInput.value = currentYear;

    // Set current month in select
    const currentMonth = new Date().getMonth() + 1;
    elements.reportMonthSelect.value = currentMonth.toString();

    // Initialize state
    state.currentReportMonth = currentMonth;
    state.currentReportYear = currentYear;
}

/**
 * Render all reports
 */
export function renderAllReports(allTransactions) {
    renderDREReport(allTransactions);
    renderComparativoMensal(allTransactions);
    renderDespesasPorParceiro(allTransactions);
    renderDespesasPorFormaPagamento(allTransactions);
}

/**
 * Render DRE Report (improved styling)
 */
export function renderDREReport(allTransactions) {
    const elements = getElements();
    if (!elements.dreReportContainer) return;

    const month = state.currentReportMonth;
    const year = state.currentReportYear;

    if (!month || !year) {
        elements.dreReportContainer.innerHTML = '';
        showElement(elements.dreReportEmpty);
        return;
    }

    hideElement(elements.dreReportEmpty);

    // Filter transactions for selected month/year (paid only)
    const filteredTransactions = allTransactions.filter(t => {
        if (t.status !== 'Pago' || !t.paymentDate || t.isInvoicePayment) return false;
        const paymentDate = new Date(t.paymentDate + 'T00:00:00');
        return paymentDate.getFullYear() === year && (paymentDate.getMonth() + 1) === month;
    });

    // Group by Income/Expense and Category
    let totalReceita = 0;
    const despesasPorCategoria = {};

    filteredTransactions.forEach(t => {
        if (t.type === 'Receita') {
            totalReceita += t.amount;
        } else if (t.type === 'Despesa') {
            despesasPorCategoria[t.category] = (despesasPorCategoria[t.category] || 0) + t.amount;
        }
    });

    const totalDespesas = Object.values(despesasPorCategoria).reduce((sum, amount) => sum + amount, 0);
    const resultadoLiquido = totalReceita - totalDespesas;

    // Build DRE Table HTML with improved styling
    let html = `<table class="w-full">`;

    // RECEITAS row
    html += `
        <tr class="bg-green-800/70">
            <td class="px-4 py-3 text-sm font-bold text-green-300">RECEITAS TOTAIS</td>
            <td class="px-4 py-3 text-sm font-bold text-green-300 text-right">${formatCurrency(totalReceita)}</td>
        </tr>
    `;

    // DESPESAS row
    html += `
        <tr class="bg-red-800/50">
            <td class="px-4 py-3 text-sm font-bold text-red-300">(-) DESPESAS E CUSTOS</td>
            <td class="px-4 py-3 text-sm font-bold text-red-300 text-right">(${formatCurrency(totalDespesas)})</td>
        </tr>
    `;

    // Expense Details
    const sortedCategories = Object.keys(despesasPorCategoria).sort();
    sortedCategories.forEach(category => {
        const amount = despesasPorCategoria[category];
        html += `
            <tr class="border-b border-gray-700">
                <td class="px-4 py-2 text-sm text-gray-300 pl-8">${category}</td>
                <td class="px-4 py-2 text-sm text-gray-400 text-right">(${formatCurrency(amount)})</td>
            </tr>
        `;
    });

    // RESULTADO row
    const resultadoClass = resultadoLiquido >= 0
        ? 'bg-blue-800/70 text-blue-200'
        : 'bg-red-900/70 text-red-200';

    html += `
        <tr class="${resultadoClass}">
            <td class="px-4 py-4 text-base font-bold">RESULTADO LÍQUIDO MENSAL</td>
            <td class="px-4 py-4 text-base font-bold text-right">${formatCurrency(resultadoLiquido)}</td>
        </tr>
    `;

    html += `</table>`;
    elements.dreReportContainer.innerHTML = html;
}

/**
 * Render Comparativo Mensal (last 6 months)
 */
export function renderComparativoMensal(allTransactions) {
    const elements = getElements();
    if (!elements.comparativoMensalContainer) return;

    // Get last 6 months
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        });
    }

    // Calculate data for each month
    const monthlyData = months.map((m, index) => {
        const monthTransactions = allTransactions.filter(t => {
            if (t.status !== 'Pago' || !t.paymentDate || t.isInvoicePayment) return false;
            const paymentDate = new Date(t.paymentDate + 'T00:00:00');
            return paymentDate.getFullYear() === m.year && (paymentDate.getMonth() + 1) === m.month;
        });

        const receitas = monthTransactions
            .filter(t => t.type === 'Receita')
            .reduce((sum, t) => sum + t.amount, 0);

        const despesas = monthTransactions
            .filter(t => t.type === 'Despesa')
            .reduce((sum, t) => sum + t.amount, 0);

        const saldo = receitas - despesas;

        return { ...m, receitas, despesas, saldo };
    });

    // Calculate variations
    monthlyData.forEach((data, index) => {
        if (index === 0) {
            data.variacao = null;
        } else {
            data.variacao = data.saldo - monthlyData[index - 1].saldo;
        }
    });

    // Calculate totals
    const totals = monthlyData.reduce((acc, d) => ({
        receitas: acc.receitas + d.receitas,
        despesas: acc.despesas + d.despesas,
        saldo: acc.saldo + d.saldo
    }), { receitas: 0, despesas: 0, saldo: 0 });

    // Build table HTML
    let html = `
        <table class="w-full">
            <thead>
                <tr class="border-b border-gray-700">
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mês</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Receitas</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Despesas</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Saldo</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variação</th>
                </tr>
            </thead>
            <tbody>
    `;

    monthlyData.forEach(data => {
        const saldoColor = data.saldo >= 0 ? 'text-green-400' : 'text-red-400';
        const variacaoColor = data.variacao === null ? 'text-gray-500' : (data.variacao >= 0 ? 'text-green-400' : 'text-red-400');
        const variacaoText = data.variacao === null ? '—' : (data.variacao >= 0 ? '+' : '') + formatCurrency(data.variacao);

        html += `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td class="px-4 py-3 text-sm text-gray-200 capitalize">${data.label}</td>
                <td class="px-4 py-3 text-sm text-green-400 text-right">${formatCurrency(data.receitas)}</td>
                <td class="px-4 py-3 text-sm text-red-400 text-right">${formatCurrency(data.despesas)}</td>
                <td class="px-4 py-3 text-sm ${saldoColor} text-right">${data.saldo >= 0 ? '' : '-'}${formatCurrency(Math.abs(data.saldo))}</td>
                <td class="px-4 py-3 text-sm ${variacaoColor} text-right">${variacaoText}</td>
            </tr>
        `;
    });

    // Total row
    const totalSaldoColor = totals.saldo >= 0 ? 'text-green-400' : 'text-red-400';
    html += `
            <tr class="bg-gray-700/50 font-bold">
                <td class="px-4 py-3 text-sm text-gray-200">TOTAL</td>
                <td class="px-4 py-3 text-sm text-green-400 text-right">${formatCurrency(totals.receitas)}</td>
                <td class="px-4 py-3 text-sm text-red-400 text-right">${formatCurrency(totals.despesas)}</td>
                <td class="px-4 py-3 text-sm ${totalSaldoColor} text-right">${totals.saldo >= 0 ? '' : '-'}${formatCurrency(Math.abs(totals.saldo))}</td>
                <td class="px-4 py-3 text-sm text-gray-400 text-right"></td>
            </tr>
        </tbody>
        </table>
    `;

    elements.comparativoMensalContainer.innerHTML = html;
}

/**
 * Render Despesas por Parceiro
 */
export function renderDespesasPorParceiro(allTransactions) {
    const elements = getElements();
    if (!elements.despesasPorParceiroContainer) return;

    const month = state.currentReportMonth;
    const year = state.currentReportYear;

    // Filter paid expenses for selected month
    const paidExpenses = allTransactions.filter(t => {
        if (t.status !== 'Pago' || t.type !== 'Despesa' || !t.paymentDate) return false;
        const paymentDate = new Date(t.paymentDate + 'T00:00:00');
        return paymentDate.getFullYear() === year && (paymentDate.getMonth() + 1) === month;
    });

    // Group by paidBy
    const byPartner = { 'Partner 1': 0, 'Partner 2': 0, 'Conta Conjunta': 0 };

    paidExpenses.forEach(t => {
        const paidBy = t.paidBy || 'Conta Conjunta';
        if (paidBy === state.partnerNames.partner1 || paidBy === 'Partner 1') {
            byPartner['Partner 1'] += t.amount;
        } else if (paidBy === state.partnerNames.partner2 || paidBy === 'Partner 2') {
            byPartner['Partner 2'] += t.amount;
        } else {
            byPartner['Conta Conjunta'] += t.amount;
        }
    });

    const total = Object.values(byPartner).reduce((sum, v) => sum + v, 0);

    // Build cards HTML
    const partners = [
        { name: state.partnerNames.partner1 || 'Parceiro 1', amount: byPartner['Partner 1'], color: 'blue' },
        { name: state.partnerNames.partner2 || 'Parceiro 2', amount: byPartner['Partner 2'], color: 'purple' },
        { name: 'Conta Conjunta', amount: byPartner['Conta Conjunta'], color: 'gray' }
    ];

    let html = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">`;

    partners.forEach(partner => {
        const percent = total > 0 ? (partner.amount / total * 100).toFixed(1) : 0;
        const colorClasses = {
            blue: 'border-blue-500 bg-blue-500',
            purple: 'border-purple-500 bg-purple-500',
            gray: 'border-gray-500 bg-gray-500'
        };

        html += `
            <div class="bg-gray-800 p-5 rounded-xl border ${colorClasses[partner.color].split(' ')[0]}">
                <h4 class="text-sm font-medium text-gray-400 mb-1">${partner.name}</h4>
                <p class="text-2xl font-bold text-white mb-3">${formatCurrency(partner.amount)}</p>
                <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full ${colorClasses[partner.color].split(' ')[1]} rounded-full" style="width: ${percent}%"></div>
                    </div>
                    <span class="text-sm text-gray-400">${percent}%</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;

    // Total footer
    html += `
        <div class="bg-gray-700/50 p-4 rounded-lg text-center">
            <span class="text-sm text-gray-400">Total de Despesas Pagas</span>
            <p class="text-xl font-bold text-white">${formatCurrency(total)}</p>
        </div>
    `;

    elements.despesasPorParceiroContainer.innerHTML = html;
}

/**
 * Render Despesas por Forma de Pagamento
 */
export function renderDespesasPorFormaPagamento(allTransactions) {
    const elements = getElements();
    if (!elements.despesasPorFormaPagamentoContainer) return;

    const month = state.currentReportMonth;
    const year = state.currentReportYear;

    // Filter paid expenses for selected month
    const paidExpenses = allTransactions.filter(t => {
        if (t.status !== 'Pago' || t.type !== 'Despesa' || !t.paymentDate || t.isInvoicePayment) return false;
        const paymentDate = new Date(t.paymentDate + 'T00:00:00');
        return paymentDate.getFullYear() === year && (paymentDate.getMonth() + 1) === month;
    });

    // Group by payment method
    const byMethod = {};
    paidExpenses.forEach(t => {
        const method = t.paymentMethod || 'Não informado';
        byMethod[method] = (byMethod[method] || 0) + t.amount;
    });

    const total = Object.values(byMethod).reduce((sum, v) => sum + v, 0);
    const methods = Object.entries(byMethod).sort((a, b) => b[1] - a[1]);

    // Color palette for methods
    const colors = ['emerald', 'blue', 'purple', 'amber', 'rose', 'cyan', 'pink', 'orange'];

    // Build cards HTML
    let html = `<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">`;

    methods.forEach(([method, amount], index) => {
        const percent = total > 0 ? (amount / total * 100).toFixed(1) : 0;
        const color = colors[index % colors.length];

        html += `
            <div class="bg-gray-800 p-5 rounded-xl border border-${color}-500/50">
                <h4 class="text-sm font-medium text-gray-400 mb-1">${method}</h4>
                <p class="text-xl font-bold text-white mb-3">${formatCurrency(amount)}</p>
                <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-${color}-500 rounded-full" style="width: ${percent}%"></div>
                    </div>
                    <span class="text-sm text-gray-400">${percent}%</span>
                </div>
            </div>
        `;
    });

    if (methods.length === 0) {
        html += `
            <div class="col-span-full text-center text-gray-500 py-8">
                <p>Nenhuma despesa paga neste período.</p>
            </div>
        `;
    }

    html += `</div>`;

    // Total footer
    if (methods.length > 0) {
        html += `
            <div class="bg-gray-700/50 p-4 rounded-lg text-center">
                <span class="text-sm text-gray-400">Total por Forma de Pagamento</span>
                <p class="text-xl font-bold text-white">${formatCurrency(total)}</p>
            </div>
        `;
    }

    elements.despesasPorFormaPagamentoContainer.innerHTML = html;
}

