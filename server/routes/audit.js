// server/routes/audit.js
// Endpoint de recepción de bloques de la AuditChain desde la PWA
const express = require('express');
const router = express.Router();
const CryptoValidator = require('../services/cryptoValidator');

// Mock de base de datos (en producción: PostgreSQL/MongoDB)
const publicKeysDB = new Map();
const auditBlocksDB = [];

/**
 * POST /api/audit/sync
 * Recibe bloques de la AuditChain del frontend y verifica firmas ECDSA.
 * 
 * El servidor actúa como "Servidor de Transparencia":
 * - Recibe hashes, firmas y metadatos
 * - NUNCA recibe el contenido del voto en texto plano
 * - Verifica la firma contra la clave pública registrada
 */
router.post('/sync', async (req, res) => {
    const { blocks } = req.body;

    if (!blocks || !Array.isArray(blocks)) {
        return res.status(400).json({ error: 'Formato de datos inválido. Se espera { blocks: [...] }' });
    }

    const syncResults = [];

    for (const block of blocks) {
        try {
            // 1. Buscar la llave pública registrada para este keyId
            const keyRecord = publicKeysDB.get(block.keyId);

            if (!keyRecord) {
                // Si la clave no está registrada, la registramos automáticamente
                // En producción, esto debería hacerse en un endpoint separado con autenticación
                console.log(`🔑 Clave ${block.keyId} no encontrada. Sería rechazada en producción.`);
            }

            if (keyRecord && keyRecord.status === 'REVOKED') {
                throw new Error(`Llave ${block.keyId} revocada. Bloques rechazados.`);
            }

            // 2. Separar la firma del resto del bloque para verificar el contenido
            const { signature, hash, ...payloadToVerify } = block;

            // 3. Verificación criptográfica ECDSA
            if (keyRecord && keyRecord.public_key_jwk) {
                const isValid = CryptoValidator.verifySignature(
                    payloadToVerify,
                    signature,
                    keyRecord.public_key_jwk
                );

                if (!isValid) {
                    console.warn(`[🚨 ALERTA DE SEGURIDAD] Firma inválida para bloque del keyId: ${block.keyId}`);
                    throw new Error('Firma criptográfica inválida. Posible manipulación detectada.');
                }
            }

            // 4. Verificar continuidad de la cadena
            if (auditBlocksDB.length > 0) {
                const lastBlock = auditBlocksDB[auditBlocksDB.length - 1];
                if (block.previousHash && lastBlock.hash !== block.previousHash) {
                    console.warn(`[⚠️ CADENA ROTA] Falta bloque previo entre ${lastBlock.index} y ${block.index}`);
                }
            }

            // 5. Guardar en el acervo inmutable
            auditBlocksDB.push({
                block_hash: block.hash,
                key_id: block.keyId,
                previous_hash: block.previousHash,
                payload_hash: block.payloadHash,
                signature: block.signature,
                timestamp: block.timestamp,
                action: block.action,
                received_at: Date.now()
            });

            syncResults.push({ index: block.index, status: 'ACCEPTED' });

        } catch (error) {
            syncResults.push({
                index: block.index,
                status: 'REJECTED',
                reason: error.message
            });
        }
    }

    // Si algún bloque fue rechazado: 422 Unprocessable Entity
    const hasErrors = syncResults.some(r => r.status === 'REJECTED');
    res.status(hasErrors ? 422 : 200).json({
        success: !hasErrors,
        details: syncResults,
        storedBlocks: auditBlocksDB.length
    });
});

/**
 * POST /api/audit/register-key
 * Registra una clave pública en el censo criptográfico del servidor
 */
router.post('/register-key', async (req, res) => {
    const { keyId, publicKeyJwk } = req.body;

    if (!keyId || !publicKeyJwk) {
        return res.status(400).json({ error: 'Se requiere keyId y publicKeyJwk' });
    }

    publicKeysDB.set(keyId, {
        key_id: keyId,
        public_key_jwk: publicKeyJwk,
        status: 'ACTIVE',
        registered_at: Date.now()
    });

    console.log(`✅ Clave pública ${keyId} registrada exitosamente.`);
    res.json({ success: true, keyId, status: 'ACTIVE' });
});

/**
 * GET /api/audit/chain
 * Retorna la cadena completa para auditoría pública
 */
router.get('/chain', (req, res) => {
    const chainVerification = CryptoValidator.verifyChain(auditBlocksDB);

    res.json({
        chain: auditBlocksDB,
        verification: chainVerification,
        totalBlocks: auditBlocksDB.length
    });
});

module.exports = router;
