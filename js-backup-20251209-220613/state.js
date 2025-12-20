/**
 * Application State Module
 * Centralized state management to avoid circular dependencies
 */

export const state = {
    currentEditId: null,
    partnerNames: { partner1: 'Parceiro 1', partner2: 'Parceiro 2' },
    monthlyBudget: {},
    allTransactions: [],
    creditCards: [],
    categories: [
        'Moradia',
        'Alimentação',
        'Transporte',
        'Lazer',
        'Saúde',
        'Conta de Energia',
        'Conta de Água',
        'Internet',
        'Salário',
        'Outros'
    ],
    currentReportMonth: null,
    currentReportYear: null
};
