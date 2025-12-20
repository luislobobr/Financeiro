/**
 * AI Consultant Module
 * Provides intelligent financial recommendations based on user data
 */

import { formatCurrency } from './utils.js';
import { state } from './state.js';

/**
 * Analyze financial data and generate recommendations
 */
export function analyzeFinances(transactions) {
    const analysis = {
        score: 0,
        savingsRate: 0,
        overdueCount: 0,
        overdueTotal: 0,
        topCategory: '-',
        topCategoryValue: 0,
        recommendations: [],
        actionPlan: [],
        goals: [],
        alerts: []
    };

    if (!transactions || transactions.length === 0) {
        return analysis;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    // Filter transactions for current month
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.paymentDate || t.dueDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Calculate totals
    const totalIncome = monthTransactions
        .filter(t => t.type === 'Receita' && t.status === 'Pago')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago')
        .reduce((sum, t) => sum + t.amount, 0);

    // Overdue accounts
    const overdueTransactions = transactions.filter(t =>
        t.status === 'A Pagar' && t.dueDate < today
    );
    analysis.overdueCount = overdueTransactions.length;
    analysis.overdueTotal = overdueTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Savings rate
    if (totalIncome > 0) {
        analysis.savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
    }

    // Top spending category
    const categorySpending = {};
    monthTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago')
        .forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

    const sortedCategories = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length > 0) {
        analysis.topCategory = sortedCategories[0][0];
        analysis.topCategoryValue = sortedCategories[0][1];
    }

    // Calculate financial score (0-100)
    let score = 50; // Base score

    // Savings rate impact (+/- 20 points)
    if (analysis.savingsRate >= 20) score += 20;
    else if (analysis.savingsRate >= 10) score += 10;
    else if (analysis.savingsRate >= 0) score += 5;
    else score -= 10; // Negative savings

    // Overdue accounts impact (-5 to -20 points)
    if (analysis.overdueCount === 0) score += 20;
    else if (analysis.overdueCount <= 2) score -= 5;
    else if (analysis.overdueCount <= 5) score -= 10;
    else score -= 20;

    // Balance impact (+/- 10 points)
    if (totalIncome > totalExpenses) score += 10;
    else if (totalIncome === totalExpenses) score += 0;
    else score -= 10;

    analysis.score = Math.max(0, Math.min(100, score));

    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis, totalIncome, totalExpenses, sortedCategories);
    analysis.actionPlan = generateActionPlan(analysis, overdueTransactions, sortedCategories);
    analysis.goals = generateGoals(analysis, totalIncome);
    analysis.alerts = generateAlerts(analysis, overdueTransactions, totalIncome, totalExpenses);

    return analysis;
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(analysis, income, expenses, categories) {
    const recommendations = [];

    // Overdue accounts recommendation
    if (analysis.overdueCount > 0) {
        recommendations.push({
            type: 'urgent',
            icon: '🚨',
            title: 'Regularize Contas Atrasadas',
            description: `Você tem ${analysis.overdueCount} conta(s) atrasada(s) totalizando ${formatCurrency(analysis.overdueTotal)}. Priorize o pagamento para evitar juros e multas.`,
            priority: 1
        });
    }

    // Savings rate recommendation
    if (analysis.savingsRate < 10) {
        recommendations.push({
            type: 'warning',
            icon: '💰',
            title: 'Aumente sua Taxa de Poupança',
            description: `Sua taxa de poupança está em ${analysis.savingsRate}%. O ideal é poupar pelo menos 20% da renda. Revise seus gastos para encontrar onde economizar.`,
            priority: 2
        });
    } else if (analysis.savingsRate >= 20) {
        recommendations.push({
            type: 'success',
            icon: '🎉',
            title: 'Excelente Taxa de Poupança!',
            description: `Parabéns! Você está poupando ${analysis.savingsRate}% da renda. Continue assim e considere investir o excedente.`,
            priority: 5
        });
    }

    // Top category recommendation
    if (categories.length > 0 && categories[0][1] > income * 0.3) {
        recommendations.push({
            type: 'tip',
            icon: '📊',
            title: `Atenção com ${categories[0][0]}`,
            description: `Esta categoria representa ${Math.round((categories[0][1] / income) * 100)}% da sua renda. Considere estabelecer um orçamento limite.`,
            priority: 3
        });
    }

    // Budget recommendation
    const hasBudget = Object.keys(state.monthlyBudget || {}).length > 0;
    if (!hasBudget) {
        recommendations.push({
            type: 'tip',
            icon: '📝',
            title: 'Defina seu Orçamento Mensal',
            description: 'Você ainda não definiu orçamentos por categoria. Acesse "Planejamento" para criar limites de gastos.',
            priority: 4
        });
    }

    // Positive balance recommendation
    if (expenses < income * 0.8) {
        recommendations.push({
            type: 'success',
            icon: '✨',
            title: 'Gastos Sob Controle',
            description: `Seus gastos representam apenas ${Math.round((expenses / income) * 100)}% da renda. Você está no caminho certo!`,
            priority: 6
        });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate action plan for next 30 days
 */
function generateActionPlan(analysis, overdueTransactions, categories) {
    const actions = [];

    // Priority 1: Pay overdue accounts
    if (overdueTransactions.length > 0) {
        const urgentOverdue = overdueTransactions
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);

        urgentOverdue.forEach((t, i) => {
            actions.push({
                week: 1,
                action: `Pagar ${t.description}`,
                amount: t.amount,
                status: 'pending'
            });
        });
    }

    // Priority 2: Review top spending category
    if (categories.length > 0) {
        actions.push({
            week: 2,
            action: `Revisar gastos em "${categories[0][0]}" e definir limite`,
            amount: null,
            status: 'pending'
        });
    }

    // Priority 3: Emergency fund
    if (analysis.savingsRate > 0) {
        actions.push({
            week: 3,
            action: 'Separar 10% do saldo para reserva de emergência',
            amount: null,
            status: 'pending'
        });
    }

    // Priority 4: Review subscriptions
    actions.push({
        week: 4,
        action: 'Revisar assinaturas e serviços recorrentes',
        amount: null,
        status: 'pending'
    });

    return actions;
}

/**
 * Generate suggested goals
 */
function generateGoals(analysis, income) {
    const goals = [];

    // Emergency fund goal
    goals.push({
        title: 'Reserva de Emergência',
        target: income * 6, // 6 months of income
        description: 'Tenha guardado o equivalente a 6 meses de gastos',
        icon: '🏦'
    });

    // Savings goal
    goals.push({
        title: 'Meta de Poupança Mensal',
        target: income * 0.2,
        description: 'Poupe 20% da sua renda todo mês',
        icon: '💵'
    });

    // Zero overdue goal
    if (analysis.overdueCount > 0) {
        goals.push({
            title: 'Zerar Contas Atrasadas',
            target: analysis.overdueTotal,
            description: 'Elimine todas as pendências em 30 dias',
            icon: '🎯'
        });
    }

    return goals;
}

/**
 * Generate alerts
 */
function generateAlerts(analysis, overdueTransactions, income, expenses) {
    const alerts = [];

    // Negative balance alert
    if (expenses > income) {
        alerts.push({
            type: 'danger',
            message: `Seus gastos excedem sua renda em ${formatCurrency(expenses - income)}!`,
            icon: '🔴'
        });
    }

    // High overdue alert
    if (analysis.overdueTotal > income * 0.5) {
        alerts.push({
            type: 'danger',
            message: 'Suas contas atrasadas representam mais de 50% da renda mensal',
            icon: '🔴'
        });
    }

    // Low savings alert
    if (analysis.savingsRate < 0) {
        alerts.push({
            type: 'warning',
            message: 'Você está gastando mais do que ganha este mês',
            icon: '🟡'
        });
    }

    // Near due date alert
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDue = overdueTransactions.filter(t =>
        new Date(t.dueDate) >= today && new Date(t.dueDate) <= nextWeek
    );

    if (upcomingDue.length > 0) {
        alerts.push({
            type: 'info',
            message: `${upcomingDue.length} conta(s) vencem nos próximos 7 dias`,
            icon: '🔵'
        });
    }

    return alerts;
}

/**
 * Render the AI Consultant page
 */
export function renderAiConsultant(transactions) {
    const analysis = analyzeFinances(transactions);

    // Update score cards
    const scoreEl = document.getElementById('aiScoreValue');
    const savingsEl = document.getElementById('aiSavingsRate');
    const overdueCountEl = document.getElementById('aiOverdueCount');
    const overdueTotalEl = document.getElementById('aiOverdueTotal');
    const topCatEl = document.getElementById('aiTopCategory');
    const topCatValueEl = document.getElementById('aiTopCategoryValue');

    if (scoreEl) {
        scoreEl.textContent = analysis.score;
        scoreEl.className = `text-3xl font-bold ${getScoreColor(analysis.score)}`;
    }
    if (savingsEl) {
        savingsEl.textContent = `${analysis.savingsRate}%`;
        savingsEl.className = `text-3xl font-bold ${analysis.savingsRate >= 10 ? 'text-green-500' : 'text-amber-500'}`;
    }
    if (overdueCountEl) {
        overdueCountEl.textContent = analysis.overdueCount;
        overdueCountEl.className = `text-3xl font-bold ${analysis.overdueCount === 0 ? 'text-green-500' : 'text-red-500'}`;
    }
    if (overdueTotalEl) overdueTotalEl.textContent = formatCurrency(analysis.overdueTotal);
    if (topCatEl) topCatEl.textContent = analysis.topCategory;
    if (topCatValueEl) topCatValueEl.textContent = formatCurrency(analysis.topCategoryValue);

    // Render recommendations
    renderRecommendations(analysis.recommendations);
    renderActionPlan(analysis.actionPlan);
    renderGoals(analysis.goals);
    renderAlerts(analysis.alerts);

    // Update health score on dashboard
    updateHealthScore(analysis);
}

/**
 * Get color class based on score
 */
function getScoreColor(score) {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
}

/**
 * Render recommendations list
 */
function renderRecommendations(recommendations) {
    const container = document.getElementById('aiRecommendationsList');
    if (!container) return;

    if (recommendations.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Sem recomendações no momento. Continue mantendo suas finanças em dia!</p>';
        return;
    }

    container.innerHTML = recommendations.map(rec => `
        <div class="flex items-start p-4 rounded-lg ${getRecommendationBgColor(rec.type)}">
            <span class="text-2xl mr-4">${rec.icon}</span>
            <div class="flex-1">
                <h4 class="font-semibold ${getRecommendationTextColor(rec.type)}">${rec.title}</h4>
                <p class="text-sm text-gray-400 mt-1">${rec.description}</p>
            </div>
        </div>
    `).join('');
}

function getRecommendationBgColor(type) {
    switch (type) {
        case 'urgent': return 'bg-red-900/30 border border-red-500/30';
        case 'warning': return 'bg-amber-900/30 border border-amber-500/30';
        case 'success': return 'bg-green-900/30 border border-green-500/30';
        default: return 'bg-blue-900/30 border border-blue-500/30';
    }
}

function getRecommendationTextColor(type) {
    switch (type) {
        case 'urgent': return 'text-red-400';
        case 'warning': return 'text-amber-400';
        case 'success': return 'text-green-400';
        default: return 'text-blue-400';
    }
}

/**
 * Render action plan
 */
function renderActionPlan(actions) {
    const container = document.getElementById('aiActionPlanList');
    if (!container) return;

    if (actions.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma ação pendente. Excelente!</p>';
        return;
    }

    container.innerHTML = actions.map((action, i) => `
        <div class="flex items-center p-3 bg-gray-700/50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                ${i + 1}
            </div>
            <div class="flex-1">
                <p class="text-gray-200">${action.action}</p>
                ${action.amount ? `<p class="text-sm text-amber-400">${formatCurrency(action.amount)}</p>` : ''}
            </div>
            <span class="text-xs text-gray-500">Semana ${action.week}</span>
        </div>
    `).join('');
}

/**
 * Render goals
 */
function renderGoals(goals) {
    const container = document.getElementById('aiGoalsList');
    if (!container) return;

    container.innerHTML = goals.map(goal => `
        <div class="p-4 bg-gray-700/50 rounded-lg">
            <div class="flex items-center mb-2">
                <span class="text-xl mr-2">${goal.icon}</span>
                <h4 class="font-semibold text-gray-200">${goal.title}</h4>
            </div>
            <p class="text-sm text-gray-400">${goal.description}</p>
            <p class="text-lg font-bold text-blue-400 mt-2">${formatCurrency(goal.target)}</p>
        </div>
    `).join('');
}

/**
 * Render alerts
 */
function renderAlerts(alerts) {
    const container = document.getElementById('aiAlertsList');
    if (!container) return;

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <span class="text-2xl">✅</span>
                <p class="text-green-400 mt-2">Nenhum alerta no momento!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="flex items-center p-3 rounded-lg ${alert.type === 'danger' ? 'bg-red-900/30' : alert.type === 'warning' ? 'bg-amber-900/30' : 'bg-blue-900/30'}">
            <span class="text-xl mr-3">${alert.icon}</span>
            <p class="text-sm ${alert.type === 'danger' ? 'text-red-300' : alert.type === 'warning' ? 'text-amber-300' : 'text-blue-300'}">${alert.message}</p>
        </div>
    `).join('');
}

/**
 * Update health score on dashboard
 */
function updateHealthScore(analysis) {
    const scoreText = document.getElementById('healthScoreText');
    const scoreArc = document.getElementById('healthScoreArc');
    const savingsRateValue = document.getElementById('savingsRateValue');
    const onTimeRateValue = document.getElementById('onTimeRateValue');
    const budgetStatusValue = document.getElementById('budgetStatusValue');

    if (scoreText) {
        let label = 'Ruim';
        let color = 'text-red-500';
        if (analysis.score >= 80) { label = 'Ótimo'; color = 'text-green-500'; }
        else if (analysis.score >= 60) { label = 'Bom'; color = 'text-blue-500'; }
        else if (analysis.score >= 40) { label = 'Regular'; color = 'text-amber-500'; }

        scoreText.textContent = label;
        scoreText.className = `absolute inset-0 flex items-center justify-center text-xl font-bold ${color}`;
    }

    if (scoreArc) {
        scoreArc.setAttribute('stroke-dasharray', `${analysis.score}, 100`);
        const arcColor = analysis.score >= 60 ? 'text-green-500' : analysis.score >= 40 ? 'text-amber-500' : 'text-red-500';
        scoreArc.className.baseVal = arcColor;
    }

    if (savingsRateValue) {
        savingsRateValue.textContent = `${analysis.savingsRate}%`;
        savingsRateValue.className = `font-semibold ${analysis.savingsRate >= 10 ? 'text-green-500' : 'text-amber-500'}`;
    }

    if (onTimeRateValue) {
        const onTimeRate = analysis.overdueCount === 0 ? 100 : Math.max(0, 100 - analysis.overdueCount * 10);
        onTimeRateValue.textContent = `${onTimeRate}%`;
        onTimeRateValue.className = `font-semibold ${onTimeRate >= 80 ? 'text-green-500' : 'text-amber-500'}`;
    }

    if (budgetStatusValue) {
        const hasBudget = Object.keys(state.monthlyBudget || {}).length > 0;
        budgetStatusValue.textContent = hasBudget ? 'Definido' : 'Não definido';
        budgetStatusValue.className = `font-semibold ${hasBudget ? 'text-green-500' : 'text-yellow-500'}`;
    }
}
