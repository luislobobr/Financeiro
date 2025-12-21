/**
 * Goals Module
 * Manages financial goals and savings targets (gamification)
 */

import { getDb, getFamilyId, addDoc, getDocs, updateDoc, deleteDoc, doc, collection, query, where, onSnapshot } from './firebase.js';
import { state } from './state.js';
import { formatCurrency, showToast, showElement, hideElement } from './utils.js';
import { getElements } from './ui.js';


/**
 * Get reference to goals collection
 */
function getGoalsCollectionRef() {
    const db = getDb();
    const familyId = getFamilyId() || state.familyId || 'default';
    return collection(db, 'families', familyId, 'goals');
}


/**
 * Setup listener for goals changes
 */
export function setupGoalsListener() {
    const goalsRef = getGoalsCollectionRef();

    return onSnapshot(goalsRef, (snapshot) => {
        state.goals = [];
        snapshot.forEach((doc) => {
            state.goals.push({ id: doc.id, ...doc.data() });
        });

        // Re-render if on goals page
        const goalsPage = document.getElementById('page-goals');
        if (goalsPage && !goalsPage.classList.contains('hidden')) {
            renderGoalsPage();
        }

        // Update dashboard card
        updateGoalsDashboardCard();
    });
}

/**
 * Get all active goals
 */
export function getActiveGoals() {
    return (state.goals || []).filter(g => g.status === 'active');
}

/**
 * Create a new goal
 */
export async function createGoal(goalData) {
    try {
        const newGoal = {
            name: goalData.name,
            targetAmount: parseFloat(goalData.targetAmount),
            currentAmount: parseFloat(goalData.currentAmount) || 0,
            deadline: goalData.deadline || null,
            icon: goalData.icon || '🎯',
            category: goalData.category || 'Outro',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await addDoc(getGoalsCollectionRef(), newGoal);
        showToast('Meta criada com sucesso!');
        return true;
    } catch (error) {
        console.error('Error creating goal:', error);
        showToast('Erro ao criar meta.', true);
        return false;
    }
}

/**
 * Update goal
 */
export async function updateGoal(goalId, updates) {
    try {
        const goalRef = doc(getGoalsCollectionRef(), goalId);
        await updateDoc(goalRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        showToast('Meta atualizada!');
        return true;
    } catch (error) {
        console.error('Error updating goal:', error);
        showToast('Erro ao atualizar meta.', true);
        return false;
    }
}

/**
 * Delete goal
 */
export async function deleteGoal(goalId) {
    if (!confirm('Tem certeza que deseja deletar esta meta?')) {
        return false;
    }

    try {
        const goalRef = doc(getGoalsCollectionRef(), goalId);
        await deleteDoc(goalRef);
        showToast('Meta deletada!');
        return true;
    } catch (error) {
        console.error('Error deleting goal:', error);
        showToast('Erro ao deletar meta.', true);
        return false;
    }
}

/**
 * Add contribution to goal
 */
export async function addContribution(goalId, amount) {
    try {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) {
            showToast('Meta não encontrada.', true);
            return false;
        }

        const newAmount = goal.currentAmount + parseFloat(amount);
        const newStatus = newAmount >= goal.targetAmount ? 'completed' : 'active';

        await updateGoal(goalId, {
            currentAmount: newAmount,
            status: newStatus
        });

        if (newStatus === 'completed') {
            showToast('🎉 Parabéns! Meta concluída!');
        } else {
            showToast(`Contribuição adicionada! ${formatCurrency(amount)}`);
        }

        return true;
    } catch (error) {
        console.error('Error adding contribution:', error);
        showToast('Erro ao adicionar contribuição.', true);
        return false;
    }
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(goal) {
    if (!goal || goal.targetAmount === 0) return 0;
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    return Math.min(100, Math.round(progress));
}

/**
 * Get progress color based on percentage
 */
function getProgressColor(progress) {
    if (progress >= 100) return 'bg-green-600';
    if (progress >= 76) return 'bg-green-400';
    if (progress >= 51) return 'bg-blue-500';
    if (progress >= 26) return 'bg-amber-500';
    return 'bg-red-500';
}

/**
 * Get text color based on progress
 */
function getProgressTextColor(progress) {
    if (progress >= 100) return 'text-green-600 dark:text-green-500';
    if (progress >= 76) return 'text-green-500 dark:text-green-400';
    if (progress >= 51) return 'text-blue-500 dark:text-blue-400';
    if (progress >= 26) return 'text-amber-500 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
}

/**
 * Calculate days remaining until deadline
 */
function getDaysRemaining(deadline) {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Render goals page
 */
export function renderGoalsPage() {
    const container = document.getElementById('goalsPageContent');
    if (!container) return;

    const activeGoals = getActiveGoals();
    const completedGoals = (state.goals || []).filter(g => g.status === 'completed');
    const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);

    container.innerHTML = `
        <!-- Stats Cards -->
        <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-blue-100 text-sm font-medium">Metas Ativas</p>
                        <p class="text-3xl font-bold mt-1">${activeGoals.length}</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-green-100 text-sm font-medium">Total Economizado</p>
                        <p class="text-3xl font-bold mt-1">${formatCurrency(totalSaved)}</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-purple-100 text-sm font-medium">Metas Concluídas</p>
                        <p class="text-3xl font-bold mt-1">${completedGoals.length}</p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Goals Grid -->
        <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Suas Metas</h3>
                <button id="addGoalBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nova Meta
                </button>
            </div>

            ${activeGoals.length === 0 ? `
                <div class="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">Nenhuma meta criada ainda</p>
                    <p class="text-gray-400 dark:text-gray-500 text-sm mt-2">Comece definindo seus objetivos financeiros!</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${activeGoals.map(goal => renderGoalCard(goal)).join('')}
                </div>
            `}
        </div>

        <!-- Completed Goals -->
        ${completedGoals.length > 0 ? `
            <div class="mt-8">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">✅ Metas Concluídas</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${completedGoals.map(goal => renderGoalCard(goal)).join('')}
                </div>
            </div>
        ` : ''}
    `;

    setupGoalsPageListeners();
}

/**
 * Render individual goal card
 */
function renderGoalCard(goal) {
    const progress = calculateProgress(goal);
    const progressColor = getProgressColor(progress);
    const textColor = getProgressTextColor(progress);
    const daysRemaining = getDaysRemaining(goal.deadline);
    const isCompleted = goal.status === 'completed';

    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition ${isCompleted ? 'opacity-75' : ''}">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <span class="text-4xl">${goal.icon}</span>
                    <div>
                        <h4 class="font-bold text-gray-900 dark:text-white">${goal.name}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${goal.category}</p>
                    </div>
                </div>
                ${!isCompleted ? `
                    <button class="delete-goal-btn text-gray-400 hover:text-red-500 transition" data-goal-id="${goal.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                ` : `
                    <span class="text-2xl">✅</span>
                `}
            </div>

            <!-- Progress Bar -->
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-600 dark:text-gray-400">Progresso</span>
                    <span class="font-bold ${textColor}">${progress}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div class="${progressColor} h-full rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
            </div>

            <!-- Amounts -->
            <div class="mb-4">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Atual</p>
                        <p class="text-lg font-bold text-gray-900 dark:text-white">${formatCurrency(goal.currentAmount)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500 dark:text-gray-400">Meta</p>
                        <p class="text-lg font-bold ${textColor}">${formatCurrency(goal.targetAmount)}</p>
                    </div>
                </div>
                ${goal.deadline ? `
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        ${daysRemaining !== null ? (daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Prazo expirado') : 'Sem prazo'}
                    </p>
                ` : ''}
            </div>

            <!-- Actions -->
            ${!isCompleted ? `
                <div class="flex gap-2">
                    <button class="add-contribution-btn flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm" data-goal-id="${goal.id}">
                        + Adicionar
                    </button>
                    <button class="edit-goal-btn bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition" data-goal-id="${goal.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </div>
            ` : `
                <div class="text-center py-2">
                    <span class="text-green-600 dark:text-green-500 font-bold">🎉 Meta Alcançada!</span>
                </div>
            `}
        </div>
    `;
}

/**
 * Setup event listeners for goals page
 */
function setupGoalsPageListeners() {
    // Add goal button
    const addBtn = document.getElementById('addGoalBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openGoalModal());
    }

    // Delete buttons
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const goalId = btn.dataset.goalId;
            deleteGoal(goalId);
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-goal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const goalId = btn.dataset.goalId;
            const goal = state.goals.find(g => g.id === goalId);
            if (goal) openGoalModal(goal);
        });
    });

    // Add contribution buttons
    document.querySelectorAll('.add-contribution-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const goalId = btn.dataset.goalId;
            openContributionModal(goalId);
        });
    });
}

/**
 * Open goal creation/edit modal
 */
function openGoalModal(goal = null) {
    const elements = getElements();
    const isEdit = goal !== null;

    // Populate form if editing
    if (isEdit) {
        elements.goalNameInput.value = goal.name;
        elements.goalTargetInput.value = goal.targetAmount;
        elements.goalCurrentInput.value = goal.currentAmount;
        elements.goalDeadlineInput.value = goal.deadline || '';
        elements.goalIconInput.value = goal.icon;
        elements.goalCategorySelect.value = goal.category;
        elements.goalFormTitle.textContent = 'Editar Meta';
    } else {
        elements.goalForm.reset();
        elements.goalIconInput.value = '🎯';
        elements.goalFormTitle.textContent = 'Nova Meta';
    }

    showElement(elements.goalModal);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        const goalData = {
            name: elements.goalNameInput.value,
            targetAmount: elements.goalTargetInput.value,
            currentAmount: elements.goalCurrentInput.value || 0,
            deadline: elements.goalDeadlineInput.value,
            icon: elements.goalIconInput.value,
            category: elements.goalCategorySelect.value
        };

        let success;
        if (isEdit) {
            success = await updateGoal(goal.id, goalData);
        } else {
            success = await createGoal(goalData);
        }

        if (success) {
            hideElement(elements.goalModal);
            elements.goalForm.removeEventListener('submit', handleSubmit);
        }
    };

    elements.goalForm.addEventListener('submit', handleSubmit);
}

/**
 * Open contribution modal
 */
function openContributionModal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const amount = prompt(`Quanto deseja adicionar à meta "${goal.name}"?`);
    if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
        addContribution(goalId, parseFloat(amount));
    }
}

/**
 * Update goals dashboard card
 */
function updateGoalsDashboardCard() {
    const activeGoals = getActiveGoals();
    const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    const countEl = document.getElementById('dashboardGoalsCount');
    const savedEl = document.getElementById('dashboardGoalsSaved');

    if (countEl) countEl.textContent = activeGoals.length;
    if (savedEl) savedEl.textContent = formatCurrency(totalSaved);
}
