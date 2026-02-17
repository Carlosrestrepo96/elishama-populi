// utils/AuditChain.js
// Cadena de bloques inmutable con firmas ECDSA para auditoría de votación
import { openDB } from 'idb';

export class AuditChain {
    constructor(cryptoVault) {
        this.vault = cryptoVault; // Instancia de nuestra bóveda blindada
        this.db = null;
    }

    async init() {
        this.db = await openDB('EliShama_AuditLog_v1', 1, {
            upgrade(db) {
                // La cadena principal, indexada por el número de bloque
                if (!db.objectStoreNames.contains('blocks')) {
                    db.createObjectStore('blocks', { keyPath: 'index' });
                }
            }
        });
    }

    async getLastBlock() {
        const tx = this.db.transaction('blocks', 'readonly');
        const store = tx.objectStore('blocks');
        const cursor = await store.openCursor(null, 'prev'); // Obtener el último
        return cursor ? cursor.value : null;
    }

    /**
     * Obtiene todos los bloques de la cadena
     */
    async getAllBlocks() {
        return await this.db.getAll('blocks');
    }

    /**
     * Añade un nuevo evento a la cadena.
     * Si es una alteración/eliminación, pasamos el `previousState` para respaldarlo cifrado.
     * 
     * @param {string} actionType - Tipo de acción: 'VOTE_CAST', 'VOTE_ALTERED_ATTEMPT', 'RECORD_DELETED', etc.
     * @param {object} currentData - Los datos actuales del evento
     * @param {string} signingKeyId - ID de la clave ECDSA para firmar el bloque
     * @param {object|null} previousState - Estado anterior (para respaldar en el Shadow Vault)
     */
    async addBlock(actionType, currentData, signingKeyId, previousState = null) {
        const lastBlock = await this.getLastBlock();
        const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64); // Bloque Génesis
        const index = lastBlock ? lastBlock.index + 1 : 0;

        let encryptedShadowRecord = null;

        // Aquí cumplimos el requerimiento: Respaldar lo que se intenta alterar/borrar
        if (previousState) {
            // Usamos la bóveda para cifrar el estado anterior antes de que desaparezca
            encryptedShadowRecord = await this.vault.encryptSymmetric(JSON.stringify(previousState));
        }

        // 1. Preparamos los datos del bloque
        const blockData = {
            index,
            timestamp: Date.now(),
            action: actionType,
            keyId: signingKeyId,
            payloadHash: await this.hashData(currentData),
            previousHash,
            evidenceVault: encryptedShadowRecord ? Array.from(new Uint8Array(encryptedShadowRecord.ciphertext)) : null,
            iv: encryptedShadowRecord ? Array.from(new Uint8Array(encryptedShadowRecord.iv)) : null
        };

        // 2. Sellamos el bloque criptográficamente (Reemplaza al Proof-of-Work)
        // Recuperamos la clave privada de la RAM usando el PIN del usuario
        const privateKey = await this.vault.getPrivateKeyForSigning(signingKeyId);

        const blockString = JSON.stringify(blockData);
        const encoder = new TextEncoder();

        const signatureBuffer = await window.crypto.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            privateKey,
            encoder.encode(blockString)
        );

        const block = {
            ...blockData,
            signature: Array.from(new Uint8Array(signatureBuffer))
        };

        // 3. Calculamos el hash final del bloque (incluyendo su firma)
        block.hash = await this.hashData(block);

        // 4. Guardamos en IndexedDB
        await this.db.put('blocks', block);
        return block;
    }

    /**
     * Utilidad para hashear objetos consistentemente con SHA-256
     */
    async hashData(data) {
        const encoder = new TextEncoder();
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(dataString));
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Auditoría de integridad de la cadena local.
     * Verifica que ningún bloque haya sido modificado directamente en IndexedDB.
     * 
     * @returns {object} Resultado de la verificación con detalles
     */
    async verifyChain() {
        const blocks = await this.db.getAll('blocks');
        if (blocks.length === 0) return { valid: true, blockCount: 0, errors: [] };

        const errors = [];

        for (let i = 1; i < blocks.length; i++) {
            const current = blocks[i];
            const previous = blocks[i - 1];

            // 1. Verificar eslabón de la cadena
            if (current.previousHash !== previous.hash) {
                errors.push({
                    type: 'CHAIN_BREAK',
                    blockIndex: i,
                    message: `Eslabón roto entre bloque ${i - 1} y ${i}. La cadena fue alterada.`
                });
            }

            // 2. Re-calcular hash del bloque para detectar manipulación directa en IndexedDB
            const currentHash = current.hash;
            const blockWithoutHash = { ...current };
            delete blockWithoutHash.hash;
            const recalculatedHash = await this.hashData(blockWithoutHash);

            if (currentHash !== recalculatedHash) {
                errors.push({
                    type: 'HASH_MISMATCH',
                    blockIndex: i,
                    message: `Hash inválido en bloque ${i}. Posible manipulación directa de datos.`
                });
            }
        }

        return {
            valid: errors.length === 0,
            blockCount: blocks.length,
            errors
        };
    }

    /**
     * Recuperar y descifrar la evidencia histórica de un bloque
     */
    async decryptEvidence(block) {
        if (!block.evidenceVault || !block.iv) {
            return null;
        }

        try {
            const decrypted = await this.vault.decryptSymmetric(block.evidenceVault, block.iv);
            return JSON.parse(decrypted);
        } catch (e) {
            console.error('No se pudo descifrar la evidencia:', e);
            return null;
        }
    }

    /**
     * Obtener estadísticas de la cadena
     */
    async getChainStats() {
        const blocks = await this.db.getAll('blocks');
        const stats = {
            totalBlocks: blocks.length,
            votes: 0,
            alterations: 0,
            deletions: 0,
            lastBlockTime: null,
            syncedBlocks: 0,
            pendingSync: 0
        };

        for (const block of blocks) {
            if (block.action === 'VOTE_CAST') stats.votes++;
            if (block.action === 'VOTE_ALTERED_ATTEMPT') stats.alterations++;
            if (block.action === 'RECORD_DELETED') stats.deletions++;
            if (block.synced) stats.syncedBlocks++;
            else stats.pendingSync++;
        }

        if (blocks.length > 0) {
            stats.lastBlockTime = blocks[blocks.length - 1].timestamp;
        }

        return stats;
    }
}
