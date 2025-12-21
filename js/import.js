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
 * Handle file selection (Excel, CSV, or OFX)
 */
export function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const elements = getElements();
    elements.csvFileInput.value = null;

    const fileName = file.name.toLowerCase();
    const isOFX = fileName.endsWith('.ofx');

    if (isOFX) {
        // Handle OFX file
        handleOFXFile(file);
        return;
    }

    // Handle Excel/CSV file (existing logic)
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
 * Handle OFX file parsing
 * @param {File} file - The OFX file to parse
 */
function handleOFXFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const ofxContent = e.target.result;
            const transactions = parseOFX(ofxContent);

            if (transactions.length === 0) {
                showToast("Nenhuma transação encontrada no arquivo OFX.", true);
                return;
            }

            parsedCsvData = transactions;
            showReviewModal(parsedCsvData);

        } catch (error) {
            console.error("Erro ao processar arquivo OFX:", error);
            showToast("Erro ao processar arquivo OFX. Verifique o formato.", true);
        }
    };
    reader.onerror = () => showToast("Não foi possível ler o arquivo OFX.", true);
    reader.readAsText(file);
}

/**
 * Parse OFX file content
 * @param {string} ofxContent - Raw OFX file content
 * @returns {Array} Array of transaction objects
 */
function parseOFX(ofxContent) {
    const transactions = [];

    // Extract transactions from OFX (both SGML and XML formats)
    // Match STMTTRN blocks
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const matches = ofxContent.matchAll(transactionRegex);

    for (const match of matches) {
        const transactionBlock = match[1];

        // Extract individual fields
        const trnAmt = extractOFXTag(transactionBlock, 'TRNAMT');
        const dtPosted = extractOFXTag(transactionBlock, 'DTPOSTED');
        const name = extractOFXTag(transactionBlock, 'NAME') || extractOFXTag(transactionBlock, 'MEMO') || 'Transação importada';
        const trnType = extractOFXTag(transactionBlock, 'TRNTYPE');

        if (!trnAmt || !dtPosted) continue;

        const amount = parseFloat(trnAmt);
        const date = parseOFXDate(dtPosted);

        if (isNaN(amount) || !date) continue;

        // Determine transaction type based on amount sign
        const type = amount < 0 ? 'Despesa' : 'Receita';
        const absAmount = Math.abs(amount);

        // Map to our data structure
        transactions.push({
            'Descrição': name,
            'Valor': absAmount,
            'Tipo': type,
            'Vencimento': date,
            'Categoria': 'Outros', // User can change in preview
            'Status': 'Pago', // Bank statement = already processed
            'Data Pagamento': date, // Same as due date for bank extracts
            'Tipo de Despesa': 'Variável',
            'Recorrente': false
        });
    }

    return transactions;
}

/**
 * Extract a tag value from OFX content
 * @param {string} content - OFX content block
 * @param {string} tagName - Tag name to extract
 * @returns {string|null} Tag value or null
 */
function extractOFXTag(content, tagName) {
    // Try XML format first (with closing tag)
    const xmlRegex = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i');
    const xmlMatch = content.match(xmlRegex);
    if (xmlMatch) return xmlMatch[1].trim();

    // Try SGML format (no closing tag, value until next tag or newline)
    const sgmlRegex = new RegExp(`<${tagName}>([^\\n<]+)`, 'i');
    const sgmlMatch = content.match(sgmlRegex);
    if (sgmlMatch) return sgmlMatch[1].trim();

    return null;
}

/**
 * Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
 * @param {string} ofxDate - OFX format date string
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null
 */
function parseOFXDate(ofxDate) {
    if (!ofxDate || ofxDate.length < 8) return null;

    // Extract YYYYMMDD (first 8 characters)
    const dateStr = ofxDate.substring(0, 8);
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    // Validate
    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
        return null;
    }

    return `${year}-${month}-${day}`;
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
