// server/services/ScrutinyEngine.js
// Motor de Escrutinio Público Verificable con Árbol de Merkle
const crypto = require('crypto');

class ScrutinyEngine {
    /**
     * Utilidad para hacer hashing SHA-256 estándar
     */
    static sha256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Construye un Árbol de Merkle a partir de un array de hashes de votos.
     * 
     * El Árbol de Merkle condensa todos los votos individuales en una única
     * raíz criptográfica. Si se altera, borra o añade un solo voto,
     * la raíz cambia completamente. Esto permite verificación pública.
     * 
     * @param {Array<string>} leaves - Array de hashes SHA-256 de los votos
     * @returns {object} Raíz del árbol y las hojas ordenadas
     */
    static buildMerkleTree(leaves) {
        if (leaves.length === 0) return { root: null, tree: [], leaves: [] };

        // Ordenamos determinísticamente para que el árbol sea reproducible
        // sin importar el orden de llegada a la base de datos
        let currentLevel = [...leaves].sort();
        const tree = [currentLevel];

        while (currentLevel.length > 1) {
            const nextLevel = [];

            for (let i = 0; i < currentLevel.length; i += 2) {
                if (i + 1 < currentLevel.length) {
                    // Hasheamos el par de nodos (Izquierda + Derecha)
                    nextLevel.push(this.sha256(currentLevel[i] + currentLevel[i + 1]));
                } else {
                    // Si hay un número impar de nodos, duplicamos el último consigo mismo
                    nextLevel.push(this.sha256(currentLevel[i] + currentLevel[i]));
                }
            }
            tree.push(nextLevel);
            currentLevel = nextLevel;
        }

        return {
            root: tree[tree.length - 1][0], // El hash maestro final
            tree: tree,                       // Todos los niveles (para pruebas de inclusión)
            leaves: [...leaves].sort()        // Las hojas ordenadas
        };
    }

    /**
     * Genera una Prueba de Inclusión (Merkle Proof) para un recibo específico.
     * Esto permite que un ciudadano demuestre que su voto está incluido
     * en el acta final sin revelar los demás votos.
     * 
     * @param {string} receiptHash - El hash del recibo del votante
     * @param {Array<string>} leaves - Todas las hojas del árbol
     * @returns {Array|null} Array de pares [hash, posición] para la prueba
     */
    static getMerkleProof(receiptHash, leaves) {
        const sortedLeaves = [...leaves].sort();
        let index = sortedLeaves.indexOf(receiptHash);

        if (index === -1) return null; // El recibo no está en el árbol

        const tree = this.buildMerkleTree(leaves).tree;
        const proof = [];

        for (let level = 0; level < tree.length - 1; level++) {
            const currentLevel = tree[level];
            const isRightNode = index % 2 === 1;
            const siblingIndex = isRightNode ? index - 1 : index + 1;

            if (siblingIndex < currentLevel.length) {
                proof.push({
                    hash: currentLevel[siblingIndex],
                    position: isRightNode ? 'left' : 'right'
                });
            }

            index = Math.floor(index / 2);
        }

        return proof;
    }

    /**
     * Ejecuta el escrutinio oficial y genera el Acta Digital Pública.
     * 
     * Este método se ejecuta UNA SOLA VEZ al cerrar la elección.
     * El resultado se publica como archivo JSON estático.
     * 
     * @param {Array} rawVotes - Array de objetos: { hash_recibo, eleccion }
     * @param {string} electionId - Identificador único de la elección
     * @returns {object} El Acta Digital Pública
     */
    static closeElection(rawVotes, electionId = 'PLEBISCITO_2026') {
        const tally = {};
        const voteHashes = [];

        // 1. Contar los votos (El Escrutinio)
        for (const vote of rawVotes) {
            const opcion = vote.eleccion;
            tally[opcion] = (tally[opcion] || 0) + 1;
            voteHashes.push(vote.hash_recibo);
        }

        // 2. Construir la prueba criptográfica (Árbol de Merkle)
        const merkleData = this.buildMerkleTree(voteHashes);

        // 3. Crear el Acta Pública Oficial
        const publicRecord = {
            electionId,
            timestampClosed: new Date().toISOString(),
            totalVotes: rawVotes.length,
            results: tally,
            merkleRoot: merkleData.root,
            // Publicamos todos los recibos anónimos para que cualquiera pueda recalcular el árbol
            allReceipts: merkleData.leaves,
            // Hash del acta misma para integridad
            actaHash: null
        };

        // 4. Calcular el hash del acta completa (auto-referencial)
        publicRecord.actaHash = this.sha256(JSON.stringify({
            electionId: publicRecord.electionId,
            totalVotes: publicRecord.totalVotes,
            results: publicRecord.results,
            merkleRoot: publicRecord.merkleRoot
        }));

        return publicRecord;
    }

    /**
     * Verifica la integridad de un acta publicada.
     * Recalcula la raíz de Merkle y la compara con la publicada.
     * 
     * @param {object} publicRecord - El acta JSON descargada
     * @returns {object} Resultado de la verificación
     */
    static verifyElectionResults(publicRecord) {
        // 1. Recalcular la raíz de Merkle desde los recibos publicados
        const recalculated = this.buildMerkleTree(publicRecord.allReceipts);

        // 2. Verificar que coincida con la raíz publicada
        const rootMatches = recalculated.root === publicRecord.merkleRoot;

        // 3. Verificar que el total de votos coincida
        const totalMatches = publicRecord.allReceipts.length === publicRecord.totalVotes;

        // 4. Verificar que la suma de los resultados coincida con el total
        const tallySum = Object.values(publicRecord.results).reduce((a, b) => a + b, 0);
        const tallyMatches = tallySum === publicRecord.totalVotes;

        return {
            valid: rootMatches && totalMatches && tallyMatches,
            merkleRootValid: rootMatches,
            totalVotesValid: totalMatches,
            tallyConsistent: tallyMatches,
            recalculatedRoot: recalculated.root,
            publishedRoot: publicRecord.merkleRoot
        };
    }
}

module.exports = ScrutinyEngine;
