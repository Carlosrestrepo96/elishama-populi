// server/routes/urna.js
// La Urna Anónima — Depositario final de votos verificados
//
// REGLA DE ORO: Este endpoint NO tiene autenticación de usuario.
// Su única regla es matemática: si el token tiene una firma válida 
// del Censo, el voto se acepta. Si no, se rechaza.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { modPow } = require('../utils/rsaMath');

// Llave Pública del Censo (Solo N y e — información pública)
const CENSUS_PUBLIC_KEY = {
    N: process.env.RSA_PUBLIC_MODULUS_HEX
        ? BigInt('0x' + process.env.RSA_PUBLIC_MODULUS_HEX)
        : BigInt('0xd7f2ab1c3e5f7a9b0d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8'),
    e: BigInt(65537) // 0x010001
};

// Base de datos de la Urna
const usedTokensDB = new Set();  // Tokens "quemados" (anti-replay)
const votesDB = [];               // Votos depositados

/**
 * POST /api/urna/submit-vote
 * 
 * ⚠️ Esta ruta NO usa middleware de autenticación.
 * Cualquiera puede llamarla, pero solo las matemáticas decidirán si pasa.
 * 
 * Flujo:
 * 1. Prevención de doble gasto (Replay Attack)
 * 2. Verificación de firma ciega RSA del Censo
 * 3. Registro inmutable + quema del token
 * 4. Generación de recibo para el ciudadano
 */
router.post('/submit-vote', async (req, res) => {
    try {
        const { voteContent, ballotTokenHex, censusSignatureHex } = req.body;

        if (!voteContent || !ballotTokenHex || !censusSignatureHex) {
            return res.status(400).json({
                error: 'Faltan componentes criptográficos en la papeleta.',
                required: ['voteContent', 'ballotTokenHex', 'censusSignatureHex']
            });
        }

        // =========================================================================
        // 1. PREVENCIÓN DE DOBLE GASTO (Replay Attack)
        // =========================================================================
        if (usedTokensDB.has(ballotTokenHex)) {
            console.warn(`[🚨 DOBLE VOTO] Intento de reutilización del token: ${ballotTokenHex.substring(0, 16)}...`);
            return res.status(409).json({
                error: 'Papeleta rechazada: Este token ya fue utilizado.',
                code: 'TOKEN_ALREADY_USED'
            });
        }

        // =========================================================================
        // 2. VERIFICACIÓN DE LA FIRMA CIEGA RSA
        // =========================================================================
        const s = BigInt('0x' + censusSignatureHex);
        const m = BigInt('0x' + ballotTokenHex);

        // Verificación RSA: m' = s^e mod N
        // Si m' === m (token original), la firma es legítima
        const verification = modPow(s, CENSUS_PUBLIC_KEY.e, CENSUS_PUBLIC_KEY.N);

        if (verification !== m) {
            console.error(`[🚨 FRAUDE] Token NO firmado por el Censo. Token: ${ballotTokenHex.substring(0, 16)}...`);
            return res.status(403).json({
                error: 'Papeleta fraudulenta o firma inválida.',
                code: 'INVALID_SIGNATURE'
            });
        }

        // =========================================================================
        // 3. REGISTRO INMUTABLE Y QUEMA DEL TOKEN
        // =========================================================================

        // A) Quemar el token (transacción atómica en producción)
        usedTokensDB.add(ballotTokenHex);

        // B) Calcular el hash del voto para darle un recibo al ciudadano
        const voteHash = crypto.createHash('sha256')
            .update(JSON.stringify(voteContent))
            .digest('hex');

        // C) Registrar el voto en la base de datos inmutable
        const voteRecord = {
            hash_recibo: voteHash,
            eleccion: typeof voteContent === 'object' ? voteContent.choice : voteContent,
            tokenFingerprint: crypto.createHash('sha256')
                .update(ballotTokenHex)
                .digest('hex')
                .substring(0, 16), // Solo guardamos una huella parcial del token
            timestamp: Date.now()
        };

        votesDB.push(voteRecord);

        console.log(`✅ Voto depositado exitosamente. Recibo: ${voteHash.substring(0, 16)}...`);

        // 4. Retornar el Recibo de Votación al ciudadano
        res.status(200).json({
            success: true,
            message: 'Voto depositado exitosamente en la urna inmutable.',
            receipt: voteHash,
            voteNumber: votesDB.length
        });

    } catch (error) {
        console.error('Error crítico en la Urna:', error);
        res.status(500).json({ error: 'Error interno al procesar la papeleta.' });
    }
});

/**
 * GET /api/urna/stats
 * Estadísticas públicas de la urna (en tiempo real durante la elección)
 */
router.get('/stats', (req, res) => {
    res.json({
        totalVotes: votesDB.length,
        // No revelamos el desglose hasta cerrar la elección
        status: 'OPEN',
        timestamp: Date.now()
    });
});

/**
 * POST /api/urna/close-election
 * Cierre oficial de la elección y generación del acta con Merkle Tree
 * ⚠️ En producción: requiere autorización de múltiples administradores
 */
router.post('/close-election', async (req, res) => {
    const { electionId, adminKey } = req.body;

    // En producción: verificar que múltiples administradores autorizan el cierre
    // if (!verifyMultiSigAdmin(adminKey)) return res.status(403).json(...)

    try {
        const ScrutinyEngine = require('../services/ScrutinyEngine');

        // Generar el Acta Digital Pública
        const publicRecord = ScrutinyEngine.closeElection(
            votesDB,
            electionId || 'PLEBISCITO_2026'
        );

        // Verificar integridad del acta generada
        const verification = ScrutinyEngine.verifyElectionResults(publicRecord);

        console.log('\n========================================');
        console.log('📊 ESCRUTINIO OFICIAL COMPLETADO');
        console.log(`📝 Total de votos: ${publicRecord.totalVotes}`);
        console.log(`🌳 Merkle Root: ${publicRecord.merkleRoot}`);
        console.log(`✅ Integridad: ${verification.valid ? 'VÁLIDA' : 'COMPROMETIDA'}`);
        console.log('========================================\n');

        res.json({
            success: true,
            publicRecord,
            verification,
            message: 'Elección cerrada. Acta publicada.'
        });

    } catch (error) {
        console.error('Error al cerrar la elección:', error);
        res.status(500).json({ error: 'Error al generar el acta de escrutinio.' });
    }
});

/**
 * POST /api/urna/verify-receipt
 * Permite a un ciudadano verificar su voto contra el acta publicada
 */
router.post('/verify-receipt', (req, res) => {
    const { receiptHash } = req.body;

    if (!receiptHash) {
        return res.status(400).json({ error: 'Se requiere el hash del recibo (receiptHash)' });
    }

    const found = votesDB.find(v => v.hash_recibo === receiptHash);

    if (found) {
        res.json({
            verified: true,
            message: 'Tu voto ha sido encontrado en la urna inmutable.',
            voteTimestamp: found.timestamp
        });
    } else {
        res.json({
            verified: false,
            message: 'Recibo no encontrado. Tu voto podría no haber sido contabilizado.',
            alert: true
        });
    }
});

module.exports = router;
