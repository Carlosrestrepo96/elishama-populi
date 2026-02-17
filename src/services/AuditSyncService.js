// services/AuditSyncService.js
// Servicio de sincronización offline-first con Background Sync para PWA

export class AuditSyncService {
    constructor(auditChain) {
        this.chain = auditChain; // Nuestra instancia de AuditChain
        this.API_URL = 'https://api.elishamapopuli.com/v1/audit/sync';
    }

    /**
     * Obtiene los bloques locales no sincronizados y los envía al backend.
     * El servidor actúa como "Servidor de Transparencia" - solo recibe hashes,
     * firmas y metadatos, NUNCA el contenido del voto en texto plano.
     */
    async synchronize() {
        // 1. Obtener todos los bloques de IndexedDB
        const allBlocks = await this.chain.getAllBlocks();

        // 2. Filtrar los que no tienen el flag 'synced'
        const pendingBlocks = allBlocks.filter(block => !block.synced);

        if (pendingBlocks.length === 0) {
            console.log('✅ Cadena de auditoría sincronizada. Nada que enviar.');
            return { success: true, synced: 0, pending: 0 };
        }

        // 3. Sanitizar el payload (Principio de Privacidad por Diseño)
        // NUNCA enviamos el 'evidenceVault' (que tiene la data anterior cifrada)
        // El servidor solo necesita verificar la integridad de la cadena
        const payload = pendingBlocks.map(block => ({
            index: block.index,
            timestamp: block.timestamp,
            action: block.action,
            keyId: block.keyId,
            payloadHash: block.payloadHash, // El servidor sabe QUE se votó, no QUÉ se votó
            previousHash: block.previousHash,
            hash: block.hash,
            signature: block.signature // Array de bytes de la firma ECDSA
        }));

        try {
            // 4. Enviar al Servidor de Transparencia
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ blocks: payload })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}: Fallo al sincronizar con el nodo validador`);
            }

            const result = await response.json();

            // 5. Si el servidor aceptó la cadena y validó las firmas, marcamos como sincronizado
            if (result.success) {
                await this.markBlocksAsSynced(pendingBlocks);
                console.log(`✅ ${pendingBlocks.length} bloques sincronizados con éxito.`);
                return { success: true, synced: pendingBlocks.length, pending: 0 };
            }

            return { success: false, synced: 0, pending: pendingBlocks.length, error: result.error };

        } catch (error) {
            console.error('⚠️ Error de red al sincronizar. Se reintentará más tarde.', error);
            // Delegamos al Service Worker para reintento en background
            await this.registerBackgroundSync();
            return { success: false, synced: 0, pending: pendingBlocks.length, error: error.message };
        }
    }

    /**
     * Actualiza el estado local de los bloques a 'synced: true'
     */
    async markBlocksAsSynced(blocks) {
        const tx = this.chain.db.transaction('blocks', 'readwrite');
        for (const block of blocks) {
            block.synced = true;
            await tx.store.put(block);
        }
        await tx.done;
    }

    /**
     * PWA Power: Si falla la red, le pedimos al navegador que lo intente por nosotros
     * cuando vuelva el internet, incluso si el usuario cierra la app.
     */
    async registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-audit-chain');
                console.log('🔄 Sincronización en segundo plano registrada.');
                return true;
            } catch (err) {
                console.error('Background Sync no disponible:', err);
                return false;
            }
        }
        return false;
    }

    /**
     * Obtener el estado de sincronización actual
     */
    async getSyncStatus() {
        const allBlocks = await this.chain.getAllBlocks();
        const synced = allBlocks.filter(b => b.synced).length;
        const pending = allBlocks.filter(b => !b.synced).length;

        return {
            total: allBlocks.length,
            synced,
            pending,
            lastSyncedBlock: allBlocks.filter(b => b.synced).pop() || null,
            isFullySynced: pending === 0
        };
    }
}
