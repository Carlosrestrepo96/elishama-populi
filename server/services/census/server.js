// services/census/server.js
// Microservicio del Censo Electoral — Aislado en su propio contenedor Docker
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad
app.use(helmet());
app.use(express.json({ limit: '500kb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { error: 'Límite de solicitudes excedido.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// ---- Utilidades RSA ----
function modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;
    if (base === 0n) return 0n;
    while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return result;
}

// ---- Clave RSA del Censo ----
const CENSUS_KEY = {
    N: process.env.RSA_PUBLIC_MODULUS_HEX
        ? BigInt('0x' + process.env.RSA_PUBLIC_MODULUS_HEX)
        : BigInt('0xd7f2ab1c3e5f7a9b0d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8'),
    e: BigInt(process.env.RSA_PUBLIC_EXPONENT_HEX
        ? '0x' + process.env.RSA_PUBLIC_EXPONENT_HEX
        : '65537'),
    d: process.env.RSA_PRIVATE_EXPONENT_HEX
        ? BigInt('0x' + process.env.RSA_PRIVATE_EXPONENT_HEX)
        : BigInt('0x3a1b4c2d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5')
};

// Estado (en producción: PostgreSQL)
const votedRegistry = new Set();

// ---- Rutas ----

// Clave pública del Censo (pública)
app.get('/api/censo/public-key', (req, res) => {
    res.json({
        n: CENSUS_KEY.N.toString(16),
        e: CENSUS_KEY.e.toString(16)
    });
});

// Firma ciega de papeletas
app.post('/api/censo/authorize-ballot', async (req, res) => {
    try {
        const { blindedTokenHex, voterId } = req.body;

        if (!blindedTokenHex || !voterId) {
            return res.status(400).json({ error: 'Se requiere blindedTokenHex y voterId' });
        }

        if (votedRegistry.has(voterId)) {
            return res.status(403).json({
                error: 'El ciudadano ya retiró su papeleta oficial.',
                code: 'ALREADY_VOTED'
            });
        }

        const mPrime = BigInt('0x' + blindedTokenHex);
        const sPrime = modPow(mPrime, CENSUS_KEY.d, CENSUS_KEY.N);

        votedRegistry.add(voterId);
        console.log(`📝 Papeleta autorizada para ${voterId.substring(0, 8)}...`);

        res.json({
            success: true,
            blindedSignature: sPrime.toString(16),
            message: 'Papeleta autorizada. El Censo NO conoce el contenido de su voto.'
        });
    } catch (error) {
        console.error('Error en firma ciega:', error);
        res.status(500).json({ error: 'Fallo en la autorización criptográfica.' });
    }
});

// Estadísticas (sin identidades)
app.get('/api/censo/stats', (req, res) => {
    res.json({
        totalBallotsCast: votedRegistry.size,
        status: 'operational'
    });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'census' }));

app.listen(PORT, () => {
    console.log(`🏛️  Censo Electoral corriendo en puerto ${PORT}`);
});
