// server/services/cryptoValidator.js
// Validador criptográfico ECDSA para verificar bloques de la AuditChain
const crypto = require('crypto');

class CryptoValidator {
    /**
     * Convierte una llave pública JWK (del frontend Web Crypto API) 
     * a un formato nativo de Node.js para verificación
     */
    static importJwkToNode(jwk) {
        return crypto.createPublicKey({
            key: jwk,
            format: 'jwk'
        });
    }

    /**
     * Verifica una firma ECDSA P-256 contra un payload y una clave pública JWK.
     * 
     * Esta es la función nuclear del backend: si retorna false, el bloque fue
     * manipulado en tránsito o no fue firmado por el dueño legítimo de la clave.
     * 
     * @param {object} payload - Los datos del bloque (sin la firma ni el hash)
     * @param {Array} signatureArray - La firma ECDSA como array de bytes
     * @param {object} publicKeyJwk - La clave pública JWK del firmante
     * @returns {boolean} true si la firma es matemáticamente válida
     */
    static verifySignature(payload, signatureArray, publicKeyJwk) {
        try {
            const publicKey = this.importJwkToNode(publicKeyJwk);

            // Reconstruimos el payload exactamente como lo hizo el frontend
            const payloadString = JSON.stringify(payload);

            // Convertimos el array de bytes de vuelta a un Buffer
            const signatureBuffer = Buffer.from(signatureArray);

            // Verificamos usando el mismo algoritmo que Web Crypto: ECDSA con SHA-256
            const isValid = crypto.verify(
                'SHA256',
                Buffer.from(payloadString),
                {
                    key: publicKey,
                    dsaEncoding: 'ieee-p1363' // Web Crypto usa formato IEEE P1363, no DER
                },
                signatureBuffer
            );

            return isValid;
        } catch (error) {
            console.error("Error al verificar la firma ECDSA:", error.message);
            return false;
        }
    }

    /**
     * Calcula el hash SHA-256 de un objeto (misma lógica que AuditChain.hashData en el frontend)
     */
    static hashData(data) {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Verifica la integridad de una cadena completa de bloques
     * @param {Array} blocks - Array ordenado de bloques
     * @returns {object} Resultado de la verificación
     */
    static verifyChain(blocks) {
        const errors = [];

        for (let i = 1; i < blocks.length; i++) {
            const current = blocks[i];
            const previous = blocks[i - 1];

            // Verificar eslabón de la cadena
            if (current.previousHash !== previous.hash) {
                errors.push({
                    type: 'CHAIN_BREAK',
                    blockIndex: i,
                    message: `Eslabón roto entre bloque ${i - 1} y ${i}`
                });
            }
        }

        return {
            valid: errors.length === 0,
            blockCount: blocks.length,
            errors
        };
    }
}

module.exports = CryptoValidator;
