import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, User, FileText, Lock } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { signData, exportKey } from '../utils/crypto';
import { appendAuditLog } from '../utils/storage';

const CANDIDATES = [
    { id: 1, name: 'Opción A: Transparencia Total', color: 'bg-blue-500' },
    { id: 2, name: 'Opción B: Innovación Tecnológica', color: 'bg-indigo-500' },
    { id: 3, name: 'Opción C: Seguridad Ciudadana', color: 'bg-purple-500' },
    { id: 4, name: 'Voto en Blanco', color: 'bg-gray-400' },
];

const Vote = () => {
    const { keys, isInitialized } = useSecurity();
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isVoting, setIsVoting] = useState(false);
    const [voteReceipt, setVoteReceipt] = useState(null);

    const handleVote = async () => {
        if (!selectedCandidate || !isInitialized) return;

        setIsVoting(true);

        try {
            // 1. Create Vote Payload
            const voteData = {
                candidateId: selectedCandidate.id,
                candidateName: selectedCandidate.name,
                timestamp: Date.now(),
                voterDeviceId: crypto.randomUUID(), // Anonymous unique ID for this session
            };

            // 2. Sign with the first system key (acting as the notarizing node for this demo)
            // In a real multi-sig scenario, this might wait for other verifiers.
            // We'll use Key #1 for signing votes in this single-node demo.
            const signingKey = keys[0];

            // We need to re-import the key from the JWK to use it for signing
            const cryptoKey = await window.crypto.subtle.importKey(
                "jwk",
                signingKey.privateKey,
                { name: "ECDSA", namedCurve: "P-256" },
                true,
                ["sign"]
            );

            const payloadString = JSON.stringify(voteData);
            const signature = await signData(cryptoKey, payloadString);

            // 3. Create Audit Entry
            const auditEntry = {
                type: 'VOTE_CAST',
                data: voteData,
                signature: signature,
                signedBy: signingKey.publicKey.x, // Public key ID/Fingerprint
                hash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadString))
                    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))
            };

            // 4. Store in Immutable Log
            await appendAuditLog(auditEntry);

            setVoteReceipt(auditEntry);
        } catch (error) {
            console.error("Voting failed:", error);
            alert("Error al procesar el voto seguro.");
        } finally {
            setIsVoting(false);
        }
    };

    const resetVote = () => {
        setSelectedCandidate(null);
        setVoteReceipt(null);
    }

    if (!isInitialized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Lock className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-600">Sistema Bloqueado</h2>
                <p className="text-gray-500 mt-2">Debes inicializar las llaves de seguridad en "Auditoría" antes de poder votar.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <AnimatePresence mode='wait'>
                {!voteReceipt ? (
                    <motion.div
                        key="ballot"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-extrabold text-gray-900">Urna Digital Segura</h2>
                            <p className="text-gray-600">Seleccione su opción de preferencia. Su voto será firmado digitalmente.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {CANDIDATES.map((candidate) => (
                                <motion.button
                                    key={candidate.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedCandidate(candidate)}
                                    className={`p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 shadow-sm
                    ${selectedCandidate?.id === candidate.id
                                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                                            : 'border-gray-200 bg-white hover:border-blue-300'}`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-md ${candidate.color}`}>
                                        {candidate.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold ${selectedCandidate?.id === candidate.id ? 'text-blue-900' : 'text-gray-800'}`}>
                                            {candidate.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">Candidato ID: #{candidate.id}</p>
                                    </div>
                                    {selectedCandidate?.id === candidate.id && (
                                        <div className="ml-auto text-blue-600">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex justify-center mt-12">
                            <button
                                onClick={handleVote}
                                disabled={!selectedCandidate || isVoting}
                                className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3"
                            >
                                {isVoting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Encriptando Voto...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        Emitir Voto Seguro
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="receipt"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>

                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 from-green-200 to-green-50 bg-gradient-to-br shadow-inner">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">¡Voto Registrado!</h2>
                            <p className="text-gray-500 text-sm mt-1">Su participación ha sido auditada y asegurada.</p>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4 text-left font-mono text-xs text-gray-600 mb-8 overflow-hidden">
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span>Timestamp:</span>
                                <span className="text-gray-900">{new Date(voteReceipt.data.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span>Opción:</span>
                                <span className="text-gray-900 font-bold">{voteReceipt.data.candidateName}</span>
                            </div>
                            <div>
                                <span className="block mb-1">Firma Digital (ECDSA):</span>
                                <div className="break-all bg-white p-2 border rounded text-[10px] leading-tight text-gray-400">
                                    {voteReceipt.signature}
                                </div>
                            </div>
                            <div>
                                <span className="block mb-1">Hash SHA-256:</span>
                                <div className="break-all bg-white p-2 border rounded text-[10px] leading-tight text-gray-400">
                                    {voteReceipt.hash}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={resetVote}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Votar Nuevamente (Demo)
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Vote;
