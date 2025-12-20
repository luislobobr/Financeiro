/**
 * Categories Module
 * Handles category management
 */

import { getCategoriesDocRef, onSnapshot, setDoc } from './firebase.js';
import { showToast, categoryColorClasses } from './utils.js';
import { getElements, showElement, hideElement } from './ui.js';
import { state } from './state.js';
import { updateAllUI } from './app.js';

let unsubscribeCategories = null;

// Default categories
const defaultCategories = [
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
];

/**
 * Setup categories listener
 */
export function setupCategoriesListener() {
    if (unsubscribeCategories) unsubscribeCategories();

    const categoriesDocRef = getCategoriesDocRef();
    unsubscribeCategories = onSnapshot(categoriesDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
            state.categories = docSnap.data().list;
        } else {
            state.categories = defaultCategories;
            if (!docSnap.exists()) {
                setDoc(categoriesDocRef, { list: defaultCategories }, { merge: true })
                    .catch(e => console.error("Erro ao criar doc de categorias:", e));
            }
        }

        populateCategorySelects();
        renderCategoriesList();
        updateAllUI(state.allTransactions);
    }, (error) => {
        console.error("Erro ao ouvir categorias:", error);
    });
}

/**
 * Populate category select elements
 */
export function populateCategorySelects() {
    const elements = getElements();
    const optionsHtml = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');

    if (elements.categorySelect) {
        elements.categorySelect.innerHTML = optionsHtml;
    }

    if (elements.pendingFilterCategory) {
        elements.pendingFilterCategory.innerHTML = `<option value="">Todas</option>` + optionsHtml;
    }

    if (elements.filterCategory) {
        elements.filterCategory.innerHTML = `<option value="">Todas</option>` + optionsHtml;
    }

    if (elements.incomeFilterCategory) {
        const incomeCategories = state.categories.filter(c => c === 'Salário' || c === 'Outros');
        elements.incomeFilterCategory.innerHTML = `<option>Todas</option>` + incomeCategories.map(c => `<option>${c}</option>`).join('');
    }
}

/**
 * Render categories list in modal
 */
export function renderCategoriesList() {
    const elements = getElements();
    if (!elements.categoriesList) return;

    elements.categoriesList.innerHTML = '';

    if (state.categories.length === 0) {
        elements.categoriesList.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-4">
                Nenhuma categoria cadastrada.
            </div>
        `;
        return;
    }

    state.categories.forEach((category, index) => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
        categoryItem.innerHTML = `
            <div class="flex items-center">
                <span class="w-3 h-3 rounded-full mr-3 ${categoryColorClasses[category] || categoryColorClasses['Outros']}"></span>
                <span class="text-gray-700 dark:text-gray-300">${category}</span>
            </div>
            <div class="flex space-x-2">
                <button class="edit-category-btn p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="delete-category-btn p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
        elements.categoriesList.appendChild(categoryItem);
    });

    // Add event listeners
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            editCategory(index);
        });
    });

    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            deleteCategory(index);
        });
    });
}

/**
 * Handle add category
 */
export async function handleAddCategory(e) {
    e.preventDefault();
    const elements = getElements();
    const newCategory = elements.newCategoryNameInput.value.trim();

    if (!newCategory) {
        showToast("Por favor, insira um nome para a categoria.", true);
        return;
    }

    if (state.categories.includes(newCategory)) {
        showToast("Esta categoria já existe.", true);
        return;
    }

    try {
        const updatedCategories = [...state.categories, newCategory];
        await setDoc(getCategoriesDocRef(), { list: updatedCategories }, { merge: true });
        elements.newCategoryNameInput.value = '';
        showToast("Categoria adicionada com sucesso!");
    } catch (error) {
        console.error("Erro ao adicionar categoria:", error);
        showToast("Erro ao adicionar categoria.", true);
    }
}

/**
 * Edit category
 */
export async function editCategory(index) {
    const currentCategory = state.categories[index];
    const newCategory = prompt("Editar categoria:", currentCategory);

    if (!newCategory || newCategory.trim() === '') {
        return;
    }

    if (state.categories.includes(newCategory) && newCategory !== currentCategory) {
        showToast("Esta categoria já existe.", true);
        return;
    }

    try {
        const updatedCategories = [...state.categories];
        updatedCategories[index] = newCategory.trim();
        await setDoc(getCategoriesDocRef(), { list: updatedCategories }, { merge: true });
        showToast("Categoria atualizada com sucesso!");
    } catch (error) {
        console.error("Erro ao editar categoria:", error);
        showToast("Erro ao editar categoria.", true);
    }
}

/**
 * Delete category
 */
export async function deleteCategory(index) {
    const categoryToDelete = state.categories[index];

    const isCategoryUsed = state.allTransactions.some(t => t.category === categoryToDelete);

    if (isCategoryUsed) {
        showToast("Não é possível excluir esta categoria pois ela está sendo usada em transações.", true);
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoryToDelete}"?`)) {
        return;
    }

    try {
        const updatedCategories = state.categories.filter((_, i) => i !== index);
        await setDoc(getCategoriesDocRef(), { list: updatedCategories }, { merge: true });
        showToast("Categoria excluída com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir categoria:", error);
        showToast("Erro ao excluir categoria.", true);
    }
}

/**
 * Open categories modal
 */
export function openCategoriesModal() {
    const elements = getElements();
    showElement(elements.categoriesModal);
}

/**
 * Close categories modal
 */
export function closeCategoriesModal() {
    const elements = getElements();
    hideElement(elements.categoriesModal);
}
