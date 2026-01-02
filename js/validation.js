/**
 * Form Validation Module
 * Provides inline validation messages for form fields
 */

import { showToast } from './utils.js';

/**
 * Add validation styling and message to a field
 * @param {HTMLElement} field - The input field
 * @param {string} message - Error message to display
 * @param {boolean} isValid - Whether the field is valid
 */
function setFieldValidation(field, message, isValid) {
    // Remove existing validation message
    const existingMsg = field.parentElement.querySelector('.validation-message');
    if (existingMsg) {
        existingMsg.remove();
    }

    // Remove validation classes
    field.classList.remove('border-red-500', 'border-green-500');

    if (!isValid && message) {
        // Add error styling
        field.classList.add('border-red-500');

        // Add error message
        const msgEl = document.createElement('span');
        msgEl.className = 'validation-message text-red-400 text-xs mt-1 block';
        msgEl.textContent = message;
        field.parentElement.appendChild(msgEl);
    } else if (isValid && field.value) {
        // Add success styling
        field.classList.add('border-green-500');
    }
}

/**
 * Validate a required field
 */
function validateRequired(field, fieldName = 'Este campo') {
    const value = field.value.trim();
    if (!value) {
        setFieldValidation(field, `${fieldName} é obrigatório`, false);
        return false;
    }
    setFieldValidation(field, '', true);
    return true;
}

/**
 * Validate a numeric field (amount)
 */
function validateAmount(field) {
    const value = parseFloat(field.value);
    if (isNaN(value) || value <= 0) {
        setFieldValidation(field, 'Valor deve ser maior que zero', false);
        return false;
    }
    setFieldValidation(field, '', true);
    return true;
}

/**
 * Validate a date field
 */
function validateDate(field, fieldName = 'Data') {
    const value = field.value;
    if (!value) {
        setFieldValidation(field, `${fieldName} é obrigatória`, false);
        return false;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
        setFieldValidation(field, 'Data inválida', false);
        return false;
    }

    setFieldValidation(field, '', true);
    return true;
}

/**
 * Validate description minimum length
 */
function validateDescription(field, minLength = 3) {
    const value = field.value.trim();
    if (value.length < minLength) {
        setFieldValidation(field, `Descrição deve ter pelo menos ${minLength} caracteres`, false);
        return false;
    }
    setFieldValidation(field, '', true);
    return true;
}

/**
 * Setup real-time validation for transaction form
 */
export function setupTransactionFormValidation() {
    const form = document.getElementById('transactionForm');
    if (!form) return;

    const descriptionField = form.querySelector('[name="description"]');
    const amountField = form.querySelector('[name="amount"]');
    const dueDateField = form.querySelector('[name="dueDate"]');
    const categoryField = form.querySelector('[name="category"]');

    // Add blur validation
    if (descriptionField) {
        descriptionField.addEventListener('blur', () => validateDescription(descriptionField));
    }

    if (amountField) {
        amountField.addEventListener('blur', () => validateAmount(amountField));
        // Auto-format on blur
        amountField.addEventListener('blur', () => {
            if (amountField.value && !isNaN(parseFloat(amountField.value))) {
                amountField.value = parseFloat(amountField.value).toFixed(2);
            }
        });
    }

    if (dueDateField) {
        dueDateField.addEventListener('blur', () => validateDate(dueDateField, 'Data de vencimento'));
    }

    if (categoryField) {
        categoryField.addEventListener('blur', () => validateRequired(categoryField, 'Categoria'));
    }
}

/**
 * Setup validation for goal form
 */
export function setupGoalFormValidation() {
    const form = document.getElementById('goalForm');
    if (!form) return;

    const nameField = form.querySelector('[name="goalName"]');
    const targetField = form.querySelector('[name="goalTarget"]');
    const deadlineField = form.querySelector('[name="goalDeadline"]');

    if (nameField) {
        nameField.addEventListener('blur', () => validateDescription(nameField, 2));
    }

    if (targetField) {
        targetField.addEventListener('blur', () => validateAmount(targetField));
    }

    if (deadlineField) {
        deadlineField.addEventListener('blur', () => validateDate(deadlineField, 'Prazo'));
    }
}

/**
 * Validate entire form before submission
 * @param {HTMLFormElement} form
 * @returns {boolean} Whether form is valid
 */
export function validateForm(form) {
    let isValid = true;

    // Description
    const descField = form.querySelector('[name="description"]');
    if (descField && !validateDescription(descField)) {
        isValid = false;
    }

    // Amount
    const amountField = form.querySelector('[name="amount"]');
    if (amountField && !validateAmount(amountField)) {
        isValid = false;
    }

    // Due Date
    const dueDateField = form.querySelector('[name="dueDate"]');
    if (dueDateField && !validateDate(dueDateField)) {
        isValid = false;
    }

    // Category
    const categoryField = form.querySelector('[name="category"]');
    if (categoryField && !validateRequired(categoryField, 'Categoria')) {
        isValid = false;
    }

    if (!isValid) {
        showToast('Por favor, corrija os campos destacados.', true);
    }

    return isValid;
}

/**
 * Initialize all form validations
 */
export function initFormValidations() {
    setupTransactionFormValidation();
    setupGoalFormValidation();
    console.log('Form validations initialized');
}

console.log('Validation module loaded');
