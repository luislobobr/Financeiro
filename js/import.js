/**
 * Import Module
 * Handles CSV and Excel file imports using SheetJS (XLSX)
 */

import { addDoc, getTransactionsCollectionRef } from './firebase.js';
import { parseDateFromSheet, showToast, showElement, hideElement } from './utils.js';
import { getElements, updatePaidByDropdown } from './ui.js';
import { state } from './state.js'; // FIX: proper state import

let parsedCsvData = [];

/**
 * Handle file selection (Excel or CSV)
 */
export function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const elements = getElements();
    elements.csvFileInput.value = null;

    const requiredCols = ['Descrição', 'Valor', 'Tipo', 'Vencimento', 'Categoria'];

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            // Check if XLSX is loaded
            if (typeof XLSX === 'undefined') {
                showToast("Biblioteca SheetJS não carregada. Tente recarregar a página.", true);
                return;
            }

            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { cellDates: true });

            if (jsonData.length === 0) {
                showToast("Arquivo vazio ou planilha sem dados.", true);
                return;
            }

            const headers = Object.keys(jsonData[0]);
            const missingCols = requiredCols.filter(col => !headers.includes(col));

            if (missingCols.length > 0) {
                showToast(`Arquivo inválido. Colunas faltando: ${missingCols.join(', ')}`, true);
                return;
            }

            parsedCsvData = jsonData;
            showReviewModal(parsedCsvData);

        } catch (error) {
            console.error("Erro ao ler o arquivo (SheetJS):", error);
            showToast("Erro ao ler o arquivo. Verifique o formato.", true);
        }
    };
    reader.onerror = (error) => showToast("Não foi possível ler o arquivo.", true);
    reader.readAsBinaryString(file);
}

/**
 * Show import review modal
 */
function showReviewModal(data) {
    const elements = getElements();
    updatePaidByDropdown(elements.importPaidBySelect, state.partnerNames);

    const headers = Object.keys(data[0]);
    elements.csvPreviewHead.innerHTML = `
        <tr>
            ${headers.map(h => `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${h}</th>`).join('')}
        </tr>
    `;

    const previewData = data.slice(0, 5);
    elements.csvPreviewBody.innerHTML = previewData.map(row => `
        <tr>
            ${headers.map(h => {
        let val = row[h] || '';
        if (val instanceof Date) {
            val = val.toLocaleDateString('pt-BR');
        }
        return `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${val}</td>`
    }).join('')}
        </tr>
    `).join('');

    showElement(elements.importReviewStep);
    hideElement(elements.importLoadingStep);
    showElement(elements.importModal);
}

/**
 * Process import and save to Firestore
 */
export async function processImport() {
    if (parsedCsvData.length === 0) return;

    const elements = getElements();
    const defaultPaidBy = elements.importPaidBySelect.value;

    showElement(elements.importLoadingStep);
    hideElement(elements.importReviewStep);

    const importPromises = [];
    let processedCount = 0;

    for (const row of parsedCsvData) {
        let amount;
        if (typeof row.Valor === 'number') {
            amount = row.Valor;
        } else {
            let amountStr = String(row.Valor).replace(/R\$|\s/g, '');
            if (amountStr.includes(',') && amountStr.includes('.')) {
                amountStr = amountStr.replace(/\./g, '');
            }
            amountStr = amountStr.replace(',', '.');
            amount = parseFloat(amountStr);
        }

        const type = row.Tipo;
        const dueDateValue = row['Vencimento'];
        const paymentDateValue = row['Data Pagamento'] || '';

        const dueDate = parseDateFromSheet(dueDateValue);

        if (!dueDate || isNaN(dueDate.getTime())) {
            console.warn("Linha pulada (Data de Vencimento inválida):", row);
            continue;
        }

        let paymentDate = '';
        if (paymentDateValue) {
            const pd = parseDateFromSheet(paymentDateValue);
            if (pd && !isNaN(pd.getTime())) {
                paymentDate = pd.toISOString().split('T')[0];
            }
        }

        const statusValue = row['Status'] || (paymentDate ? 'Pago' : 'A Pagar');
        const category = (row.Categoria === 'N/A' || !row.Categoria) ? 'Outros' : row.Categoria;
        const expenseType = row['Tipo de Despesa'] === 'Fixa' ? 'Fixa' : 'Variável';
        const isRecurring = row['Recorrente'] === true || row['Recorrente'] === 'Sim';
        const creditCard = row['Cartão'] || '';

        if (!row.Descrição || isNaN(amount) || amount <= 0 || !type) {
            console.warn("Linha pulada (dados inválidos):", row);
            continue;
        }

        const newTransaction = {
            description: row.Descrição,
            amount: amount,
            dueDate: dueDate.toISOString().split('T')[0],
            paymentDate: paymentDate,
            status: statusValue,
            type: type,
            category: category,
            paidBy: defaultPaidBy,
            expenseType: (type === 'Despesa') ? expenseType : '',
            isRecurring: isRecurring,
            creditCard: creditCard,
            createdAt: new Date().toISOString()
        };

        importPromises.push(addDoc(getTransactionsCollectionRef(), newTransaction));
        processedCount++;
    }

    try {
        await Promise.all(importPromises);
        showToast(`Sucesso! ${processedCount} transações importadas.`);
    } catch (error) {
        console.error("Erro durante a importação:", error);
        showToast("Erro ao importar transações.", true);
    } finally {
        hideElement(elements.importModal);
        parsedCsvData = [];
        elements.csvFileInput.value = null;
    }
}
