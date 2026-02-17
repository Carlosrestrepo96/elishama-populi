// server/server.js
// Servidor Principal de EliShama Populi
// Arquitectura: Helmet + Rate Limiting + Verificación Criptográfica
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// 1. HELMET: Seguridad de Cabeceras HTTP
// ============================================================================
// Configura automáticamente más de 10 cabeceras de seguridad críticas.
app.use(helmet({
    // Oculta "X-Powered-By: Express" para no revelar nuestro stack
    hidePoweredBy: true,
    // Fuerza conexiones HTTPS estrictas (HSTS) durante un año
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    // Previene MIME Sniffing
    noSniff: true,
    // Bloquea Clickjacking a nivel de servidor
    frameguard: { action: 'deny' },
    // Referrer Policy estricto
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ============================================================================
// 2. PARSEO Y CORS
// ============================================================================
// Limitar el tamaño del body para evitar ataques de desbordamiento de memoria
// Sin esto, un atacante podría enviar un JSON de 5 GB y colapsar la RAM
app.use(express.json({ limit: '500kb' }));

// CORS configurado para la PWA en desarrollo
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
}));

// ============================================================================
// 3. RATE LIMITING: Prevención de DDoS y Fuerza Bruta
// ============================================================================

// A. Limitador Global (Para toda la API)
// Protege contra escaneos masivos o bots genéricos.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
    max: 100, // Máximo 100 peticiones por IP en esa ventana
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// B. Limitador Estricto Criptográfico (Solo para rutas pesadas en CPU)
// Un votante legítimo solo necesita sincronizar unas pocas veces.
const cryptoSyncLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // Ventana de 1 hora
    max: 10, // Máximo 10 sincronizaciones por hora por IP
    message: { error: 'Límite de sincronización criptográfica excedido.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// C. Limitador para la Urna (Prevención de voto masivo automatizado)
const voteLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // Ventana de 10 minutos
    max: 5, // Máximo 5 intentos de voto por IP cada 10 minutos
    message: { error: 'Demasiados intentos de votación. Anti-bot activado.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// D. Limitador para el Censo (Prevención de fuerza bruta en firmas)
const censusLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // Ventana de 1 hora
    max: 5, // Máximo 5 solicitudes de papeleta por hora por IP
    message: { error: 'Límite de solicitudes de papeleta excedido.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ============================================================================
// 4. RUTAS
// ============================================================================
const auditRoutes = require('./routes/audit');
const censoRoutes = require('./routes/censo');
const urnaRoutes = require('./routes/urna');

// Aplicamos limitadores específicos a rutas sensibles
app.use('/api/audit', cryptoSyncLimiter, auditRoutes);
app.use('/api/censo', censusLimiter, censoRoutes);
app.use('/api/urna', voteLimiter, urnaRoutes);

// ============================================================================
// 5. HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'EliShama Populi - Servidor Electoral',
        timestamp: new Date().toISOString(),
        security: {
            helmet: 'active',
            rateLimiting: 'active',
            ecdsaVerification: 'active',
            rsaBlindSignatures: 'active',
            merkleTreeScrutiny: 'available'
        }
    });
});

// ============================================================================
// 6. MANEJO DE ERRORES GLOBAL
// ============================================================================
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor.',
        // En producción, no revelar detalles del error
        ...(process.env.NODE_ENV !== 'production' && { details: err.message })
    });
});

// 404 para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado.' });
});

// ============================================================================
// 7. INICIALIZACIÓN
// ============================================================================
app.listen(PORT, () => {
    console.log('');
    console.log('🛡️  =============================================');
    console.log('🗳️  EliShama Populi — Servidor Electoral');
    console.log(`🌐  Puerto: ${PORT}`);
    console.log('🔒  Helmet: ACTIVO');
    console.log('🚦  Rate Limiting: ACTIVO');
    console.log('🔐  ECDSA Verification: ACTIVO');
    console.log('✍️   RSA Blind Signatures: ACTIVO');
    console.log('🌳  Merkle Tree Scrutiny: DISPONIBLE');
    console.log('🛡️  =============================================');
    console.log('');
});

module.exports = app;
