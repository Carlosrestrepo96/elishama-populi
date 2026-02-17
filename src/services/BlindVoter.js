// src/services/BlindVoter.js
// Cliente de Firmas Ciegas RSA para voto anónimo
// 
// Flujo completo:
// 1. Obtener clave pública del Censo
// 2. Generar y cegar el token (papeleta sellada)
// 3. Enviar al Censo para firma ciega
// 4. Descegar la firma en el dispositivo del votante
// 5. Enviar voto + token + firma a la Urna anónima

import { modPow, modInverse, randomBigInt } from '../utils/rsaMath';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class BlindVoter {
    constructor() {
        this.N = null;          // Módulo RSA público del Censo
        this.e = null;          // Exponente público del Censo
        this.r = null;          // Factor de cegado (secreto y efímero)
        this.originalToken = null;
        this.receipt = null;    // Recibo del voto (hash SHA-256)
    }

    /**
     * Paso 0: Obtener la clave pública del Censo
     */
    async fetchCensusPublicKey() {
        try {
            const response = await fetch(`${API_BASE}/censo/public-key`);
            const data = await response.json();
            this.N = BigInt('0x' + data.n);
            this.e = BigInt('0x' + data.e);
            return true;
        } catch (error) {
            console.error('Error al obtener clave pública del Censo:', error);
            throw new Error('No se pudo conectar con el servidor de Censo.');
        }
    }

    /**
     * Paso 1: Generar y cegar el token (la papeleta sellada)
     * 
     * El Censo NUNCA verá este token original. Solo recibirá una versión
     * matemáticamente "enmascarada" que no puede revertir.
     * 
     * @returns {string} Token cegado en hexadecimal para enviar al Censo
     */
    createBlindedToken() {
        if (!this.N || !this.e) {
            throw new Error('Primero debes obtener la clave pública del Censo.');
        }

        // 1. Generamos un token de votación único (Papeleta en blanco)
        const tokenHex = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        this.originalToken = BigInt('0x' + tokenHex);

        // 2. Generamos el factor de cegado aleatorio (r) co-primo con N
        this.r = randomBigInt(this.N);

        // 3. Calculamos: m' = (m * r^e) mod N
        const rPowE = modPow(this.r, this.e, this.N);
        const blindedMessage = (this.originalToken * rPowE) % this.N;

        // Retornamos el mensaje ciego para enviarlo al backend
        return blindedMessage.toString(16);
    }

    /**
     * Paso 2: Solicitar al Censo que firme el token cegado
     * 
     * @param {string} voterId - Identificador del votante (para verificar elegibilidad)
     * @returns {string} Firma ciega en hexadecimal
     */
    async requestBlindSignature(voterId) {
        const blindedTokenHex = this.createBlindedToken();

        try {
            const response = await fetch(`${API_BASE}/censo/authorize-ballot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blindedTokenHex, voterId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al solicitar la firma ciega.');
            }

            const data = await response.json();
            return data.blindedSignature;

        } catch (error) {
            console.error('Error en la solicitud de firma ciega:', error);
            throw error;
        }
    }

    /**
     * Paso 3: Descegar la firma del Censo
     * 
     * El resultado es una firma RSA válida sobre el token original,
     * aunque el Censo nunca vio ese token.
     * 
     * @param {string} blindedSignatureHex - Firma ciega del Censo
     * @returns {object} Token original + firma descegada
     */
    unblindSignature(blindedSignatureHex) {
        if (!this.r || !this.originalToken) {
            throw new Error('No hay token activo. Debes crear uno primero.');
        }

        const sPrime = BigInt('0x' + blindedSignatureHex);

        // 1. Calculamos el inverso de r: r^-1 mod N
        const rInverse = modInverse(this.r, this.N);

        // 2. Descegamos: s = (s' * r^-1) mod N
        const signature = (sPrime * rInverse) % this.N;

        // Factor de cegado destruido — no se puede reutilizar
        this.r = null;

        return {
            token: this.originalToken.toString(16),
            signature: signature.toString(16)
        };
    }

    /**
     * Paso 4: Depositar el voto en la Urna Anónima
     * 
     * @param {object} voteContent - El contenido del voto (ej. { choice: 'Candidato A' })
     * @param {string} voterId - Para obtener la firma ciega del Censo
     * @returns {object} Resultado del voto con recibo
     */
    async castVote(voteContent, voterId) {
        // 1. Obtener clave pública del Censo
        await this.fetchCensusPublicKey();

        // 2. Solicitar firma ciega al Censo
        const blindedSignature = await this.requestBlindSignature(voterId);

        // 3. Descegar la firma localmente
        const { token, signature } = this.unblindSignature(blindedSignature);

        // 4. Enviar el voto a la Urna (SIN autenticación de usuario)
        try {
            const response = await fetch(`${API_BASE}/urna/submit-vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voteContent,
                    ballotTokenHex: token,
                    censusSignatureHex: signature
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al depositar el voto.');
            }

            const result = await response.json();
            this.receipt = result.receipt;

            // Limpiar el token original de la memoria
            this.originalToken = null;

            return result;

        } catch (error) {
            console.error('Error al depositar el voto:', error);
            throw error;
        }
    }

    /**
     * Paso 5: Verificar que el voto fue contado
     * 
     * @param {string} receiptHash - El recibo guardado del paso anterior
     * @returns {object} Resultado de la verificación
     */
    async verifyReceipt(receiptHash) {
        try {
            const response = await fetch(`${API_BASE}/urna/verify-receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiptHash: receiptHash || this.receipt })
            });

            return await response.json();
        } catch (error) {
            console.error('Error al verificar el recibo:', error);
            throw new Error('No se pudo verificar el recibo contra el servidor.');
        }
    }

    /**
     * Obtener el recibo guardado
     */
    getReceipt() {
        return this.receipt;
    }
}
