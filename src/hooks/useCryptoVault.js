// hooks/useCryptoVault.js
import { openDB } from 'idb';

const DB_NAME = 'EliShama_SecureVault_v3';
const STORE_NAME = 'keys';
const CONFIG_STORE = 'config'; // Para guardar el salt no secreto

export class CryptoVault {
    constructor() {
        this.db = null;
        this.kek = null; // Key Encryption Key (Derivada del PIN, vive solo en RAM)
    }

    async initialize() {
        this.db = await openDB(DB_NAME, 1, {
            upgrade(db) {
                // Almacén para las claves de votación
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                // Almacén para configuraciones públicas (como el salt de PBKDF2)
                if (!db.objectStoreNames.contains(CONFIG_STORE)) {
                    db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
                }
            },
        });
    }

    /**
     * Paso 1: El usuario ingresa su PIN de 6 dígitos (o contraseña).
     * Derivamos una clave AES-GCM (la KEK) usando PBKDF2.
     */
    async unlockVault(pin) {
        const encoder = new TextEncoder();

        // Recuperar o generar el Salt (el salt NO es un secreto, previene ataques de diccionario/rainbow tables)
        let saltRecord = await this.db.get(CONFIG_STORE, 'pbkdf2_salt');
        let salt;

        if (!saltRecord) {
            salt = window.crypto.getRandomValues(new Uint8Array(16));
            await this.db.put(CONFIG_STORE, { key: 'pbkdf2_salt', value: salt });
        } else {
            salt = saltRecord.value;
        }

        // Importar el PIN como material criptográfico base
        const pinKeyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(pin),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        // Derivar la Key Encryption Key (KEK) a 256 bits
        // Incluimos encrypt/decrypt para el Shadow Vault de AuditChain
        this.kek = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000, // 100k iteraciones es un buen balance de seguridad/rendimiento en móviles
                hash: 'SHA-256'
            },
            pinKeyMaterial,
            { name: 'AES-GCM', length: 256 },
            false, // CRÍTICO: La KEK nunca se puede exportar de la RAM
            ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
        );

        return true; // Bóveda desbloqueada para la sesión actual
    }

    /**
     * Paso 2: Generar la clave de votación ECDSA y envolverla inmediatamente.
     */
    async generateAndStoreKeyPair(keyId) {
        if (!this.kek) throw new Error("Bóveda bloqueada. El usuario debe ingresar el PIN primero.");

        // Generamos la clave. Debe ser 'extractable: true' SOLO para permitir el wrapKey inicial.
        const keyPair = await window.crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['sign', 'verify']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // Envolver (cifrar) la clave privada nativamente
        const wrappedPrivateKey = await window.crypto.subtle.wrapKey(
            'pkcs8',
            keyPair.privateKey,
            this.kek,
            { name: 'AES-GCM', iv: iv }
        );

        // La pública sí la guardamos en JWK para compartirla fácil con el servidor
        const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

        const payload = {
            id: keyId,
            publicKey: publicKeyJwk,
            wrappedPrivateKey: wrappedPrivateKey, // ArrayBuffer cifrado
            iv: iv, // Necesitamos el IV para desenvolverla después
            createdAt: Date.now(),
            usageCount: 0
        };

        await this.db.put(STORE_NAME, payload);

        return publicKeyJwk; // Retornamos la clave pública para mostrarla en el UI
    }

    /**
     * Paso 3: Recuperar y desenvolver la clave cuando el usuario va a votar.
     */
    async getPrivateKeyForSigning(keyId) {
        if (!this.kek) throw new Error("Bóveda bloqueada. Sesión expirada o PIN no ingresado.");

        const record = await this.db.get(STORE_NAME, keyId);
        if (!record) throw new Error("Clave de votación no encontrada en IndexedDB.");

        // Desenvolvemos la clave
        const privateKey = await window.crypto.subtle.unwrapKey(
            'pkcs8',
            record.wrappedPrivateKey,
            this.kek, // Usamos nuestra KEK derivada del PIN
            { name: 'AES-GCM', iv: record.iv },
            { name: 'ECDSA', namedCurve: 'P-256' },
            false, // ¡MAGIA AQUÍ!: Al desenvolverla, la marcamos como 'extractable: false'. 
            ['sign'] // Ya nadie puede sacarla de la memoria RAM.
        );

        // Incrementar contador de uso (para tu sistema de rotación)
        record.usageCount += 1;
        await this.db.put(STORE_NAME, record);

        return privateKey; // Retorna un objeto CryptoKey listo para usar con subtle.sign()
    }

    /**
     * Cifrado simétrico con AES-GCM usando la KEK.
     * Usado por AuditChain para cifrar los estados anteriores (Shadow Vault / Evidencia).
     */
    async encryptSymmetric(plaintext) {
        if (!this.kek) throw new Error("Bóveda bloqueada. No se puede cifrar sin la KEK.");

        const encoder = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            this.kek,
            encoder.encode(plaintext)
        );

        return { ciphertext, iv };
    }

    /**
     * Descifrado simétrico con AES-GCM usando la KEK.
     * Usado para recuperar evidencia histórica del Shadow Vault.
     */
    async decryptSymmetric(ciphertext, iv) {
        if (!this.kek) throw new Error("Bóveda bloqueada. No se puede descifrar sin la KEK.");

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            this.kek,
            new Uint8Array(ciphertext).buffer
        );

        return new TextDecoder().decode(decrypted);
    }

    /**
     * Obtener todas las claves públicas (para mostrar en el dashboard)
     */
    async getAllPublicKeys() {
        if (!this.db) await this.initialize();
        const allRecords = await this.db.getAll(STORE_NAME);
        return allRecords.map(record => ({
            id: record.id,
            publicKey: record.publicKey,
            createdAt: record.createdAt,
            usageCount: record.usageCount
        }));
    }

    /**
     * Verificar si la bóveda está desbloqueada
     */
    isUnlocked() {
        return this.kek !== null;
    }

    /**
     * Verificar si existen claves en la bóveda
     */
    async hasKeys() {
        if (!this.db) await this.initialize();
        const count = await this.db.count(STORE_NAME);
        return count > 0;
    }

    // Método para limpiar la KEK cuando el usuario cierra la app o pasa tiempo inactivo
    lockVault() {
        this.kek = null;
    }
}

// Exportar una instancia singleton
export const cryptoVault = new CryptoVault();
