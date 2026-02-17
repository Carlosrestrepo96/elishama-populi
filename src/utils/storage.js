// src/utils/storage.js
import { openDB } from 'idb';

const DB_NAME = 'EliShamaPopuliDB';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Store for Keys
            if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys', { keyPath: 'id' });
            }
            // Store for Votes/Audit Trail
            if (!db.objectStoreNames.contains('auditTrail')) {
                const store = db.createObjectStore('auditTrail', { keyPath: 'timestamp' });
                store.createIndex('type', 'type');
            }
            // Store for App State (e.g., initialization status)
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
        },
    });
};

export const saveKeys = async (keys) => {
    const db = await initDB();
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');

    // Clear existing keys if any (re-initialization scenario)
    await store.clear();

    for (let i = 0; i < keys.length; i++) {
        await store.put({
            id: i + 1,
            publicKey: keys[i].publicKey,
            privateKey: keys[i].privateKey,
            createdAt: Date.now()
        });
    }
    await tx.done;
};

export const loadKeys = async () => {
    const db = await initDB();
    return await db.getAll('keys');
};

export const appendAuditLog = async (entry) => {
    const db = await initDB();
    const tx = db.transaction('auditTrail', 'readwrite');
    await tx.objectStore('auditTrail').add({
        ...entry,
        timestamp: Date.now()
    });
    await tx.done;
};

export const getAuditLog = async () => {
    const db = await initDB();
    return await db.getAll('auditTrail');
};
