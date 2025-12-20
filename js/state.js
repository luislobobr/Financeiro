/**
 * Global Application State
 */
export const state = {
    allTransactions: [],
    monthlyBudget: {},
    categories: [],
    creditCards: [],
    paymentMethods: [], // Formas de pagamento
    partnerNames: { partner1: 'Parceiro 1', partner2: 'Parceiro 2' },
    currentEditId: null,
    currentReportMonth: null,
    currentReportYear: null,
    selectedPendingItems: [] // Itens selecionados em Contas a Pagar
};
