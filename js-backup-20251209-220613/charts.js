/**
 * Charts Module
 * Handles D3.js chart rendering for BI
 */

import { formatCurrency, categoryColors } from './utils.js';
import { getElements, showElement, hideElement } from './ui.js';
import { state } from './state.js';

/**
 * Render BI Report chart using D3.js
 */
export function renderBIReport(allTransactions) {
    const elements = getElements();

    // Define period (Last 3 months including current)
    const now = new Date();
    const startPeriod = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];

    // Filter and group data
    const expenseData = {};
    let totalSpent = 0;

    allTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago' && (t.paymentDate || t.dueDate) >= startPeriod)
        .forEach(t => {
            expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
            totalSpent += t.amount;
        });

    // Convert to D3 array
    const chartData = Object.keys(expenseData).map(category => ({
        category: category,
        value: expenseData[category],
        color: categoryColors[category] || categoryColors['Outros']
    })).sort((a, b) => b.value - a.value);

    // Handle empty state
    if (chartData.length === 0 || totalSpent === 0) {
        if (typeof d3 !== 'undefined') {
            d3.select("#bi-chart").html('');
        }
        showElement(elements.biChartEmpty);
        return;
    }
    hideElement(elements.biChartEmpty);

    // Check if D3 is available
    if (typeof d3 === 'undefined') {
        console.error('D3.js não está carregado');
        return;
    }

    // D3.js configuration
    const container = d3.select("#bi-chart");
    container.html('');

    const margin = { top: 20, right: 30, bottom: 60, left: 70 },
        width = Math.max(container.node().clientWidth, 400) - margin.left - margin.right,
        height = chartData.length * 40;

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value) * 1.1])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(chartData.map(d => d.category))
        .range([0, height])
        .padding(0.2);

    // Axes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => `R$ ${d3.format(".2s")(d)}`))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-25)")
        .attr("class", "fill-gray-600 dark:fill-gray-400 text-sm");

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("class", "fill-gray-600 dark:fill-gray-300 font-medium");

    // Draw Bars
    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", x(0))
        .attr("y", d => y(d.category))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", d => d.color)
        .transition()
        .duration(800)
        .attr("width", d => x(d.value));

    // Add Labels
    svg.selectAll(".label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "label fill-gray-800 dark:fill-gray-100 text-xs font-semibold")
        .attr("x", d => x(d.value) + 5)
        .attr("y", d => y(d.category) + y.bandwidth() / 2)
        .attr("dy", ".35em")
        .text(d => formatCurrency(d.value));

    // Add X axis title
    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + margin.top + 30})`)
        .style("text-anchor", "middle")
        .attr("class", "fill-gray-700 dark:fill-gray-300 font-medium")
        .text("Valor Total Gasto (R$)");
}
