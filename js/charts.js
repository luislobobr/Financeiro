/**
 * Charts Module
 * Handles D3.js visualizations and BI reports
 */

import { formatCurrency, categoryColors, showElement, hideElement } from './utils.js';
import { getElements } from './ui.js';
import { state } from './state.js';

// Track current BI month/year
let currentBIMonth = null;
let currentBIYear = null;

/**
 * Populate BI Month Select with last 12 months
 */
export function populateBIMonthSelect() {
    const elements = getElements();
    const select = document.getElementById('biMonthSelect');
    if (!select) return;

    const now = new Date();
    currentBIMonth = now.getMonth() + 1;
    currentBIYear = now.getFullYear();

    // Generate last 12 months options
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
        const year = date.getFullYear();
        const value = `${date.getMonth() + 1}-${year}`;

        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year}`;
        if (i === 0) option.selected = true;
        select.appendChild(option);
    }

    // Add change listener
    select.addEventListener('change', () => {
        const [month, year] = select.value.split('-');
        currentBIMonth = parseInt(month, 10);
        currentBIYear = parseInt(year, 10);
        renderBIReport(state.allTransactions);
    });
}

/**
 * Render all BI charts
 */
export function renderBIReport(allTransactions) {
    if (typeof d3 === 'undefined') {
        console.error("D3.js não está carregado.");
        return;
    }

    const month = currentBIMonth || new Date().getMonth() + 1;
    const year = currentBIYear || new Date().getFullYear();

    // Filter transactions for selected month
    const monthTransactions = allTransactions.filter(t => {
        if (t.status !== 'Pago' || !t.paymentDate) return false;
        const paymentDate = new Date(t.paymentDate + 'T00:00:00');
        return paymentDate.getFullYear() === year && (paymentDate.getMonth() + 1) === month;
    });

    renderBISummary(monthTransactions);
    renderCategoryBarChart(monthTransactions);
    renderDonutChart(monthTransactions);
    renderPartnerBarChart(monthTransactions);
    renderEvolutionChart(allTransactions);
}

/**
 * Render BI Summary cards
 */
function renderBISummary(transactions) {
    const biReceitasMes = document.getElementById('biReceitasMes');
    const biDespesasMes = document.getElementById('biDespesasMes');
    const biSaldoMes = document.getElementById('biSaldoMes');

    if (!biReceitasMes) return;

    const receitas = transactions.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);
    const despesas = transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
    const saldo = receitas - despesas;

    biReceitasMes.textContent = formatCurrency(receitas);
    biDespesasMes.textContent = formatCurrency(despesas);
    biSaldoMes.textContent = formatCurrency(saldo);

    // Color coding for saldo
    if (saldo >= 0) {
        biSaldoMes.classList.remove('text-red-500');
        biSaldoMes.classList.add('text-green-500');
    } else {
        biSaldoMes.classList.remove('text-green-500');
        biSaldoMes.classList.add('text-red-500');
    }
}

/**
 * Render Category Bar Chart (horizontal)
 */
function renderCategoryBarChart(transactions) {
    const container = d3.select("#biCategoryBarChart");
    const emptyState = document.getElementById('biCategoryBarChartEmpty');
    container.html('');

    // Group expenses by category
    const expenseData = {};
    transactions.filter(t => t.type === 'Despesa').forEach(t => {
        expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
    });

    const chartData = Object.entries(expenseData)
        .map(([category, value]) => ({
            category,
            value,
            color: categoryColors[category] || '#f97316'
        }))
        .sort((a, b) => b.value - a.value);

    if (chartData.length === 0) {
        showElement(emptyState);
        return;
    }
    hideElement(emptyState);

    const margin = { top: 10, right: 80, bottom: 30, left: 80 };
    const width = Math.max(container.node().clientWidth - margin.left - margin.right, 300);
    const height = Math.max(chartData.length * 40, 100);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value) * 1.15])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(chartData.map(d => d.category))
        .range([0, height])
        .padding(0.3);

    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => `R$ ${d3.format(".2s")(d)}`))
        .selectAll("text")
        .attr("class", "fill-gray-400 text-xs");

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("class", "fill-gray-300 text-xs");

    // Bars
    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.category))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", d => d.color)
        .attr("rx", 4)
        .transition()
        .duration(600)
        .attr("width", d => x(d.value));

    // Labels
    svg.selectAll(".label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "fill-gray-200 text-xs font-medium")
        .attr("x", d => x(d.value) + 5)
        .attr("y", d => y(d.category) + y.bandwidth() / 2 + 4)
        .text(d => formatCurrency(d.value));
}

/**
 * Render Donut Chart
 */
function renderDonutChart(transactions) {
    const container = d3.select("#biDonutChart");
    const legend = d3.select("#biDonutLegend");
    const emptyState = document.getElementById('biDonutChartEmpty');
    container.html('');
    legend.html('');

    // Group expenses by category
    const expenseData = {};
    transactions.filter(t => t.type === 'Despesa').forEach(t => {
        expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
    });

    const chartData = Object.entries(expenseData)
        .map(([category, value]) => ({
            category,
            value,
            color: categoryColors[category] || '#f97316'
        }))
        .sort((a, b) => b.value - a.value);

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

    if (chartData.length === 0 || total === 0) {
        showElement(emptyState);
        return;
    }
    hideElement(emptyState);

    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);

    // Draw arcs
    svg.selectAll("path")
        .data(pie(chartData))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => d.data.color)
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 2);

    // Add percentage labels on largest slices
    svg.selectAll(".label")
        .data(pie(chartData))
        .enter()
        .append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("class", "fill-white text-xs font-bold")
        .text(d => {
            const percent = (d.data.value / total * 100);
            return percent > 10 ? `${percent.toFixed(0)}%` : '';
        });

    // Render legend
    chartData.forEach(d => {
        const percent = (d.value / total * 100).toFixed(1);
        legend.append("div")
            .attr("class", "flex items-center gap-2 text-sm")
            .html(`
                <div class="w-3 h-3 rounded" style="background-color: ${d.color}"></div>
                <span class="text-gray-300">${d.category}: ${formatCurrency(d.value)}</span>
            `);
    });
}

/**
 * Render Partner Bar Chart
 */
function renderPartnerBarChart(transactions) {
    const container = d3.select("#biPartnerBarChart");
    const emptyState = document.getElementById('biPartnerBarChartEmpty');
    container.html('');

    // Group expenses by partner
    const partnerData = {};
    transactions.filter(t => t.type === 'Despesa').forEach(t => {
        const paidBy = t.paidBy || 'Conta Conjunta';
        partnerData[paidBy] = (partnerData[paidBy] || 0) + t.amount;
    });

    const chartData = Object.entries(partnerData)
        .map(([partner, value], i) => ({
            partner,
            value,
            color: i === 0 ? '#a855f7' : i === 1 ? '#f97316' : '#6b7280'
        }))
        .sort((a, b) => b.value - a.value);

    if (chartData.length === 0) {
        showElement(emptyState);
        return;
    }
    hideElement(emptyState);

    const margin = { top: 10, right: 80, bottom: 30, left: 80 };
    const width = Math.max(container.node().clientWidth - margin.left - margin.right, 300);
    const height = Math.max(chartData.length * 50, 80);

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value) * 1.15])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(chartData.map(d => d.partner))
        .range([0, height])
        .padding(0.4);

    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => `R$ ${d3.format(".2s")(d)}`))
        .selectAll("text")
        .attr("class", "fill-gray-400 text-xs");

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("class", "fill-gray-300 text-sm font-medium");

    // Bars
    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.partner))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", d => d.color)
        .attr("rx", 4)
        .transition()
        .duration(600)
        .attr("width", d => x(d.value));

    // Labels
    svg.selectAll(".label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "fill-gray-200 text-sm font-medium")
        .attr("x", d => x(d.value) + 5)
        .attr("y", d => y(d.partner) + y.bandwidth() / 2 + 5)
        .text(d => formatCurrency(d.value));
}

/**
 * Render Monthly Evolution Chart (grouped bars)
 */
function renderEvolutionChart(allTransactions) {
    const container = d3.select("#biEvolutionChart");
    container.html('');

    // Get last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        });
    }

    // Calculate data for each month
    const chartData = months.map(m => {
        const monthTx = allTransactions.filter(t => {
            if (t.status !== 'Pago' || !t.paymentDate) return false;
            const paymentDate = new Date(t.paymentDate + 'T00:00:00');
            return paymentDate.getFullYear() === m.year && (paymentDate.getMonth() + 1) === m.month;
        });

        const receitas = monthTx.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);
        const despesas = monthTx.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);

        return { ...m, receitas, despesas };
    });

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const width = Math.max(container.node().clientWidth - margin.left - margin.right, 400);
    const height = 220;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
        .domain(chartData.map(d => d.label))
        .range([0, width])
        .padding(0.3);

    const x1 = d3.scaleBand()
        .domain(['receitas', 'despesas'])
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const maxValue = d3.max(chartData, d => Math.max(d.receitas, d.despesas));
    const y = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .range([height, 0]);

    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("class", "fill-gray-400 text-xs capitalize")
        .attr("transform", "rotate(-25)")
        .attr("text-anchor", "end");

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `R$ ${d3.format(".2s")(d)}`))
        .selectAll("text")
        .attr("class", "fill-gray-400 text-xs");

    // Receitas bars
    svg.selectAll(".receita-bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("x", d => x0(d.label))
        .attr("y", height)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", "#22c55e")
        .attr("rx", 3)
        .transition()
        .duration(600)
        .attr("y", d => y(d.receitas))
        .attr("height", d => height - y(d.receitas));

    // Despesas bars
    svg.selectAll(".despesa-bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("x", d => x0(d.label) + x1.bandwidth() + 2)
        .attr("y", height)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", "#ef4444")
        .attr("rx", 3)
        .transition()
        .duration(600)
        .attr("y", d => y(d.despesas))
        .attr("height", d => height - y(d.despesas));
}

