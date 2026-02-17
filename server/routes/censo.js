// server/routes/censo.js
// Servidor de Censo Electoral — Firma Ciega RSA
// 
// Este servidor valida la IDENTIDAD del votante y firma su papeleta a CIEGAS.
// Nunca ve el contenido del voto. Solo sabe QUE alguien está autorizado para votar.
const express = require('express');
const router = express.Router();
const { modPow } = require('../utils/rsaMath');

// =============================================================================
// LLAVE RSA DEL CENSO (En producción: cargar desde Vault/HSM seguro)
// =============================================================================
// Generamos una clave RSA de ejemplo para desarrollo.
// En producción, esto debe ser una clave RSA de 2048+ bits generada con OpenSSL
// y almacenada en un Hardware Security Module (HSM).
const CENSUS_KEY = {
    // Módulo RSA público (N) — Se comparte con todos
    N: process.env.RSA_PUBLIC_MODULUS_HEX
        ? BigInt('0x' + process.env.RSA_PUBLIC_MODULUS_HEX)
        : BigInt('0xd7f2ab1c3e5f7a9b0d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8'),
    // Exponente público (e) — Estándar: 65537
    e: BigInt(65537),
    // Exponente privado (d) — SECRETO ABSOLUTO
    d: process.env.RSA_PRIVATE_EXPONENT_HEX
        ? BigInt('0x' + process.env.RSA_PRIVATE_EXPONENT_HEX)
        : BigInt('0x3a1b4c2d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5')
};

// Mock de base de datos de votantes elegibles
const voterRegistry = new Map();
const votedRegistry = new Set(); // Registro de quienes ya retiraron su papeleta

/**
 * GET /api/censo/public-key
 * Publica la clave pública RSA del Censo para que los votantes puedan cegar sus tokens
 */
router.get('/public-key', (req, res) => {
    res.json({
        n: CENSUS_KEY.N.toString(16),
        e: CENSUS_KEY.e.toString(16)
    });
});

/**
 * POST /api/censo/authorize-ballot
 * 
 * Flujo:
 * 1. El votante se autentica (JWT, biometría, etc.)
 * 2. El votante envía un token CEGADO (la papeleta sellada que no podemos ver)
 * 3. Verificamos su identidad y que no haya votado antes
 * 4. Firmamos el token ciego con nuestra clave privada RSA
 * 5. Marcamos al ciudadano como "Papeleta entregada"
 * 6. Devolvemos la firma ciega
 */
router.post('/authorize-ballot', async (req, res) => {
    try {
        const { blindedTokenHex, voterId } = req.body;

        if (!blindedTokenHex || !voterId) {
            return res.status(400).json({ error: 'Se requiere blindedTokenHex y voterId' });
        }

        // 1. Validar la Identidad del votante
        // En producción: verificar JWT, sesión, o biometría
        // Por ahora, aceptamos cualquier voterId como mock

        // 2. Verificar que no haya votado ya (anti-doble voto)
        if (votedRegistry.has(voterId)) {
            console.warn(`[⚠️ DOBLE VOTO] Intento de ${voterId} de retirar segunda papeleta.`);
            return res.status(403).json({
                error: 'El ciudadano ya retiró su papeleta oficial.',
                code: 'ALREADY_VOTED'
            });
        }

        // 3. Firma ciega RSA: s' = (m')^d mod N
        const mPrime = BigInt('0x' + blindedTokenHex);
        const sPrime = modPow(mPrime, CENSUS_KEY.d, CENSUS_KEY.N);

        // 4. Registrar que este ciudadano ya retiró su papeleta
        votedRegistry.add(voterId);

        console.log(`📝 Papeleta autorizada para votante ${voterId.substring(0, 8)}... (Firma ciega emitida)`);

        // 5. Devolver la firma ciega (el servidor NO SABE qué firmó)
        res.json({
            success: true,
            blindedSignature: sPrime.toString(16),
            message: 'Papeleta autorizada. El Censo NO conoce el contenido de su voto.'
        });

    } catch (error) {
        console.error('Error en la firma ciega:', error);
        res.status(500).json({ error: 'Fallo en la autorización criptográfica de la papeleta.' });
    }
});

/**
 * GET /api/censo/stats
 * Estadísticas públicas del censo (sin revelar identidades)
 */
router.get('/stats', (req, res) => {
    res.json({
        totalRegistered: voterRegistry.size,
        totalBallotsCast: votedRegistry.size,
        participationRate: voterRegistry.size > 0
            ? ((votedRegistry.size / voterRegistry.size) * 100).toFixed(2) + '%'
            : '0%'
    });
});

module.exports = router;
