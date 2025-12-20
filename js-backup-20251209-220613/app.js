/**
 * Main Application Entry Point
 * Initializes the app and sets up event listeners
 */

// Firebase
import {
    initializeAndAuth,
    setFamilyId,
    getFamilyId,
    getFamilyDocRef,
    setDoc,
    onSnapshot
} from './firebase.js';

// Utils
import {
    setToastElement,
    showToast,
    copyToClipboard,
    formatCurrency,
    formatDate,
    today,
    getCurrentMonthDates,
    getNextMonthDates,
    getLastMonthDates,
    getLast3MonthsDates
} from './utils.js';

// UI
import {
    initializeElements,
    getElements,
    initializeTheme,
    switchPage,
    toggleTheme,
    openTransactionModal,
    closeTransactionModal,
    togglePaymentDateVisibility,
    toggleExpenseTypeVisibility,
    toggleCreditCardVisibility,
    updatePaidByDropdown,
    updateSettingsModalInputs,
    resetQuickFilterButtons,
    activateQuickFilterButton
} from './ui.js';

// Features
import { setupTransactionListener, handleTransactionSubmit, renderGenericTransactionList } from './transactions.js';
import { setupCategoriesListener, populateCategorySelects, handleAddCategory, openCategoriesModal, closeCategoriesModal } from './categories.js';
import { setupCreditCardsListener, handleAddCreditCard, openCreditCardsModal, closeCreditCardsModal, populateCreditCardSelect, renderCreditCardsPage } from './creditCards.js';
import { setupBudgetListener, initBudgetForm, renderBudgetProgress } from './budget.js';
import { renderBIReport } from './charts.js';
import { populateReportFilters, renderDREReport } from './reports.js';
import { handleFileSelect, processImport } from './import.js';

// Import shared state from centralized module
import { state } from './state.js';
// Re-export for backwards compatibility
export { state };

let unsubscribeFamilySettings = null;

/**
 * Check if user has a saved family ID
 */
function checkFamilyId() {
    const elements = getElements();
    const storedFamilyId = localStorage.getItem('familyAppId');
    if (storedFamilyId) {
        initApp(storedFamilyId);
    } else {
        hideElement(elements.loadingIndicator);
        showElement(elements.familyModal);
    }
}

/**
 * Handle create family
 */
function handleCreateFamily() {
    const elements = getElements();
    const newFamilyId = crypto.randomUUID();
    elements.familyIdDisplay.textContent = newFamilyId;
    showElement(elements.newFamilyIdSection);
    elements.createFamilyBtn.disabled = true;
    elements.joinFamilyBtn.disabled = true;
}

/**
 * Handle start app
 */
function handleStartApp() {
    const elements = getElements();
    const newFamilyId = elements.familyIdDisplay.textContent;
    localStorage.setItem('familyAppId', newFamilyId);
    initApp(newFamilyId);
}

/**
 * Handle join family
 */
function handleJoinFamily() {
    const elements = getElements();
    const joinedFamilyId = elements.familyIdInput.value.trim();
    if (joinedFamilyId) {
        localStorage.setItem('familyAppId', joinedFamilyId);
        initApp(joinedFamilyId);
    } else {
        showToast("Por favor, insira um ID de Família válido.", true);
    }
}

/**
 * Initialize main app
 */
function initApp(currentFamilyId) {
    const elements = getElements();
    setFamilyId(currentFamilyId);

    hideElement(elements.familyModal);
    showElement(elements.loadingIndicator);
    hideElement(elements.appContainer);
    hideElement(elements.addTransactionBtn);

    elements.currentFamilyIdEl.textContent = currentFamilyId;

    // Setup listeners
    setupTransactionListener();
    setupFamilySettingsListener();
    setupBudgetListener();
    setupCategoriesListener();
    setupCreditCardsListener();

    // Populate static selects
    populateCategorySelects();
    initBudgetForm();
    populateReportFilters();
}

/**
 * Setup family settings listener
 */
function setupFamilySettingsListener() {
    if (unsubscribeFamilySettings) unsubscribeFamilySettings();

    const familyDocRef = getFamilyDocRef();
    const elements = getElements();

    unsubscribeFamilySettings = onSnapshot(familyDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().names) {
            state.partnerNames = docSnap.data().names;
        } else {
            state.partnerNames = { partner1: 'Parceiro 1', partner2: 'Parceiro 2' };
            if (!docSnap.exists()) {
                setDoc(familyDocRef, { names: state.partnerNames }, { merge: true })
                    .catch(e => console.error("Erro ao criar doc da família:", e));
            }
        }

        localStorage.setItem('partner1Name', state.partnerNames.partner1);
        localStorage.setItem('partner2Name', state.partnerNames.partner2);

        updatePaidByDropdown(elements.paidBySelect, state.partnerNames);
        updatePaidByDropdown(elements.importPaidBySelect, state.partnerNames);
        updateSettingsModalInputs(state.partnerNames);
    }, (error) => {
        console.error("Erro ao ouvir configurações da família:", error);
    });
}

/**
 * Handle save settings
 */
async function handleSaveSettings(e) {
    e.preventDefault();
    const elements = getElements();
    const name1 = elements.partner1NameInput.value.trim() || 'Parceiro 1';
    const name2 = elements.partner2NameInput.value.trim() || 'Parceiro 2';
    const newNames = { partner1: name1, partner2: name2 };

    try {
        await setDoc(getFamilyDocRef(), { names: newNames }, { merge: true });
        localStorage.setItem('partner1Name', name1);
        localStorage.setItem('partner2Name', name2);
        hideElement(elements.settingsModal);
        showToast("Nomes salvos!");
    } catch (error) {
        console.error("Erro ao salvar nomes:", error);
        showToast("Erro ao salvar nomes.", true);
    }
}

/**
 * Handle disconnect from family
 */
function handleDisconnectFamily() {
    const elements = getElements();

    if (confirm('Tem certeza que deseja desconectar desta família?\n\nSeus dados não serão apagados e você poderá reconectar usando o mesmo ID.')) {
        // Clear family ID from localStorage
        localStorage.removeItem('familyAppId');
        localStorage.removeItem('partner1Name');
        localStorage.removeItem('partner2Name');

        // Reset UI
        hideElement(elements.settingsModal);
        hideElement(elements.appContainer);
        hideElement(elements.addTransactionBtn);
        showElement(elements.familyModal);

        // Reset family input section
        hideElement(elements.newFamilyIdSection);
        elements.createFamilyBtn.disabled = false;
        elements.joinFamilyBtn.disabled = false;
        elements.familyIdInput.value = '';

        showToast("Desconectado da família com sucesso!");
    }
}

/**
 * Update all UI
 */
export function updateAllUI(transactions) {
    const elements = getElements();

    // Date filters
    const firstDayOfMonth = new Date(today.split('-')[0], today.split('-')[1] - 1, 1);

    // Month transactions (for Dashboard)
    const monthTransactions = transactions.filter(t => {
        const dateToCompare = t.paymentDate || t.dueDate;
        try {
            const transactionDate = new Date(dateToCompare + 'T00:00:00');
            return transactionDate >= firstDayOfMonth;
        } catch (e) {
            console.warn("Data inválida encontrada:", t);
            return false;
        }
    });

    // Overdue transactions
    const overdueTransactions = transactions.filter(t => t.status === 'A Pagar' && t.dueDate < today);
    const totalOverdue = overdueTransactions.reduce((sum, t) => sum + t.amount, 0);

    // 1. Render Dashboard
    renderDashboard(transactions);
    renderBudgetProgress(monthTransactions);
    renderOverdueList(overdueTransactions, totalOverdue);

    // 2. Render Pending Tab
    renderPendingList(transactions);

    // 3. Render History
    renderHistoryList(transactions);

    // 4. Render Income Tab
    renderIncomeList(transactions);

    // 5. Render DRE Report
    renderDREReport(transactions);

    // 6. Render BI Chart
    renderBIReport(transactions);

    // 7. Render Credit Cards Page
    renderCreditCardsPage();
}

/**
 * Render Dashboard
 */
function renderDashboard(allTransactions) {
    const elements = getElements();
    let totalIncome = 0;
    let totalExpense = 0;
    let totalPendingCurrentMonth = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const lastDay = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    allTransactions.forEach(t => {
        if (t.type === 'Receita' && t.status === 'Pago' && (t.paymentDate || t.dueDate) >= firstDay && (t.paymentDate || t.dueDate) <= lastDay) {
            totalIncome += t.amount;
        } else if (t.type === 'Despesa' && t.status === 'Pago' && (t.paymentDate || t.dueDate) >= firstDay && (t.paymentDate || t.dueDate) <= lastDay) {
            totalExpense += t.amount;
        }

        if (t.type === 'Despesa' && t.status === 'A Pagar' && t.dueDate >= firstDay && t.dueDate <= lastDay) {
            totalPendingCurrentMonth += t.amount;
        }
    });

    const totalBalance = totalIncome - totalExpense;

    elements.totalBalanceEl.textContent = formatCurrency(totalBalance);
    elements.totalBalanceEl.classList.toggle('text-red-600', totalBalance < 0);
    elements.totalBalanceEl.classList.toggle('dark:text-gray-100', totalBalance >= 0);
    elements.totalBalanceEl.classList.toggle('text-gray-900', totalBalance >= 0);

    elements.totalIncomeEl.textContent = formatCurrency(totalIncome);
    elements.totalExpenseEl.textContent = formatCurrency(totalExpense);
    elements.totalPendingCurrentMonthEl.textContent = formatCurrency(totalPendingCurrentMonth);
}

/**
 * Render History List
 */
function renderHistoryList(allTransactions) {
    const elements = getElements();

    const startDate = elements.filterStartDate.value;
    const endDate = elements.filterEndDate.value;
    const category = elements.filterCategory.value;

    let filteredTransactions = allTransactions.filter(t => t.status === 'Pago' && t.type === 'Despesa');

    if (startDate) {
        filteredTransactions = filteredTransactions.filter(t => (t.paymentDate || t.dueDate) >= startDate);
    }
    if (endDate) {
        filteredTransactions = filteredTransactions.filter(t => (t.paymentDate || t.dueDate) <= endDate);
    }
    if (category) {
        filteredTransactions = filteredTransactions.filter(t => t.category === category);
    }

    filteredTransactions.sort((a, b) => new Date(b.paymentDate || b.dueDate) - new Date(a.paymentDate || a.dueDate));

    const totalPaid = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averagePaid = filteredTransactions.length > 0 ? totalPaid / filteredTransactions.length : 0;
    const itemsCount = filteredTransactions.length;

    elements.historyTotalAmountEl.textContent = formatCurrency(totalPaid);
    elements.historyAverageAmountEl.textContent = formatCurrency(averagePaid);
    elements.historyItemsCountEl.textContent = itemsCount.toString();

    renderGenericTransactionList(elements.transactionList, filteredTransactions, elements.emptyState);
}

/**
 * Render Income List
 */
function renderIncomeList(allTransactions) {
    const elements = getElements();

    const startDate = elements.incomeFilterStartDate.value;
    const endDate = elements.incomeFilterEndDate.value;
    const category = elements.incomeFilterCategory.value;

    let filteredTransactions = allTransactions.filter(t => t.type === 'Receita');

    if (startDate) {
        filteredTransactions = filteredTransactions.filter(t => (t.paymentDate || t.dueDate) >= startDate);
    }
    if (endDate) {
        filteredTransactions = filteredTransactions.filter(t => (t.paymentDate || t.dueDate) <= endDate);
    }
    if (category && category !== 'Todas') {
        filteredTransactions = filteredTransactions.filter(t => t.category === category);
    }

    filteredTransactions.sort((a, b) => new Date(b.paymentDate || b.dueDate) - new Date(a.paymentDate || a.dueDate));

    const totalIncome = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    if (totalIncome > 0) {
        elements.incomeTotalAmountEl.textContent = `Total Recebido (Filtrado): ${formatCurrency(totalIncome)}`;
        showElement(elements.incomeTotalAmountEl);
    } else {
        hideElement(elements.incomeTotalAmountEl);
    }

    renderGenericTransactionList(elements.incomeList, filteredTransactions, elements.emptyStateIncome);
}

/**
 * Render Pending List
 */
function renderPendingList(allTransactions) {
    const elements = getElements();

    const startDate = elements.pendingFilterStartDate.value;
    const endDate = elements.pendingFilterEndDate.value;
    const category = elements.pendingFilterCategory.value;

    let pendingTransactions = allTransactions.filter(t => t.status === 'A Pagar');

    if (startDate) {
        pendingTransactions = pendingTransactions.filter(t => t.dueDate >= startDate);
    }
    if (endDate) {
        pendingTransactions = pendingTransactions.filter(t => t.dueDate <= endDate);
    }
    if (category) {
        pendingTransactions = pendingTransactions.filter(t => t.category === category);
    }

    const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalFixed = pendingTransactions
        .filter(t => t.expenseType === 'Fixa')
        .reduce((sum, t) => sum + t.amount, 0);
    const itemsCount = pendingTransactions.length;

    pendingTransactions.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    renderGenericTransactionList(elements.pendingList, pendingTransactions, elements.emptyStatePending);

    elements.pendingTotalAmountEl.textContent = formatCurrency(totalPending);
    elements.pendingTotalFixedAmountEl.textContent = formatCurrency(totalFixed);
    elements.pendingItemsCountEl.textContent = itemsCount.toString();
}

/**
 * Render Overdue List
 */
function renderOverdueList(overdueTransactions, totalOverdue) {
    const elements = getElements();
    overdueTransactions.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    renderGenericTransactionList(elements.overdueList, overdueTransactions, elements.emptyStateOverdue);

    if (totalOverdue > 0) {
        elements.totalOverdueAmountEl.textContent = `Total Atrasado: ${formatCurrency(totalOverdue)}`;
        showElement(elements.totalOverdueAmountEl);
    } else {
        hideElement(elements.totalOverdueAmountEl);
    }
}

// Helper functions
function showElement(el) {
    if (el) el.classList.remove('hidden');
}

function hideElement(el) {
    if (el) el.classList.add('hidden');
}

/**
 * Main initialization
 */
window.onload = async () => {
    try {
        // Initialize DOM elements
        const elements = initializeElements();

        // Set toast element
        setToastElement(elements.toastNotification);

        // Set default dates
        elements.dueDateInput.value = today;
        elements.paymentDateInput.value = today;

        // Initialize theme
        initializeTheme();

        // Navigation listeners
        elements.navBtnDashboard.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-dashboard'); });
        elements.navBtnPending.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-pending'); });
        elements.navBtnHistory.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-history'); });
        elements.navBtnIncome.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-income'); });
        elements.navBtnPlanning.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-planning'); });
        elements.navBtnReports.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-reports'); });
        elements.navBtnBi.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-bi'); });
        elements.navBtnCreditCards.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-credit-cards'); });

        // Form visibility listeners
        elements.statusSelect.addEventListener('change', togglePaymentDateVisibility);

        const typeRadioButtons = document.querySelectorAll('input[name="type"]');
        typeRadioButtons.forEach(radio => radio.addEventListener('change', () => {
            toggleExpenseTypeVisibility();
            toggleCreditCardVisibility();
        }));
        toggleExpenseTypeVisibility();
        toggleCreditCardVisibility();

        // Family modal listeners
        elements.createFamilyBtn.addEventListener('click', handleCreateFamily);
        elements.joinFamilyBtn.addEventListener('click', handleJoinFamily);
        elements.copyFamilyIdBtn.addEventListener('click', () => copyToClipboard(elements.familyIdDisplay.textContent, elements.copyFamilyIdBtn));
        elements.startAppBtn.addEventListener('click', handleStartApp);
        elements.copyIdBtn.addEventListener('click', () => copyToClipboard(getFamilyId(), elements.copyIdBtn));

        // Settings modal
        elements.openSettingsBtn.addEventListener('click', () => showElement(elements.settingsModal));
        elements.closeSettingsBtn.addEventListener('click', () => hideElement(elements.settingsModal));
        elements.settingsForm.addEventListener('submit', handleSaveSettings);
        elements.disconnectFamilyBtn.addEventListener('click', handleDisconnectFamily);

        // Categories modal
        elements.openCategoriesBtn.addEventListener('click', openCategoriesModal);
        elements.closeCategoriesModalBtn.addEventListener('click', closeCategoriesModal);
        elements.addCategoryForm.addEventListener('submit', handleAddCategory);

        // Credit cards modal
        elements.openCreditCardsBtn.addEventListener('click', openCreditCardsModal);
        elements.closeCreditCardsModalBtn.addEventListener('click', closeCreditCardsModal);
        elements.addCreditCardForm.addEventListener('submit', handleAddCreditCard);

        // Transaction modal
        elements.transactionForm.addEventListener('submit', handleTransactionSubmit);
        elements.addTransactionBtn.addEventListener('click', () => openTransactionModal(false));
        elements.closeTransactionModalBtn.addEventListener('click', closeTransactionModal);

        // Quick filter buttons - Pending
        elements.pendingCurrentMonthBtn.addEventListener('click', () => {
            const dates = getCurrentMonthDates();
            elements.pendingFilterStartDate.value = dates.start;
            elements.pendingFilterEndDate.value = dates.end;
            elements.pendingFilterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.pendingCurrentMonthBtn);
        });
        elements.pendingNextMonthBtn.addEventListener('click', () => {
            const dates = getNextMonthDates();
            elements.pendingFilterStartDate.value = dates.start;
            elements.pendingFilterEndDate.value = dates.end;
            elements.pendingFilterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.pendingNextMonthBtn);
        });
        elements.pendingAllBtn.addEventListener('click', () => {
            elements.pendingFilterStartDate.value = '';
            elements.pendingFilterEndDate.value = '';
            elements.pendingFilterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.pendingAllBtn);
        });

        // Quick filter buttons - History
        elements.historyCurrentMonthBtn.addEventListener('click', () => {
            const dates = getCurrentMonthDates();
            elements.filterStartDate.value = dates.start;
            elements.filterEndDate.value = dates.end;
            elements.filterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.historyCurrentMonthBtn);
        });
        elements.historyLastMonthBtn.addEventListener('click', () => {
            const dates = getLastMonthDates();
            elements.filterStartDate.value = dates.start;
            elements.filterEndDate.value = dates.end;
            elements.filterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.historyLastMonthBtn);
        });
        elements.historyLast3MonthsBtn.addEventListener('click', () => {
            const dates = getLast3MonthsDates();
            elements.filterStartDate.value = dates.start;
            elements.filterEndDate.value = dates.end;
            elements.filterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.historyLast3MonthsBtn);
        });
        elements.historyAllBtn.addEventListener('click', () => {
            elements.filterStartDate.value = '';
            elements.filterEndDate.value = '';
            elements.filterCategory.value = '';
            updateAllUI(state.allTransactions);
            activateQuickFilterButton(elements.historyAllBtn);
        });

        // Filter form listeners
        elements.filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            resetQuickFilterButtons();
            updateAllUI(state.allTransactions);
        });
        elements.clearFilterBtn.addEventListener('click', () => {
            elements.filterForm.reset();
            resetQuickFilterButtons();
            updateAllUI(state.allTransactions);
        });

        elements.incomeFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateAllUI(state.allTransactions);
        });
        elements.incomeClearFilterBtn.addEventListener('click', () => {
            elements.incomeFilterForm.reset();
            updateAllUI(state.allTransactions);
        });

        elements.pendingFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            resetQuickFilterButtons();
            updateAllUI(state.allTransactions);
        });
        elements.pendingClearFilterBtn.addEventListener('click', () => {
            elements.pendingFilterForm.reset();
            resetQuickFilterButtons();
            updateAllUI(state.allTransactions);
        });

        // Report filter
        elements.reportFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            state.currentReportMonth = parseInt(elements.reportMonthSelect.value, 10);
            state.currentReportYear = parseInt(elements.reportYearInput.value, 10);
            updateAllUI(state.allTransactions);
        });

        // Import listeners
        elements.importCsvBtn.addEventListener('click', () => elements.csvFileInput.click());
        elements.csvFileInput.addEventListener('change', handleFileSelect);
        elements.closeImportModalBtn.addEventListener('click', () => hideElement(elements.importModal));
        elements.cancelImportBtn.addEventListener('click', () => hideElement(elements.importModal));
        elements.confirmImportBtn.addEventListener('click', processImport);

        // Theme toggle
        elements.themeToggleBtn.addEventListener('click', toggleTheme);

        // Load partner names from localStorage
        state.partnerNames.partner1 = localStorage.getItem('partner1Name') || 'Parceiro 1';
        state.partnerNames.partner2 = localStorage.getItem('partner2Name') || 'Parceiro 2';
        updatePaidByDropdown(elements.paidBySelect, state.partnerNames);
        updatePaidByDropdown(elements.importPaidBySelect, state.partnerNames);
        updateSettingsModalInputs(state.partnerNames);

        // Initialize Firebase and authenticate
        await initializeAndAuth();

        // Check family ID
        checkFamilyId();

    } catch (error) {
        console.error("Erro crítico na inicialização:", error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        const loadingText = loadingIndicator?.querySelector('p');
        const spinner = loadingIndicator?.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
        if (loadingText) {
            loadingText.innerHTML = `
                <strong class="text-red-600 dark:text-red-400">Erro Crítico na Inicialização</strong>
                <p class="text-sm mt-2 dark:text-gray-400">${error.message}</p>
                <p class="text-xs mt-4 dark:text-gray-500">Verifique o console para mais detalhes.</p>
            `;
        }
    }
};
