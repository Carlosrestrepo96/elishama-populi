// src/utils/crypto.js

/**
 * Generates a single ECDSA P-256 key pair.
 * @returns {Promise<CryptoKeyPair>} The generated key pair.
 */
export const generateKeyPair = async () => {
    return await window.crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true, // whether the key is extractable (i.e. can be exported)
        ["sign", "verify"] // can be used to sign and verify signatures
    );
};

/**
 * Generates a set of N key pairs.
 * @param {number} count Number of keys to generate.
 * @returns {Promise<Array<CryptoKeyPair>>} Array of key pairs.
 */
export const generateKeySet = async (count = 15) => {
    const keyPromises = [];
    for (let i = 0; i < count; i++) {
        keyPromises.push(generateKeyPair());
    }
    return await Promise.all(keyPromises);
};

/**
 * Exports a key to JWK format for storage.
 * @param {CryptoKey} key 
 * @returns {Promise<JsonWebKey>}
 */
export const exportKey = async (key) => {
    return await window.crypto.subtle.exportKey("jwk", key);
};

/**
 * Imports a key from JWK format.
 * @param {JsonWebKey} jwk 
 * @param {string} type 'public' or 'private'
 * @returns {Promise<CryptoKey>}
 */
export const importKey = async (jwk, type) => {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true,
        type === 'private' ? ["sign"] : ["verify"]
    );
};

/**
 * Signs data using a private key.
 * @param {CryptoKey} privateKey 
 * @param {string} data 
 * @returns {Promise<string>} Base64 encoded signature.
 */
export const signData = async (privateKey, data) => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const signature = await window.crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: { name: "SHA-256" },
        },
        privateKey,
        encodedData
    );
    return arrayBufferToBase64(signature);
};

// Helper: ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
