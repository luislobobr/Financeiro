/**
 * Google Gemini API Integration Module
 * Provides AI-powered financial analysis using Google's Gemini Pro
 */

import { showToast } from './utils.js';
import { state } from './state.js';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Get API key from Firebase settings
 */
export function getApiKey() {
    return state.geminiApiKey || localStorage.getItem('geminiApiKey') || '';
}

/**
 * Set API key (save to localStorage and state)
 */
export function setApiKey(key) {
    state.geminiApiKey = key;
    localStorage.setItem('geminiApiKey', key);
}

/**
 * Check if API key is configured
 */
export function hasApiKey() {
    return getApiKey().trim().length > 0;
}

/**
 * Clear API key
 */
export function clearApiKey() {
    state.geminiApiKey = '';
    localStorage.removeItem('geminiApiKey');
}

/**
 * Format financial data for AI analysis (anonymized)
 */
export function formatFinancialDataForAI(transactions) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter current month transactions
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.paymentDate || t.dueDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Calculate totals
    const income = monthTransactions
        .filter(t => t.type === 'Receita' && t.status === 'Pago')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago')
        .reduce((sum, t) => sum + t.amount, 0);

    // Overdue (exclude credit card purchases - they're paid via invoice)
    const today = now.toISOString().split('T')[0];
    const overdue = transactions
        .filter(t => t.status === 'A Pagar' && t.dueDate < today && t.paymentMethod !== 'credito')
        .reduce((sum, t) => sum + t.amount, 0);


    // Category breakdown
    const categorySpending = {};
    monthTransactions
        .filter(t => t.type === 'Despesa' && t.status === 'Pago')
        .forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

    const topCategories = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, val]) => ({ categoria: cat, valor: val }));

    // Recurring expenses
    const recurring = transactions.filter(t => t.isRecurring && t.type === 'Despesa');
    const recurringTotal = recurring.reduce((sum, t) => sum + t.amount, 0);

    return {
        mes_atual: `${currentMonth + 1}/${currentYear}`,
        receitas_totais: income,
        despesas_totais: expenses,
        saldo: income - expenses,
        contas_atrasadas: overdue,
        top_5_categorias: topCategories,
        assinaturas_recorrentes: recurringTotal,
        total_transacoes: monthTransactions.length
    };
}

/**
 * Analyze finances with AI
 */
export async function analyzeFinancesWithAI(transactions) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('API Key do Google Gemini não configurada. Configure em Configurações.');
    }

    const financialData = formatFinancialDataForAI(transactions);

    const prompt = `Você é um consultor financeiro pessoal especializado em finanças domésticas brasileiras. 

Analise os seguintes dados financeiros do mês atual e forneça recomendações práticas:

${JSON.stringify(financialData, null, 2)}

Forneça uma análise estruturada com:

1. **Resumo da Situação** (2-3 linhas): Avaliação geral da saúde financeira
2. **Pontos de Atenção** (2-3 itens): Áreas que precisam de ajustes imediatos
3. **Recomendações Práticas** (3-4 dicas): Ações específicas para melhorar as finanças

Seja direto, prático e use linguagem acessível. Foque em ações concretas que a pessoa pode tomar.`;

    try {
        const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Erro ao chamar API do Gemini');
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Nenhuma resposta gerada pela IA');
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        return parseAIResponse(aiResponse);

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(responseText) {
    return {
        rawResponse: responseText,
        summary: extractSection(responseText, 'Resumo da Situação', 'Pontos de Atenção') ||
            extractSection(responseText, '1.', '2.') ||
            responseText.split('\n\n')[0] ||
            responseText.substring(0, 300),
        concerns: extractSection(responseText, 'Pontos de Atenção', 'Recomendações') ||
            extractSection(responseText, '2.', '3.') ||
            '',
        recommendations: extractSection(responseText, 'Recomendações', '') ||
            extractSection(responseText, '3.', '') ||
            ''
    };
}

/**
 * Extract section from text between markers
 */
function extractSection(text, startMarker, endMarker) {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return null;

    const start = startIndex + startMarker.length;
    const end = endMarker ? text.indexOf(endMarker, start) : text.length;

    if (endMarker && end === -1) {
        return text.substring(start).trim();
    }

    return text.substring(start, end !== -1 ? end : text.length).trim();
}

/**
 * Test API key validity
 */
export async function testApiKey(key) {
    try {
        const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Teste de conexão. Responda apenas "OK".'
                    }]
                }]
            })
        });

        return response.ok;
    } catch (error) {
        console.error('API key test failed:', error);
        return false;
    }
}
