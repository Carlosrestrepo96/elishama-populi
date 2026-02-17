import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, AlertCircle, Shield, Calendar, Hash, FileSignature } from 'lucide-react';
import { getAuditLog } from '../utils/storage';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'VOTE_CAST'

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const auditData = await getAuditLog();
            // Sort by timestamp descending (newest first)
            const sorted = auditData.sort((a, b) => b.timestamp - a.timestamp);
            setLogs(sorted);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportLogs = () => {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `elishama-audit-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Registro de Auditoría
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Registro inmutable de todas las operaciones del sistema
                    </p>
                </div>
                <button
                    onClick={exportLogs}
                    disabled={logs.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-5 h-5" />
                    Exportar JSON
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total de Registros</p>
                            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Votos Registrados</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {logs.filter(l => l.type === 'VOTE_CAST').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-3 rounded-lg">
                            <FileSignature className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Firmas Digitales</p>
                            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Todos ({logs.length})
                </button>
                <button
                    onClick={() => setFilter('VOTE_CAST')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'VOTE_CAST'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Votos ({logs.filter(l => l.type === 'VOTE_CAST').length})
                </button>
            </div>

            {/* Logs List */}
            {filteredLogs.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-600 mb-2">No hay registros</h3>
                    <p className="text-gray-500">
                        Los votos y operaciones aparecerán aquí cuando se registren.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLogs.map((log, index) => (
                        <motion.div
                            key={log.timestamp}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                {/* Icon */}
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                        {log.type === 'VOTE_CAST' ? 'V' : 'A'}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-grow space-y-3">
                                    {/* Header */}
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {log.type === 'VOTE_CAST' ? 'Voto Registrado' : log.type}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(log.timestamp).toLocaleString('es-CO', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'medium'
                                                })}
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Firmado
                                        </span>
                                    </div>

                                    {/* Vote Data */}
                                    {log.type === 'VOTE_CAST' && log.data && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <p className="text-sm text-gray-600 mb-2">
                                                <span className="font-semibold">Opción seleccionada:</span>
                                            </p>
                                            <p className="text-base font-bold text-gray-900">
                                                {log.data.candidateName}
                                            </p>
                                        </div>
                                    )}

                                    {/* Cryptographic Details */}
                                    <div className="grid grid-cols-1 gap-3 text-xs font-mono">
                                        {/* Hash */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Hash className="w-3 h-3 text-gray-400" />
                                                <span className="text-gray-500 font-semibold uppercase">
                                                    Hash SHA-256
                                                </span>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-gray-200 break-all text-gray-600">
                                                {log.hash}
                                            </div>
                                        </div>

                                        {/* Signature */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileSignature className="w-3 h-3 text-gray-400" />
                                                <span className="text-gray-500 font-semibold uppercase">
                                                    Firma Digital (ECDSA P-256)
                                                </span>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-gray-200 break-all text-gray-600">
                                                {log.signature}
                                            </div>
                                        </div>

                                        {/* Public Key Fingerprint */}
                                        {log.signedBy && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Shield className="w-3 h-3 text-gray-400" />
                                                    <span className="text-gray-500 font-semibold uppercase">
                                                        Firmado por (Clave Pública)
                                                    </span>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-gray-200 break-all text-gray-600">
                                                    {log.signedBy.substring(0, 40)}...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
