// services/urn/server.js
// Microservicio de la Urna Anónima — Aislado en su propio contenedor Docker
// Este servicio NO tiene autenticación de usuario. Solo obedece a las matemáticas.
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad
app.use(helmet());
app.use(express.json({ limit: '500kb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos. Anti-bot activado.' },
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

// ---- Clave Pública del Censo (solo N y e) ----
const CENSUS_PUBLIC_KEY = {
    N: process.env.RSA_PUBLIC_MODULUS_HEX
        ? BigInt('0x' + process.env.RSA_PUBLIC_MODULUS_HEX)
        : BigInt('0xd7f2ab1c3e5f7a9b0d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8'),
    e: BigInt(process.env.RSA_PUBLIC_EXPONENT_HEX
        ? '0x' + process.env.RSA_PUBLIC_EXPONENT_HEX
        : '65537')
};

// ---- Merkle Tree Engine ----
function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function buildMerkleTree(leaves) {
    if (leaves.length === 0) return { root: null, leaves: [] };
    let currentLevel = [...leaves].sort();
    const tree = [currentLevel];
    while (currentLevel.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                nextLevel.push(sha256(currentLevel[i] + currentLevel[i + 1]));
            } else {
                nextLevel.push(sha256(currentLevel[i] + currentLevel[i]));
            }
        }
        tree.push(nextLevel);
        currentLevel = nextLevel;
    }
    return { root: tree[tree.length - 1][0], leaves: [...leaves].sort() };
}

// Estado (en producción: PostgreSQL)
const usedTokensDB = new Set();
const votesDB = [];

// ---- Rutas de la Urna ----

// Depositar voto anónimo (SIN autenticación de usuario)
app.post('/api/urna/submit-vote', async (req, res) => {
    try {
        const { voteContent, ballotTokenHex, censusSignatureHex } = req.body;

        if (!voteContent || !ballotTokenHex || !censusSignatureHex) {
            return res.status(400).json({ error: 'Faltan componentes criptográficos.' });
        }

        // 1. Anti-replay
        if (usedTokensDB.has(ballotTokenHex)) {
            console.warn(`[🚨 DOBLE VOTO] Token: ${ballotTokenHex.substring(0, 16)}...`);
            return res.status(409).json({ error: 'Token ya utilizado.', code: 'TOKEN_ALREADY_USED' });
        }

        // 2. Verificación RSA
        const s = BigInt('0x' + censusSignatureHex);
        const m = BigInt('0x' + ballotTokenHex);
        const verification = modPow(s, CENSUS_PUBLIC_KEY.e, CENSUS_PUBLIC_KEY.N);

        if (verification !== m) {
            console.error(`[🚨 FRAUDE] Firma inválida. Token: ${ballotTokenHex.substring(0, 16)}...`);
            return res.status(403).json({ error: 'Firma inválida.', code: 'INVALID_SIGNATURE' });
        }

        // 3. Registrar y quemar token
        usedTokensDB.add(ballotTokenHex);
        const voteHash = sha256(JSON.stringify(voteContent));

        votesDB.push({
            hash_recibo: voteHash,
            eleccion: typeof voteContent === 'object' ? voteContent.choice : voteContent,
            timestamp: Date.now()
        });

        console.log(`✅ Voto depositado. Recibo: ${voteHash.substring(0, 16)}...`);
        res.json({ success: true, receipt: voteHash, voteNumber: votesDB.length });
    } catch (error) {
        console.error('Error en la Urna:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
});

// Estadísticas públicas
app.get('/api/urna/stats', (req, res) => {
    res.json({ totalVotes: votesDB.length, status: 'OPEN', timestamp: Date.now() });
});

// Cerrar elección y generar acta con Merkle Tree
app.post('/api/urna/close-election', (req, res) => {
    try {
        const tally = {};
        const voteHashes = [];

        for (const vote of votesDB) {
            tally[vote.eleccion] = (tally[vote.eleccion] || 0) + 1;
            voteHashes.push(vote.hash_recibo);
        }

        const merkleData = buildMerkleTree(voteHashes);

        const publicRecord = {
            electionId: req.body.electionId || 'PLEBISCITO_2026',
            timestampClosed: new Date().toISOString(),
            totalVotes: votesDB.length,
            results: tally,
            merkleRoot: merkleData.root,
            allReceipts: merkleData.leaves,
            actaHash: sha256(JSON.stringify({ totalVotes: votesDB.length, results: tally, merkleRoot: merkleData.root }))
        };

        console.log(`\n📊 ESCRUTINIO: ${publicRecord.totalVotes} votos | Root: ${publicRecord.merkleRoot}\n`);
        res.json({ success: true, publicRecord });
    } catch (error) {
        console.error('Error en escrutinio:', error);
        res.status(500).json({ error: 'Error al generar acta.' });
    }
});

// Verificar recibo
app.post('/api/urna/verify-receipt', (req, res) => {
    const { receiptHash } = req.body;
    const found = votesDB.find(v => v.hash_recibo === receiptHash);
    res.json({
        verified: !!found,
        message: found ? 'Voto encontrado en la urna.' : 'Recibo no encontrado.',
        ...(found && { voteTimestamp: found.timestamp })
    });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'urn' }));

app.listen(PORT, () => {
    console.log(`🗳️  Urna Anónima corriendo en puerto ${PORT}`);
});
