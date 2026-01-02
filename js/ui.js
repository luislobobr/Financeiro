/**
 * UI Functions
 * Handles DOM manipulation, navigation, themes, and modals
 */

import { showElement, hideElement, today, categoryColorClasses, showToast, isMobile } from './utils.js';
import { state } from './state.js'; // FIX: Import from state.js instead of app.js

// Re-export utility functions used by other modules that import from ui.js
export { showElement, hideElement, showToast };

// DOM element references
let elements = {};
// ... (rest of the file stays mostly same, but I will include it to be safe)

/**
 * Initialize DOM element references
 */
export function initializeElements() {
    elements = {
        // Modals
        familyModal: document.getElementById('familyModal'),
        settingsModal: document.getElementById('settingsModal'),
        importModal: document.getElementById('importModal'),
        transactionModal: document.getElementById('transactionModal'),
        categoriesModal: document.getElementById('categoriesModal'),
        paymentMethodsModal: document.getElementById('paymentMethodsModal'),
        confirmPaymentModal: document.getElementById('confirmPaymentModal'),

        // Navigation
        navBtnDashboard: document.getElementById('navBtnDashboard'),
        navBtnPending: document.getElementById('navBtnPending'),
        navBtnHistory: document.getElementById('navBtnHistory'),
        navBtnIncome: document.getElementById('navBtnIncome'),
        navBtnPlanning: document.getElementById('navBtnPlanning'),
        navBtnCreditCards: document.getElementById('navBtnCreditCards'),
        navBtnReports: document.getElementById('navBtnReports'),
        navBtnBi: document.getElementById('navBtnBi'),
        navBtnSubscriptions: document.getElementById('navBtnSubscriptions'),
        navBtnGoals: document.getElementById('navBtnGoals'),
        navBtnAiConsultant: document.getElementById('navBtnAiConsultant'),
        goToAiConsultantBtn: document.getElementById('goToAiConsultantBtn'),

        // Mobile elements
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        sidebar: document.getElementById('sidebar'),

        // Pages
        pageDashboard: document.getElementById('page-dashboard'),
        pagePending: document.getElementById('page-pending'),
        pageHistory: document.getElementById('page-history'),
        pageIncome: document.getElementById('page-income'),
        pagePlanning: document.getElementById('page-planning'),
        pageCreditCards: document.getElementById('page-credit-cards'),
        pageReports: document.getElementById('page-reports'),
        pageBi: document.getElementById('page-bi'),
        pageSubscriptions: document.getElementById('page-subscriptions'),
        pageGoals: document.getElementById('page-goals'),
        pageAiConsultant: document.getElementById('page-ai-consultant'),


        // Main containers
        loadingIndicator: document.getElementById('loadingIndicator'),
        appContainer: document.getElementById('appContainer'),
        currentFamilyIdEl: document.getElementById('currentFamilyId'),

        // Page content containers
        dashboardContent: document.getElementById('dashboardContent'),
        pendingList: document.getElementById('pendingList'),
        historyList: document.getElementById('historyList'),
        incomeList: document.getElementById('incomeList'),
        reportResults: document.getElementById('reportResults'), // Keep for legacy if needed
        creditCardsPageContent: document.getElementById('creditCardsPageContent'),

        // Buttons
        createFamilyBtn: document.getElementById('createFamilyBtn'),
        joinFamilyBtn: document.getElementById('joinFamilyBtn'),
        copyFamilyIdBtn: document.getElementById('copyFamilyIdBtn'),
        startAppBtn: document.getElementById('startAppBtn'),
        copyIdBtn: document.getElementById('copyIdBtn'),
        addTransactionBtn: document.getElementById('addTransactionBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),
        openCategoriesBtn: document.getElementById('openCategoriesBtn'),
        closeCategoriesModalBtn: document.getElementById('closeCategoriesModalBtn'),
        openPaymentMethodsBtn: document.getElementById('openPaymentMethodsBtn'),
        closePaymentMethodsModalBtn: document.getElementById('closePaymentMethodsModalBtn'),
        openCreditCardsBtn: document.getElementById('openCreditCardsBtn'),

        // Credit Card Modal
        creditCardsModal: document.getElementById('creditCardsModal'),
        closeCreditCardsModalBtn: document.getElementById('closeCreditCardsModalBtn'),
        addCreditCardForm: document.getElementById('addCreditCardForm'),
        creditCardsList: document.getElementById('creditCardsList'),
        cancelPaymentBtn: document.getElementById('cancelPaymentBtn'),
        confirmPaymentBtn: document.getElementById('confirmPaymentBtn'),
        disconnectFamilyBtn: document.getElementById('disconnectFamilyBtn'),

        closeTransactionModalBtn: document.getElementById('closeTransactionModalBtn'),
        importCsvBtn: document.getElementById('importCsvBtn'),
        closeImportModalBtn: document.getElementById('closeImportModalBtn'),
        cancelImportBtn: document.getElementById('cancelImportBtn'),
        confirmImportBtn: document.getElementById('confirmImportBtn'),

        // Forms
        transactionForm: document.getElementById('transactionForm'),
        settingsForm: document.getElementById('settingsForm'),
        addCategoryForm: document.getElementById('addCategoryForm'),
        addPaymentMethodForm: document.getElementById('addPaymentMethodForm'),

        filterForm: document.getElementById('filterForm'),
        pendingFilterForm: document.getElementById('pendingFilterForm'),
        incomeFilterForm: document.getElementById('incomeFilterForm'),
        budgetForm: document.getElementById('budgetForm'),
        reportFilterForm: document.getElementById('reportFilterForm'),

        // Form inputs
        familyIdInput: document.getElementById('familyIdInput'),
        familyIdDisplay: document.getElementById('familyIdDisplay'),
        newFamilyIdSection: document.getElementById('newFamilyIdSection'),
        partner1NameInput: document.getElementById('partner1NameInput'),
        partner2NameInput: document.getElementById('partner2NameInput'),
        categorySelect: document.getElementById('category'),
        paidBySelect: document.getElementById('paidBy'),
        dueDateInput: document.getElementById('dueDate'),
        paymentDateInput: document.getElementById('paymentDate'),
        statusSelect: document.getElementById('status'),
        expenseTypeContainer: document.getElementById('expenseTypeContainer'),
        expenseTypeSelect: document.getElementById('expenseType'),
        isRecurringCheckbox: document.getElementById('isRecurring'),
        paymentMethodSelect: document.getElementById('paymentMethod'),
        confirmPaymentMethodSelect: document.getElementById('confirmPaymentMethod'),

        csvFileInput: document.getElementById('csvFileInput'),
        newCategoryNameInput: document.getElementById('newCategoryName'),

        // Cerdit Card Inputs
        newCardName: document.getElementById('newCardName'),
        newCardHolder: document.getElementById('newCardHolder'),
        newCardClosingDay: document.getElementById('newCardClosingDay'),
        newCardDueDay: document.getElementById('newCardDueDay'),

        // Transaction form card fields
        creditCardSection: document.getElementById('creditCardSection'),
        cardSelect: document.getElementById('cardSelect'),
        installments: document.getElementById('installments'),
        invoicePreview: document.getElementById('invoicePreview'),
        creditCardMonthFilter: document.getElementById('creditCardMonthFilter'),

        // Transaction form inputs (additional references)
        descriptionInput: document.getElementById('description'),
        amountInput: document.getElementById('amount'),

        // Transaction modal elements
        transactionModalTitle: document.getElementById('transactionModalTitle'),
        transactionSubmitBtn: document.getElementById('transactionSubmitBtn'),

        // Filter inputs
        filterStartDate: document.getElementById('filterStartDate'),
        filterEndDate: document.getElementById('filterEndDate'),
        filterCategory: document.getElementById('filterCategory'),
        historyFilterMonth: document.getElementById('historyFilterMonth'),
        clearFilterBtn: document.getElementById('clearFilterBtn'),
        pendingFilterStartDate: document.getElementById('pendingFilterStartDate'),
        pendingFilterEndDate: document.getElementById('pendingFilterEndDate'),
        pendingFilterMonth: document.getElementById('pendingFilterMonth'),
        pendingFilterCategory: document.getElementById('pendingFilterCategory'),
        pendingClearFilterBtn: document.getElementById('pendingClearFilterBtn'),
        incomeFilterStartDate: document.getElementById('incomeFilterStartDate'),
        incomeFilterEndDate: document.getElementById('incomeFilterEndDate'),
        incomeFilterCategory: document.getElementById('incomeFilterCategory'),
        incomeCurrentMonthBtn: document.getElementById('incomeCurrentMonthBtn'),
        incomeLastMonthBtn: document.getElementById('incomeLastMonthBtn'),
        incomeLast3MonthsBtn: document.getElementById('incomeLast3MonthsBtn'),
        incomeAllBtn: document.getElementById('incomeAllBtn'),
        incomeClearFilterBtn: document.getElementById('incomeClearFilterBtn'),
        reportMonthSelect: document.getElementById('reportMonth'),
        reportYearInput: document.getElementById('reportYear'),
        dreReportContainer: document.getElementById('dreReportContainer'),
        dreReportEmpty: document.getElementById('dreReportEmpty'),
        comparativoMensalContainer: document.getElementById('comparativoMensalContainer'),
        despesasPorParceiroContainer: document.getElementById('despesasPorParceiroContainer'),
        despesasPorFormaPagamentoContainer: document.getElementById('despesasPorFormaPagamentoContainer'),

        // Quick filter buttons
        pendingCurrentMonthBtn: document.getElementById('pendingCurrentMonthBtn'),
        pendingNextMonthBtn: document.getElementById('pendingNextMonthBtn'),
        pendingNext3MonthsBtn: document.getElementById('pendingNext3MonthsBtn'),
        pendingAllBtn: document.getElementById('pendingAllBtn'),
        historyCurrentMonthBtn: document.getElementById('historyCurrentMonthBtn'),
        historyLastMonthBtn: document.getElementById('historyLastMonthBtn'),
        historyLast3MonthsBtn: document.getElementById('historyLast3MonthsBtn'),
        historyAllBtn: document.getElementById('historyAllBtn'),


        // Report filters
        reportFilterCategory: document.getElementById('reportFilterCategory'),

        // BI filters
        biFilterForm: document.getElementById('biFilterForm'),
        biFilterStartDate: document.getElementById('biFilterStartDate'),
        biFilterEndDate: document.getElementById('biFilterEndDate'),
        biFilterCategory: document.getElementById('biFilterCategory'),

        // Lists and containers
        transactionList: document.getElementById('transactionList'),
        pendingList: document.getElementById('pendingList'),
        incomeList: document.getElementById('incomeList'),
        overdueList: document.getElementById('overdueList'),
        categoriesList: document.getElementById('categoriesList'),
        paymentMethodsList: document.getElementById('paymentMethodsList'),

        budgetProgressContainer: document.getElementById('budgetProgressContainer'),
        dreReportContainer: document.getElementById('dreReportContainer'),
        biChartContainer: document.getElementById('bi-chart'),
        openInvoicesContainer: document.getElementById('openInvoicesContainer'),
        invoicesHistoryContainer: document.getElementById('invoicesHistoryContainer'),

        // Empty states
        emptyState: document.getElementById('emptyState'),
        emptyStatePending: document.getElementById('emptyStatePending'),
        emptyStateIncome: document.getElementById('emptyStateIncome'),
        emptyStateOverdue: document.getElementById('emptyStateOverdue'),
        dreReportEmpty: document.getElementById('dreReportEmpty'),
        biChartEmpty: document.getElementById('bi-chart-empty'),

        // Totals
        totalBalanceEl: document.getElementById('totalBalance'),
        totalIncomeEl: document.getElementById('totalIncome'),
        totalExpenseEl: document.getElementById('totalExpense'),
        totalPendingCurrentMonthEl: document.getElementById('totalPendingCurrentMonth'),
        totalOverdueAmountEl: document.getElementById('totalOverdueAmount'),
        pendingTotalAmountEl: document.getElementById('pendingTotalAmount'),
        pendingTotalFixedAmountEl: document.getElementById('pendingTotalFixedAmount'),
        pendingItemsCountEl: document.getElementById('pendingItemsCount'),
        historyTotalAmountEl: document.getElementById('historyTotalAmount'),
        historyAverageAmountEl: document.getElementById('historyAverageAmount'),
        historyItemsCountEl: document.getElementById('historyItemsCount'),
        incomeTotalAmountEl: document.getElementById('incomeTotalAmount'),
        pendingSelectedCount: document.getElementById('pendingSelectedCount'),
        pendingSelectedAmount: document.getElementById('pendingSelectedAmount'),
        selectAllPendingCheckbox: document.getElementById('selectAllPendingCheckbox'),

        // Import modal elements
        importPaidBySelect: document.getElementById('importPaidBy'),
        csvPreviewHead: document.getElementById('csvPreviewHead'),
        csvPreviewBody: document.getElementById('csvPreviewBody'),
        importReviewStep: document.getElementById('importReviewStep'),
        importLoadingStep: document.getElementById('importLoadingStep'),

        // Payment methods
        newPaymentMethodName: document.getElementById('newPaymentMethodName'),
        paymentDateContainer: document.getElementById('paymentDateContainer'),
        aiAnalysisButton: document.getElementById('aiAnalysisButton'),
        confirmPaymentMethodSelect: document.getElementById('confirmPaymentMethodSelect'),
        confirmPaymentTransactionId: document.getElementById('confirmPaymentTransactionId'),

        // Toast
        toastNotification: document.getElementById('toastNotification'),

        // Goals Modal elements
        goalModal: document.getElementById('goalModal'),
        goalForm: document.getElementById('goalForm'),
        goalFormTitle: document.getElementById('goalFormTitle'),
        goalNameInput: document.getElementById('goalNameInput'),
        goalTargetInput: document.getElementById('goalTargetInput'),
        goalCurrentInput: document.getElementById('goalCurrentInput'),
        goalDeadlineInput: document.getElementById('goalDeadlineInput'),
        goalIconInput: document.getElementById('goalIconInput'),
        goalCategorySelect: document.getElementById('goalCategorySelect'),
        closeGoalModalBtn: document.getElementById('closeGoalModalBtn'),
        goalsPageContent: document.getElementById('goalsPageContent'),

        // Contribution Modal elements
        contributionModal: document.getElementById('contributionModal'),
        closeContributionModalBtn: document.getElementById('closeContributionModalBtn'),
        contributionGoalName: document.getElementById('contributionGoalName'),
        contributionGoalId: document.getElementById('contributionGoalId'),
        contributionAmountInput: document.getElementById('contributionAmountInput'),
        confirmContributionBtn: document.getElementById('confirmContributionBtn'),

        // Confirm Delete Modal elements
        confirmDeleteModal: document.getElementById('confirmDeleteModal'),
        confirmDeleteMessage: document.getElementById('confirmDeleteMessage'),
        confirmDeleteItemId: document.getElementById('confirmDeleteItemId'),
        confirmDeleteItemType: document.getElementById('confirmDeleteItemType'),
        cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    };



    return elements;
}

/**
 * Get all DOM elements
 */
export function getElements() {
    return elements;
}

/**
 * Get all pages array
 */
export function getAllPages() {
    return [
        elements.pageDashboard,
        elements.pagePending,
        elements.pageHistory,
        elements.pageIncome,
        elements.pagePlanning,
        elements.pageCreditCards,
        elements.pageReports,
        elements.pageBi,
        elements.pageSubscriptions,
        elements.pageGoals,
        elements.pageAiConsultant
    ];
}


/**
 * Get all nav buttons array
 */
export function getAllNavBtns() {
    return [
        elements.navBtnDashboard,
        elements.navBtnPending,
        elements.navBtnHistory,
        elements.navBtnIncome,
        elements.navBtnPlanning,
        elements.navBtnCreditCards,
        elements.navBtnReports,
        elements.navBtnBi
    ];
}

/**
 * Switch between pages
 */
export function switchPage(targetPageId) {
    getAllPages().forEach(page => hideElement(page));
    getAllNavBtns().forEach(btn => btn.classList.remove('active'));

    const pageToShow = document.getElementById(targetPageId);
    if (!targetPageId) return;

    const btnIdMap = {
        'page-dashboard': 'navBtnDashboard',
        'page-pending': 'navBtnPending',
        'page-history': 'navBtnHistory',
        'page-income': 'navBtnIncome',
        'page-planning': 'navBtnPlanning',
        'page-credit-cards': 'navBtnCreditCards',
        'page-reports': 'navBtnReports',
        'page-bi': 'navBtnBi',
        'page-subscriptions': 'navBtnSubscriptions',
        'page-goals': 'navBtnGoals',
        'page-ai-consultant': 'navBtnAiConsultant'
    };

    const btnToActivate = document.getElementById(btnIdMap[targetPageId]);

    if (pageToShow) showElement(pageToShow);
    if (btnToActivate) btnToActivate.classList.add('active');
}

// ... existing code ...
/**
 * Set theme (dark or light)
 */
export function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
}

/**
 * Toggle current theme
 */
export function toggleTheme() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

/**
 * Initialize theme on page load
 */
export function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

/**
 * Open transaction modal
 * @param {boolean} isEdit - Whether this is an edit operation
 * @param {object} overrides - Optional data to pre-fill the form fields
 */
export function openTransactionModal(isEdit = false, overrides = {}) {
    if (isEdit) {
        elements.transactionModalTitle.textContent = "Editar Transação";
        elements.transactionSubmitBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Atualizar Transação
        `;
        elements.transactionSubmitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        elements.transactionSubmitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    } else {
        resetFormState();
        elements.transactionModalTitle.textContent = "Adicionar Transação";
        elements.transactionSubmitBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Adicionar Transação
        `;
        elements.transactionSubmitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        elements.transactionSubmitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }

    // Apply overrides to form fields if provided
    if (overrides && Object.keys(overrides).length > 0) {
        if (overrides.description) elements.descriptionInput.value = overrides.description;
        if (overrides.amount) elements.amountInput.value = overrides.amount;
        if (overrides.category) elements.categorySelect.value = overrides.category;
        if (overrides.paidBy) elements.paidBySelect.value = overrides.paidBy;
        if (overrides.type) {
            const typeRadio = document.querySelector(`input[name="type"][value="${overrides.type}"]`);
            if (typeRadio) typeRadio.checked = true;
            toggleExpenseTypeVisibility();
        }
        if (overrides.expenseType) elements.expenseTypeSelect.value = overrides.expenseType;
        if (overrides.status) elements.statusSelect.value = overrides.status;
        if (overrides.paymentMethod) elements.paymentMethodSelect.value = overrides.paymentMethod;

        // Handle hidden fields for invoice payment
        if (overrides.isInvoicePayment !== undefined) {
            const isInvoicePaymentField = document.getElementById('isInvoicePayment');
            if (isInvoicePaymentField) isInvoicePaymentField.value = overrides.isInvoicePayment ? 'true' : 'false';
        }
        if (overrides.invoiceCardId) {
            const invoiceCardIdField = document.getElementById('invoiceCardId');
            if (invoiceCardIdField) invoiceCardIdField.value = overrides.invoiceCardId;
        }
        if (overrides.invoiceMonthDate) {
            const invoiceMonthDateField = document.getElementById('invoiceMonthDate');
            if (invoiceMonthDateField) invoiceMonthDateField.value = overrides.invoiceMonthDate;
        }

        // Trigger visibility toggles after setting values
        togglePaymentDateVisibility();
    }

    showElement(elements.transactionModal);
}

/**
 * Close transaction modal
 */
export function closeTransactionModal() {
    hideElement(elements.transactionModal);
    resetFormState();
}

/**
 * Reset form to add mode
 */
export function resetFormState() {
    state.currentEditId = null;
    elements.transactionForm.reset();
    elements.dueDateInput.value = today;
    elements.paymentDateInput.value = today;
    elements.statusSelect.value = "Pago";
    elements.expenseTypeSelect.value = "Variável";
    elements.isRecurringCheckbox.checked = false;

    togglePaymentDateVisibility();
    toggleExpenseTypeVisibility();
    // toggleCreditCardVisibility removed
}

/**
 * Toggle payment date visibility based on status
 */
export function togglePaymentDateVisibility() {
    if (!elements.statusSelect) return;
    const status = elements.statusSelect.value;
    if (status === 'A Pagar') {
        hideElement(elements.paymentDateInput.parentElement);
        elements.paymentDateInput.value = '';
    } else {
        showElement(elements.paymentDateInput.parentElement);
        if (!elements.paymentDateInput.value) {
            elements.paymentDateInput.value = today;
        }
    }
}

/**
 * Toggle expense type visibility based on transaction type
 */
export function toggleExpenseTypeVisibility() {
    if (!elements.transactionForm) return;
    const type = elements.transactionForm.elements['type'].value;
    if (type === 'Despesa') {
        showElement(elements.expenseTypeContainer);
    } else {
        hideElement(elements.expenseTypeContainer);
    }
}

/**
 * Toggle credit card visibility
 */
export function toggleCreditCardVisibility() {
    if (!elements.paymentMethodSelect) {
        console.warn('[toggleCreditCardVisibility] paymentMethodSelect not found');
        return;
    }

    // Check if selected method is credit card
    const selectedValue = elements.paymentMethodSelect.value;
    console.log('[toggleCreditCardVisibility] Payment method selected:', selectedValue);

    // Check both value and text for credit card (case-insensitive)
    const isCredit = selectedValue === 'credito' || selectedValue.toLowerCase() === 'crédito';
    console.log('[toggleCreditCardVisibility] isCredit:', isCredit);

    if (isCredit) {
        console.log('[toggleCreditCardVisibility] Showing credit card section');
        showElement(elements.creditCardSection);
        // Ocultar Data Pagamento e Status (sempre será A Pagar/Faturado)
        if (elements.paymentDateInput && elements.paymentDateInput.parentElement) {
            hideElement(elements.paymentDateInput.parentElement);
        }
        if (elements.statusSelect && elements.statusSelect.parentElement) {
            hideElement(elements.statusSelect.parentElement);
            elements.statusSelect.value = 'A Pagar';
        }
        if (elements.cardSelect) {
            elements.cardSelect.required = true;
        }
    } else {
        console.log('[toggleCreditCardVisibility] Hiding credit card section');
        hideElement(elements.creditCardSection);
        if (elements.statusSelect && elements.statusSelect.parentElement) {
            showElement(elements.statusSelect.parentElement);
        }
        if (elements.cardSelect) {
            elements.cardSelect.required = false;
        }

        // Restore payment date logic
        togglePaymentDateVisibility();
    }
}

/**
 * Update credit card invoice preview
 * Calculates the invoice month based on purchase date and closing day
 */
export function updateCardInvoicePreview(creditCards) {
    if (!elements.creditCardSection || elements.creditCardSection.classList.contains('hidden')) return;

    const cardId = elements.cardSelect.value;
    const dateStr = elements.dueDateInput.value; // Using DueDate as Purchase Date for expense

    if (!cardId || !dateStr) {
        elements.invoicePreview.textContent = '';
        return;
    }

    const card = creditCards.find(c => c.id === cardId);
    if (!card) return;

    const purchaseDate = new Date(dateStr + 'T12:00:00');
    const day = purchaseDate.getDate();
    const month = purchaseDate.getMonth();
    const year = purchaseDate.getFullYear();

    let invoiceMonth = new Date(year, month, 1);

    // Se dia da compra >= dia fechamento, vai para próximo mês
    if (day >= card.closingDay) {
        invoiceMonth.setMonth(invoiceMonth.getMonth() + 1);
    }

    const monthName = invoiceMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    elements.invoicePreview.textContent = `📅 Fatura prevista: ${capitalized} (Fecha dia ${card.closingDay})`;
}

/**
 * Update paid by dropdown
 */
export function updatePaidByDropdown(selectElement, partnerNames) {
    if (!selectElement) return;
    let names = partnerNames;
    if (!names) {
        // Fallback if not provided
        names = state.partnerNames;
    }
    const currentValue = selectElement.value;

    selectElement.innerHTML = `
        <option>${names.partner1}</option>
        <option>${names.partner2}</option>
        <option>Conta Conjunta</option>
    `;

    if ([names.partner1, names.partner2, 'Conta Conjunta'].includes(currentValue)) {
        selectElement.value = currentValue;
    }
}

/**
 * Update settings modal inputs
 */
export function updateSettingsModalInputs(partnerNames) {
    if (!partnerNames) return;
    elements.partner1NameInput.value = partnerNames.partner1;
    elements.partner2NameInput.value = partnerNames.partner2;
}

/**
 * Reset quick filter buttons
 */
export function resetQuickFilterButtons() {
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300');
        btn.classList.add('bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-300');
    });
}

/**
 * Activate quick filter button
 */
export function activateQuickFilterButton(button) {
    resetQuickFilterButtons();
    button.classList.remove('bg-gray-100', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-300');
    button.classList.add('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300');
}

export function openCategoriesModal() {
    // Implementation needed or imported?
    // In original code this logic was inside ui.js or main script.
    // For now assuming it's handled by main app or categories.js hooking in.
    // Actually, app.js imports openCategoriesModal from here?
    // Wait, the original plan had categories.js handle logic but UI.js handle modals.
    // Let's ensure showElement is called.
    showElement(elements.categoriesModal);
}
export function closeCategoriesModal() {
    hideElement(elements.categoriesModal);
}

// Payment methods modal functions
export function openPaymentMethodsModal() {
    showElement(elements.paymentMethodsModal);
}
export function closePaymentMethodsModal() {
    hideElement(elements.paymentMethodsModal);
}

export function openCreditCardsModal() {
    showElement(elements.creditCardsModal);
}

export function closeCreditCardsModal() {
    hideElement(elements.creditCardsModal);
}

// Confirm payment modal functions
export function openConfirmPaymentModal(transactionId) {
    elements.confirmPaymentTransactionId.value = transactionId;
    elements.confirmPaymentMethodSelect.value = '';
    showElement(elements.confirmPaymentModal);
}
export function closeConfirmPaymentModal() {
    hideElement(elements.confirmPaymentModal);
    elements.confirmPaymentTransactionId.value = '';
}

/**
 * Populate month filter dropdowns with all 12 months
 */
export function populateMonthFilters() {
    const months = [
        { value: '1', label: 'Janeiro' },
        { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' },
        { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' }
    ];

    const monthOptions = months.map(m =>
        `<option value="${m.value}">${m.label}</option>`
    ).join('');

    // Populate pending filter month dropdown
    if (elements.pendingFilterMonth) {
        elements.pendingFilterMonth.innerHTML = `<option value="">Todos os meses</option>${monthOptions}`;
    }

    // Populate history filter month dropdown if it exists
    const historyFilterMonth = document.getElementById('historyFilterMonth');
    if (historyFilterMonth) {
        historyFilterMonth.innerHTML = `<option value="">Todos os meses</option>${monthOptions}`;
    }
}

/**
 * Mobile sidebar control functions
 */
export function openMobileSidebar() {
    if (elements.sidebar) {
        elements.sidebar.classList.remove('-translate-x-full');
        elements.sidebar.classList.add('translate-x-0');
    }
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.classList.remove('hidden');
    }
    document.body.classList.add('overflow-hidden');
}

export function closeMobileSidebar() {
    if (elements.sidebar) {
        elements.sidebar.classList.remove('translate-x-0');
        elements.sidebar.classList.add('-translate-x-full');
    }
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.classList.add('hidden');
    }
    document.body.classList.remove('overflow-hidden');
}

export function toggleMobileSidebar() {
    if (elements.sidebar && elements.sidebar.classList.contains('-translate-x-full')) {
        openMobileSidebar();
    } else {
        closeMobileSidebar();
    }
}
