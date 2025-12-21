/**
 * Firebase Configuration and Initialization
 * Handles Firebase setup, authentication, and Firestore references
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    collection,
    addDoc,
    deleteDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    orderBy,
    setDoc,
    updateDoc,
    collectionGroup,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCYfw1s61o3OgK_sXuR3lklm6GkPTr4XYo",
    authDomain: "meu-controle-financeiro-82dfe.firebaseapp.com",
    projectId: "meu-controle-financeiro-82dfe",
    storageBucket: "meu-controle-financeiro-82dfe.firebasestorage.app",
    messagingSenderId: "588430087487",
    appId: "1:588430087487:web:73632e879a49bcb2212f8a"
};

// State
let db = null;
let auth = null;
let userId = null;
let appId = null;
let familyId = null;

/**
 * Initialize Firebase and authenticate user
 */
export async function initializeAndAuth() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        appId = firebaseConfig.appId || 'default-app-id';

        return new Promise((resolve, reject) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    resolve();
                } else {
                    try {
                        const userCredential = await signInAnonymously(auth);
                        userId = userCredential.user.uid;
                        resolve();
                    } catch (error) {
                        reject(new Error(`Erro ao autenticar anonimamente: ${error.message}`));
                    }
                }
            });
        });
    } catch (error) {
        throw new Error(`Falha na inicialização do Firebase: ${error.message}`);
    }
}

/**
 * Set the family ID
 */
export function setFamilyId(id) {
    familyId = id;
}

/**
 * Get the family ID
 */
export function getFamilyId() {
    return familyId;
}

/**
 * Get the app ID
 */
export function getAppId() {
    return appId;
}

/**
 * Get Firestore instance
 */
export function getDb() {
    return db;
}

/**
 * Get the family document reference
 */
export function getFamilyDocRef() {
    if (!familyId) {
        throw new Error('familyId não está definido! Certifique-se de chamar setFamilyId() primeiro.');
    }
    return doc(db, 'artifacts', appId, 'public', 'data', 'families', familyId);
}

/**
 * Get the transactions collection reference
 */
export function getTransactionsCollectionRef() {
    return collection(getFamilyDocRef(), 'transactions');
}

/**
 * Get the budget document reference
 */
export function getBudgetDocRef() {
    return doc(db, 'artifacts', appId, 'public', 'data', 'families', familyId, 'budgets', 'monthly');
}

/**
 * Get the categories document reference
 */
export function getCategoriesDocRef() {
    return doc(db, 'artifacts', appId, 'public', 'data', 'families', familyId, 'settings', 'categories');
}

/**
 * Get the credit cards document reference
 */
export function getCreditCardsDocRef() {
    return doc(db, 'artifacts', appId, 'public', 'data', 'families', familyId, 'settings', 'creditCards');
}

/**
 * Get the payment methods document reference
 */
export function getPaymentMethodsDocRef() {
    return doc(db, 'artifacts', appId, 'public', 'data', 'families', familyId, 'settings', 'paymentMethods');
}

// Re-export Firestore functions for convenience
export {
    doc,
    collection,
    addDoc,
    deleteDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    orderBy,
    setDoc,
    updateDoc,
    getDoc
};

