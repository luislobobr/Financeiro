/**
 * App Module (Main Entry Point)
 * Orchestrates the application initialization and logic
 */

// console.log("DEBUG: app.js module evaluating...");
import { initializeAndAuth, setFamilyId, getFamilyDocRef, getDoc, setDoc, onSnapshot } from './firebase.js';
import {
    initializeElements,
    getElements,
    initializeTheme,
    switchPage,
    showElement,
    hideElement,
    showToast,
    openTransactionModal,
    closeTransactionModal,
    updatePaidByDropdown,
    updateSettingsModalInputs,
    resetQuickFilterButtons,
    activateQuickFilterButton,
    togglePaymentDateVisibility,
    toggleExpenseTypeVisibility,
    openCategoriesModal,
    closeCategoriesModal,
    openPaymentMethodsModal,
    closePaymentMethodsModal,
    openConfirmPaymentModal,
    closeConfirmPaymentModal,
    populateMonthFilters,
    toggleMobileSidebar,
    closeMobileSidebar,
    openCreditCardsModal,
    closeCreditCardsModal,
    toggleCreditCardVisibility,
    updateCardInvoicePreview
} from './ui.js';
import {
    formatCurrency,
    formatDate,
    today,
    getCurrentMonthDates,
    getNextMonthDates,
    getLastMonthDates,
    getLast3MonthsDates,
    copyToClipboard,
    setToastElement
} from './utils.js';
import { setupTransactionListener, handleTransactionSubmit, handleDeleteTransaction, handleMarkAsPaid } from './transactions.js';
import { setupCategoriesListener, handleAddCategory } from './categories.js';
import { setupBudgetListener, initBudgetForm, renderBudgetProgress } from './budget.js';
import { renderBIReport, populateBIMonthSelect } from './charts.js';
import { renderDREReport, renderAllReports, populateReportFilters } from './reports.js';
import { handleFileSelect, processImport } from './import.js';
import { setupPaymentMethodsListener, handleAddPaymentMethod, updatePaymentMethodDropdowns } from './paymentMethods.js';
import { setupCreditCardsListener, handleAddCreditCard, handleDeleteCreditCard, updateCreditCardDropdown } from './creditCards.js';
import { renderCreditCardsPage } from './creditCardInvoices.js';
import { state } from './state.js'; // Import state from dedicated module
import { renderAiConsultant } from './aiConsultant.js';

/**
 * Handle payment confirmation from modal
 */
async function handleConfirmPayment() {
    const elements = getElements();
    const transactionId = elements.confirmPaymentTransactionId.value;
    const paymentMethod = elements.confirmPaymentMethodSelect.value;

    if (!paymentMethod) {
        showToast("Selecione uma forma de pagamento.", true);
        return;
    }

    await handleMarkAsPaid(transactionId, paymentMethod);

    // Import and close modal
    const { closeConfirmPaymentModal } = await import('./ui.js');
    closeConfirmPaymentModal();
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
        if (elements.createFamilyBtn) elements.createFamilyBtn.disabled = false;
        if (elements.joinFamilyBtn) elements.joinFamilyBtn.disabled = false;
        if (elements.familyIdInput) elements.familyIdInput.value = '';

        showToast("Desconectado da família com sucesso!");
    }
}

// Application Logic
const logic = {
    /**
     * Update all UI components based on new transactions
     */
    updateAllUI: function (transactions = state.allTransactions) {
        // ... implementation same as before ...
        // Need to ensure transactions are passed or use state.allTransactions
        const data = transactions || state.allTransactions;

        const elements = getElements();
        // ... rest of logic ...
        // Since I'm replacing the file content, I must include the logic here or keep it.
        // Let's implement the event listener setup at the end.

        // Filters
        const firstDayOfMonth = new Date(today.split('-')[0], today.split('-')[1] - 1, 1);

        // Current Month Transactions (for Dashboard)
        const monthTransactions = data.filter(t => {
            const dateToCompare = t.paymentDate || t.dueDate;
            try {
                const transactionDate = new Date(dateToCompare + 'T00:00:00');
                return transactionDate >= firstDayOfMonth;
            } catch (e) {
                console.warn("Data inválida encontrada:", t);
                return false;
            }
        });
        const overdueTransactions = data.filter(t =>
            t.status === 'A Pagar' &&
            t.dueDate < today &&
            t.paymentMethod !== 'credito'
        );
        const totalOverdue = overdueTransactions.reduce((sum, t) => sum + t.amount, 0);

        // 1. Dashboard
        logic.renderDashboard(data);
        renderBudgetProgress(monthTransactions);
        logic.renderOverdueList(overdueTransactions, totalOverdue);

        // 2. Pending List (Exclude credit card items)
        logic.renderPendingList(data.filter(t => t.paymentMethod !== 'credito'));

        // 3. History List
        logic.renderHistoryList(data);

        // 4. Income List
        logic.renderIncomeList(data);

        // 5. Reports & Charts
        renderAllReports(data);
        renderBIReport(data);

        // 6. Credit Cards Page
        if (elements.pageCreditCards && !elements.pageCreditCards.classList.contains('hidden')) {
            renderCreditCardsPage();
        }

        // 7. AI Consultant
        renderAiConsultant();
        renderAiConsultant(data);
    },

    /**
     * Render Dashboard cards
     */
    renderDashboard: function (allTransactions) {
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
            // Balance (Paid transactions only)
            if (t.type === 'Receita' && t.status === 'Pago' && (t.paymentDate || t.dueDate) >= firstDay && (t.paymentDate || t.dueDate) <= lastDay) {
                totalIncome += t.amount;
            } else if (t.type === 'Despesa' && t.status === 'Pago' && (t.paymentDate || t.dueDate) >= firstDay && (t.paymentDate || t.dueDate) <= lastDay) {
                totalExpense += t.amount;
            }

            // Pending (Current month)
            if (t.type === 'Despesa' && t.status === 'A Pagar' && t.dueDate >= firstDay && t.dueDate <= lastDay) {
                totalPendingCurrentMonth += t.amount;
            }
        });

        const totalBalance = totalIncome - totalExpense;

        if (elements.totalBalanceEl) {
            elements.totalBalanceEl.textContent = formatCurrency(totalBalance);
            elements.totalBalanceEl.classList.toggle('text-red-600', totalBalance < 0);
            elements.totalBalanceEl.classList.toggle('dark:text-gray-100', totalBalance >= 0);
            elements.totalBalanceEl.classList.toggle('text-gray-900', totalBalance >= 0);
        }

        if (elements.totalIncomeEl) elements.totalIncomeEl.textContent = formatCurrency(totalIncome);
        if (elements.totalExpenseEl) elements.totalExpenseEl.textContent = formatCurrency(totalExpense);
        if (elements.totalPendingCurrentMonthEl) elements.totalPendingCurrentMonthEl.textContent = formatCurrency(totalPendingCurrentMonth);
    },

    /**
     * Render Overdue List
     */
    renderOverdueList: function (overdueTransactions, totalOverdue) {
        // Import rendering function deeply to avoid cyclic init issues if possible, 
        // or rely on transactions module export.
        import('./transactions.js').then(module => {
            const elements = getElements();
            overdueTransactions.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            module.renderGenericTransactionList(elements.overdueList, overdueTransactions, elements.emptyStateOverdue);

            if (totalOverdue > 0) {
                elements.totalOverdueAmountEl.textContent = `Total Atrasado: ${formatCurrency(totalOverdue)}`;
                showElement(elements.totalOverdueAmountEl);
            } else {
                hideElement(elements.totalOverdueAmountEl);
            }
        });
    },

    /**
     * Render Pending List (Contas a Pagar)
     */
    renderPendingList: function (allTransactions) {
        import('./transactions.js').then(module => {
            const elements = getElements();
            const startDate = elements.pendingFilterStartDate.value;
            const endDate = elements.pendingFilterEndDate.value;
            const selectedMonth = elements.pendingFilterMonth.value;
            const category = elements.pendingFilterCategory.value;

            let pendingTransactions = allTransactions.filter(t => t.status === 'A Pagar');

            // Filter by custom date range (if provided)
            if (startDate) {
                pendingTransactions = pendingTransactions.filter(t => t.dueDate >= startDate);
            }
            if (endDate) {
                pendingTransactions = pendingTransactions.filter(t => t.dueDate <= endDate);
            }

            // Filter by selected month (if provided and no custom date range)
            if (selectedMonth && !startDate && !endDate) {
                const currentYear = new Date().getFullYear();
                const monthNum = parseInt(selectedMonth);
                pendingTransactions = pendingTransactions.filter(t => {
                    const dueDate = new Date(t.dueDate);
                    return dueDate.getMonth() + 1 === monthNum && dueDate.getFullYear() === currentYear;
                });
            }

            // Filter by category
            if (category) {
                pendingTransactions = pendingTransactions.filter(t => t.category === category);
            }

            const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
            const totalFixed = pendingTransactions
                .filter(t => t.expenseType === 'Fixa')
                .reduce((sum, t) => sum + t.amount, 0);
            const itemsCount = pendingTransactions.length;

            pendingTransactions.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            // Pass true to show checkboxes for pending list
            module.renderGenericTransactionList(elements.pendingList, pendingTransactions, elements.emptyStatePending, true);

            elements.pendingTotalAmountEl.textContent = formatCurrency(totalPending);
            elements.pendingTotalFixedAmountEl.textContent = formatCurrency(totalFixed);
            elements.pendingItemsCountEl.textContent = itemsCount.toString();

            // Update selected total
            logic.updateSelectedTotal();

            // Add checkbox event listeners
            elements.pendingList.querySelectorAll('.pending-item-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const id = e.target.dataset.id;
                    if (e.target.checked) {
                        if (!state.selectedPendingItems.includes(id)) {
                            state.selectedPendingItems.push(id);
                        }
                    } else {
                        state.selectedPendingItems = state.selectedPendingItems.filter(i => i !== id);
                    }
                    logic.updateSelectedTotal();
                });
            });
        });
    },

    /**
     * Update selected items total
     */
    updateSelectedTotal: function () {
        const elements = getElements();
        const selectedTransactions = state.allTransactions.filter(t =>
            state.selectedPendingItems.includes(t.id) && t.status === 'A Pagar'
        );
        const total = selectedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const count = selectedTransactions.length;

        if (elements.pendingSelectedAmount) {
            elements.pendingSelectedAmount.textContent = formatCurrency(total);
        }
        if (elements.pendingSelectedCount) {
            elements.pendingSelectedCount.textContent = count.toString();
        }
    },

    /**
     * Render History List (Contas Pagas)
     */
    renderHistoryList: function (allTransactions) {
        import('./transactions.js').then(module => {
            const elements = getElements();
            const startDate = elements.filterStartDate.value;
            const endDate = elements.filterEndDate.value;
            const selectedMonth = elements.historyFilterMonth.value;
            const category = elements.filterCategory.value;

            let filteredTransactions = allTransactions.filter(t => t.status === 'Pago' && t.type === 'Despesa');

            // Filter by custom date range (if provided)
            if (startDate) {
                filteredTransactions = filteredTransactions.filter(t => (t.paymentDate || t.dueDate) >= startDate);
            }
            if (endDate) {
                filteredTransactions = filteredTransactions.filter(t => (t.paymentDate || t.dueDate) <= endDate);
            }

            // Filter by selected month (if provided and no custom date range)
            if (selectedMonth && !startDate && !endDate) {
                const currentYear = new Date().getFullYear();
                const monthNum = parseInt(selectedMonth);
                filteredTransactions = filteredTransactions.filter(t => {
                    const payDate = new Date(t.paymentDate || t.dueDate);
                    return payDate.getMonth() + 1 === monthNum && payDate.getFullYear() === currentYear;
                });
            }

            // Filter by category
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

            module.renderGenericTransactionList(elements.transactionList, filteredTransactions, elements.emptyState);
        });
    },

    /**
     * Render Income List (Entradas)
     */
    renderIncomeList: function (allTransactions) {
        import('./transactions.js').then(module => {
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

            module.renderGenericTransactionList(elements.incomeList, filteredTransactions, elements.emptyStateIncome);
        });
    },

    /**
     * Start the application with the family ID
     */
    handleStartApp: async function () {
        const elements = getElements();
        const familyId = elements.familyIdInput.value.trim();
        if (!familyId) {
            alert('Por favor, insira o ID da família.');
            return;
        }

        try {
            setFamilyId(familyId);

            // Now check existence
            const docRefToCheck = getFamilyDocRef();
            const docSnap = await getDoc(docRefToCheck);

            if (docSnap.exists()) {
                localStorage.setItem('familyAppId', familyId);
                logic.initApp();
            } else {
                alert('ID da família não encontrado!');
            }
        } catch (error) {
            console.error("Erro ao entrar na família:", error);
            alert("Erro ao conectar. Tente novamente.");
        }
    },

    /**
     * Create a new family
     */
    handleCreateFamily: async function () {
        const newFamilyId = crypto.randomUUID();
        const elements = getElements();

        elements.familyIdDisplay.textContent = newFamilyId;
        showElement(elements.newFamilyIdSection);

        // Save to Firestore
        try {
            setFamilyId(newFamilyId);
            const docRef = getFamilyDocRef();
            await setDoc(docRef, {
                createdAt: new Date().toISOString(),
                settings: { partner1: 'Parceiro 1', partner2: 'Parceiro 2' }
            });

            localStorage.setItem('familyAppId', newFamilyId);

            elements.familyIdInput.value = newFamilyId;

        } catch (e) {
            console.error("Erro ao criar família no Firebase:", e);
            alert("Erro ao criar família. Tente novamente.");
        }
    },

    /**
     * Join existing family
     */
    handleJoinFamily: function () {
        const elements = getElements();
        const id = elements.familyIdInput.value.trim();
        if (id) {
            logic.handleStartApp();
        } else {
            showToast("Por favor, cole o ID da família no campo acima.", true);
        }
    },

    /**
     * Handle Settings Save
     */
    handleSaveSettings: async function (e) {
        e.preventDefault();
        const elements = getElements();

        const p1 = elements.partner1NameInput.value.trim() || 'Parceiro 1';
        const p2 = elements.partner2NameInput.value.trim() || 'Parceiro 2';

        state.partnerNames.partner1 = p1;
        state.partnerNames.partner2 = p2;

        localStorage.setItem('partner1Name', p1);
        localStorage.setItem('partner2Name', p2);

        try {
            const docRef = getFamilyDocRef();
            await setDoc(docRef, { settings: state.partnerNames }, { merge: true });

            updatePaidByDropdown(elements.paidBySelect, state.partnerNames);
            updatePaidByDropdown(elements.importPaidBySelect, state.partnerNames);

            hideElement(elements.settingsModal);
            showToast("Configurações salvas!");
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            showToast("Erro ao salvar no servidor.", true);
        }
    },

    /**
     * Initialize Application after Auth and Family Check
     */
    initApp: function () {
        const elements = getElements();
        hideElement(elements.familyModal);

        // Show loading
        showElement(elements.loadingIndicator);

        // Setup Real-time Listeners
        setupTransactionListener();
        setupBudgetListener();
        setupCategoriesListener();
        setupPaymentMethodsListener();
        setupCreditCardsListener(); // Initialize Credit Cards Listener

        // Load settings from firestore
        getDoc(getFamilyDocRef()).then(docSnap => {
            console.log("DEBUG: Firestore docSnap exists?", docSnap.exists());
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Support both old 'names' field and new 'settings' field
                const settings = data.settings || data.names;

                if (settings && settings.partner1 && settings.partner2) {
                    console.log("DEBUG: Settings loaded from Firestore:", settings);
                    state.partnerNames.partner1 = settings.partner1;
                    state.partnerNames.partner2 = settings.partner2;
                    localStorage.setItem('partner1Name', settings.partner1);
                    localStorage.setItem('partner2Name', settings.partner2);
                    updatePaidByDropdown(elements.paidBySelect, state.partnerNames);
                    updatePaidByDropdown(elements.importPaidBySelect, state.partnerNames);
                    updateSettingsModalInputs(state.partnerNames);
                    console.log("DEBUG: state.partnerNames after load:", state.partnerNames);
                } else {
                    console.log("DEBUG: No partner names found in Firestore data:", data);
                }
            } else {
                console.log("DEBUG: Family document does not exist");
            }
        }).catch(error => {
            console.error("DEBUG: Error loading settings:", error);
        });


        // Initialize elements and state
        elements.currentFamilyIdEl.textContent = `ID: ${localStorage.getItem('familyAppId')}`;

        initBudgetForm();
        populateReportFilters();
        populateMonthFilters();
        populateBIMonthSelect();


        switchPage('page-dashboard');
    },

    /**
     * Check if family ID is stored
     */
    checkFamilyId: async function () {
        const elements = getElements();
        const storedFamilyId = localStorage.getItem('familyAppId');

        if (storedFamilyId) {
            setFamilyId(storedFamilyId);
            // Verify existence
            try {
                const docRef = getFamilyDocRef();
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    logic.initApp();
                } else {
                    localStorage.removeItem('familyAppId');
                    showElement(elements.familyModal);
                    hideElement(elements.loadingIndicator);
                }
            } catch (error) {
                console.error("Erro ao verificar família:", error);
                // On error (offline?), maybe show modal
                showElement(elements.familyModal);
                hideElement(elements.loadingIndicator);
            }
        } else {
            showElement(elements.familyModal);
            hideElement(elements.loadingIndicator);
        }
    }
};

// Listen for custom event to update UI
document.addEventListener('app-update-ui', (e) => {
    // If details passed, use them? Or just use global state
    logic.updateAllUI(state.allTransactions);
});

// Provide a global window function for legacy compatibility or debug
window.updateAllUI = () => logic.updateAllUI(state.allTransactions);

// Event Bus dispatch helper (not exported, just for this module context if needed)
const dispatchUpdate = () => document.dispatchEvent(new CustomEvent('app-update-ui'));

// Main Initialization
const startInitialization = async () => {
    // Debug bar removed
    console.log("Starting initialization...");
    try {
        const elements = initializeElements();
        setToastElement(elements.toastNotification);

        initializeTheme();

        // --- Event Listeners ---
        // (Listeners setup logic remaining same as verified in previous debug steps)

        // Navigation
        if (elements.navBtnDashboard) elements.navBtnDashboard.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-dashboard'); });
        if (elements.navBtnPending) elements.navBtnPending.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-pending'); });
        if (elements.navBtnHistory) elements.navBtnHistory.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-history'); });
        if (elements.navBtnIncome) elements.navBtnIncome.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-income'); });
        if (elements.navBtnPlanning) elements.navBtnPlanning.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-planning'); });
        if (elements.navBtnCreditCards) elements.navBtnCreditCards.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-credit-cards'); renderCreditCardsPage(); });
        if (elements.navBtnReports) elements.navBtnReports.addEventListener('click', (e) => { e.preventDefault(); closeMobileSidebar(); switchPage('page-reports'); renderAllReports(state.allTransactions); });
        if (elements.navBtnBi) elements.navBtnBi.addEventListener('click', (e) => { e.preventDefault(); closeMobileSidebar(); switchPage('page-bi'); renderBIReport(state.allTransactions); });
        if (elements.navBtnAiConsultant) elements.navBtnAiConsultant.addEventListener('click', (e) => { e.preventDefault(); closeMobileSidebar(); switchPage('page-ai-consultant'); });
        if (elements.goToAiConsultantBtn) elements.goToAiConsultantBtn.addEventListener('click', (e) => { e.preventDefault(); switchPage('page-ai-consultant'); });

        // Mobile menu controls
        if (elements.mobileMenuBtn) elements.mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
        if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);

        // Close mobile sidebar when navigating
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    closeMobileSidebar();
                }
            });
        });

        // Transaction Form
        if (elements.statusSelect) elements.statusSelect.addEventListener('change', togglePaymentDateVisibility);
        if (elements.paymentMethodSelect) elements.paymentMethodSelect.addEventListener('change', toggleCreditCardVisibility);

        // Credit Card Interaction
        if (elements.cardSelect) elements.cardSelect.addEventListener('change', () => updateCardInvoicePreview(state.creditCards));
        if (elements.dueDateInput) elements.dueDateInput.addEventListener('change', () => updateCardInvoicePreview(state.creditCards));

        // Credit Card Month Filter
        if (elements.creditCardMonthFilter) {
            elements.creditCardMonthFilter.addEventListener('change', () => {
                const selectedMonth = elements.creditCardMonthFilter.value;
                renderCreditCardsPage(selectedMonth);
            });
        }

        if (elements.transactionForm) {
            elements.transactionForm.querySelectorAll('input[name="type"]').forEach(radio =>
                radio.addEventListener('change', () => {
                    toggleExpenseTypeVisibility();
                })
            );
            elements.transactionForm.addEventListener('submit', handleTransactionSubmit);
        }
        if (elements.addTransactionBtn) elements.addTransactionBtn.addEventListener('click', () => {
            updateCreditCardDropdown();
            openTransactionModal(false);
        });
        if (elements.closeTransactionModalBtn) elements.closeTransactionModalBtn.addEventListener('click', closeTransactionModal);

        // Family Management
        if (elements.createFamilyBtn) elements.createFamilyBtn.addEventListener('click', logic.handleCreateFamily);
        if (elements.joinFamilyBtn) elements.joinFamilyBtn.addEventListener('click', logic.handleJoinFamily);
        if (elements.copyFamilyIdBtn) elements.copyFamilyIdBtn.addEventListener('click', () => copyToClipboard(elements.familyIdDisplay.textContent, elements.copyFamilyIdBtn));
        if (elements.startAppBtn) elements.startAppBtn.addEventListener('click', logic.handleStartApp);
        if (elements.copyIdBtn) elements.copyIdBtn.addEventListener('click', () => {
            const currentId = localStorage.getItem('familyAppId');
            if (currentId) copyToClipboard(currentId, elements.copyIdBtn);
        });

        // Settings
        if (elements.openSettingsBtn) elements.openSettingsBtn.addEventListener('click', () => {
            updateSettingsModalInputs(state.partnerNames);
            showElement(elements.settingsModal);
        });
        if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', () => hideElement(elements.settingsModal));
        if (elements.settingsForm) elements.settingsForm.addEventListener('submit', logic.handleSaveSettings);
        if (elements.themeToggleBtn) elements.themeToggleBtn.addEventListener('click', () => {
            import('./ui.js').then(ui => ui.toggleTheme());
        });

        // Categories
        if (elements.openCategoriesBtn) elements.openCategoriesBtn.addEventListener('click', openCategoriesModal);
        if (elements.closeCategoriesModalBtn) elements.closeCategoriesModalBtn.addEventListener('click', closeCategoriesModal);
        if (elements.addCategoryForm) elements.addCategoryForm.addEventListener('submit', handleAddCategory);

        // Credit Cards (removed)

        // Payment Methods
        if (elements.openPaymentMethodsBtn) elements.openPaymentMethodsBtn.addEventListener('click', openPaymentMethodsModal);
        if (elements.closePaymentMethodsModalBtn) elements.closePaymentMethodsModalBtn.addEventListener('click', closePaymentMethodsModal);

        // Credit Cards Modal Listeners
        if (elements.openCreditCardsBtn) elements.openCreditCardsBtn.addEventListener('click', openCreditCardsModal);
        if (elements.closeCreditCardsModalBtn) elements.closeCreditCardsModalBtn.addEventListener('click', closeCreditCardsModal);
        if (elements.addCreditCardForm) elements.addCreditCardForm.addEventListener('submit', handleAddCreditCard);

        if (elements.cancelPaymentBtn) elements.cancelPaymentBtn.addEventListener('click', closeConfirmPaymentModal);
        if (elements.confirmPaymentBtn) elements.confirmPaymentBtn.addEventListener('click', handleConfirmPayment);
        if (elements.disconnectFamilyBtn) elements.disconnectFamilyBtn.addEventListener('click', handleDisconnectFamily);

        // Filters - Pending
        if (elements.pendingCurrentMonthBtn) {
            elements.pendingCurrentMonthBtn.addEventListener('click', () => {
                const m = getCurrentMonthDates();
                elements.pendingFilterStartDate.value = m.start;
                elements.pendingFilterEndDate.value = m.end;
                activateQuickFilterButton(elements.pendingCurrentMonthBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.pendingNextMonthBtn) {
            elements.pendingNextMonthBtn.addEventListener('click', () => {
                const m = getNextMonthDates();
                elements.pendingFilterStartDate.value = m.start;
                elements.pendingFilterEndDate.value = m.end;
                activateQuickFilterButton(elements.pendingNextMonthBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.pendingAllBtn) {
            elements.pendingAllBtn.addEventListener('click', () => {
                elements.pendingFilterForm.reset();
                activateQuickFilterButton(elements.pendingAllBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.pendingNext3MonthsBtn) {
            elements.pendingNext3MonthsBtn.addEventListener('click', () => {
                const today = new Date();
                const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
                elements.pendingFilterStartDate.value = today.toISOString().split('T')[0];
                elements.pendingFilterEndDate.value = threeMonthsLater.toISOString().split('T')[0];
                activateQuickFilterButton(elements.pendingNext3MonthsBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }

        if (elements.pendingFilterForm) {
            elements.pendingFilterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                resetQuickFilterButtons();
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.pendingClearFilterBtn) {
            elements.pendingClearFilterBtn.addEventListener('click', () => {
                elements.pendingFilterForm.reset();
                resetQuickFilterButtons();
                logic.updateAllUI(state.allTransactions);
            });
        }

        // Month and Category filter change listeners for Pending
        if (elements.pendingFilterMonth) {
            elements.pendingFilterMonth.addEventListener('change', () => {
                resetQuickFilterButtons();
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.pendingFilterCategory) {
            elements.pendingFilterCategory.addEventListener('change', () => {
                logic.updateAllUI(state.allTransactions);
            });
        }

        // Month and Category filter change listeners for History
        if (elements.historyFilterMonth) {
            elements.historyFilterMonth.addEventListener('change', () => {
                resetQuickFilterButtons();
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.filterCategory) {
            elements.filterCategory.addEventListener('change', () => {
                logic.updateAllUI(state.allTransactions);
            });
        }


        // Select All Pending Checkbox
        if (elements.selectAllPendingCheckbox) {
            elements.selectAllPendingCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.pending-item-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const id = cb.dataset.id;
                    if (e.target.checked) {
                        if (!state.selectedPendingItems.includes(id)) {
                            state.selectedPendingItems.push(id);
                        }
                    } else {
                        state.selectedPendingItems = state.selectedPendingItems.filter(i => i !== id);
                    }
                });
                logic.updateSelectedTotal();
            });
        }

        // Filters - History
        if (elements.historyCurrentMonthBtn) {
            elements.historyCurrentMonthBtn.addEventListener('click', () => {
                const m = getCurrentMonthDates();
                elements.filterStartDate.value = m.start;
                elements.filterEndDate.value = m.end;
                activateQuickFilterButton(elements.historyCurrentMonthBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.historyLastMonthBtn) {
            elements.historyLastMonthBtn.addEventListener('click', () => {
                const m = getLastMonthDates();
                elements.filterStartDate.value = m.start;
                elements.filterEndDate.value = m.end;
                activateQuickFilterButton(elements.historyLastMonthBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.historyLast3MonthsBtn) {
            elements.historyLast3MonthsBtn.addEventListener('click', () => {
                const m = getLast3MonthsDates();
                elements.filterStartDate.value = m.start;
                elements.filterEndDate.value = m.end;
                activateQuickFilterButton(elements.historyLast3MonthsBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.historyAllBtn) {
            elements.historyAllBtn.addEventListener('click', () => {
                elements.filterForm.reset();
                activateQuickFilterButton(elements.historyAllBtn);
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.filterForm) {
            elements.filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                resetQuickFilterButtons();
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.clearFilterBtn) {
            elements.clearFilterBtn.addEventListener('click', () => {
                elements.filterForm.reset();
                resetQuickFilterButtons();
                logic.updateAllUI(state.allTransactions);
            });
        }

        // Filters - Income
        if (elements.incomeFilterForm) {
            elements.incomeFilterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                logic.updateAllUI(state.allTransactions);
            });
        }
        if (elements.incomeClearFilterBtn) {
            elements.incomeClearFilterBtn.addEventListener('click', () => {
                elements.incomeFilterForm.reset();
                logic.updateAllUI(state.allTransactions);
            });
        }

        // Reports - Auto update on filter change
        if (elements.reportMonthSelect) {
            elements.reportMonthSelect.addEventListener('change', () => {
                state.currentReportMonth = parseInt(elements.reportMonthSelect.value, 10);
                renderAllReports(state.allTransactions);
            });
        }
        if (elements.reportYearInput) {
            elements.reportYearInput.addEventListener('change', () => {
                state.currentReportYear = parseInt(elements.reportYearInput.value, 10);
                renderAllReports(state.allTransactions);
            });
        }

        // Import
        if (elements.importCsvBtn) elements.importCsvBtn.addEventListener('click', () => elements.csvFileInput.click());
        if (elements.csvFileInput) elements.csvFileInput.addEventListener('change', handleFileSelect);
        if (elements.closeImportModalBtn) elements.closeImportModalBtn.addEventListener('click', () => hideElement(elements.importModal));
        if (elements.cancelImportBtn) elements.cancelImportBtn.addEventListener('click', () => hideElement(elements.importModal));
        if (elements.confirmImportBtn) elements.confirmImportBtn.addEventListener('click', processImport);

        // Load optimistic names
        state.partnerNames.partner1 = localStorage.getItem('partner1Name') || 'Parceiro 1';
        state.partnerNames.partner2 = localStorage.getItem('partner2Name') || 'Parceiro 2';
        updatePaidByDropdown(elements.paidBySelect, state.partnerNames);
        updatePaidByDropdown(elements.importPaidBySelect, state.partnerNames);
        updateSettingsModalInputs(state.partnerNames);

        // --- AUTH & START ---
        console.log("Initializing Firebase...");
        await initializeAndAuth();
        console.log("Firebase initialized. Checking family ID...");
        await logic.checkFamilyId();
        console.log("App initialization complete.");

    } catch (error) {
        console.error("Erro crítico na inicialização:", error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div class="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <h2 class="text-2xl font-bold text-red-600 mb-4">Erro na Inicialização</h2>
                    <p class="text-gray-700 dark:text-gray-300 mb-4">${error.message}</p>
                    <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Recarregar Página</button>
                </div>
             `;
        }
    }
};

console.log("App module loaded. Document ready state:", document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInitialization);
} else {
    startInitialization();
}

// Expose state for debugging (removed)

