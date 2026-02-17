// src/utils/rsaMath.js
// Utilidades matemáticas de precisión arbitraria (BigInt) para Firmas Ciegas RSA
// Versión para el navegador (Frontend)

/**
 * Exponenciación modular eficiente: (base^exp) % mod
 * Usa el método de cuadrados repetidos (square-and-multiply)
 * para evitar overflow en números de 2048+ bits
 */
export function modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;
    if (base === 0n) return 0n;

    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return result;
}

/**
 * Inverso multiplicativo modular usando el Algoritmo de Euclides Extendido
 * Encuentra x tal que: (a * x) % m === 1
 * Usado por el votante para "descegar" la firma del Censo
 */
export function modInverse(a, m) {
    let m0 = m;
    let y = 0n;
    let x = 1n;

    if (m === 1n) return 0n;

    while (a > 1n) {
        const q = a / m;
        let t = m;
        m = a % m;
        a = t;
        t = y;
        y = x - q * y;
        x = t;
    }

    if (x < 0n) x += m0;
    return x;
}

/**
 * Genera un número aleatorio BigInt criptográficamente seguro
 * usando window.crypto.getRandomValues
 * 
 * @param {BigInt} max - Valor máximo (exclusivo)
 * @returns {BigInt} Número aleatorio entre 0 y max
 */
export function randomBigInt(max) {
    const hex = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    return BigInt('0x' + hex) % max;
}
