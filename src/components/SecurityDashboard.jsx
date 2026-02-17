import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { Shield, Key, CheckCircle, AlertTriangle, RefreshCw, FileText, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import Tooltip from './Tooltip';

const SecurityDashboard = () => {
    const { keys, isInitialized, isLoading, generateSystemKeys } = useSecurity();
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        await generateSystemKeys();
        setGenerating(false);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                    <Shield className="w-10 h-10 text-blue-600" />
                    Panel de Seguridad "Aves de Rapiña"
                    <Tooltip content="Sistema de 15 claves criptográficas distribuidas para garantizar la integridad de cada voto" position="bottom">
                        <Info className="w-5 h-5 text-gray-400 hover:text-blue-600 cursor-help transition-colors" />
                    </Tooltip>
                </h2>
                <p className="mt-2 text-gray-600">
                    Estado del sistema criptográfico y gestión de claves.
                </p>
            </div>

            {!isInitialized ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center"
                >
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sistema No Inicializado</h3>
                    <p className="text-gray-600 mb-6">
                        Es necesario generar las 15 claves criptográficas maestras para activar el sistema de auditoría.
                    </p>
                    <Tooltip content="Genera 15 pares de claves ECDSA P-256 usando la API Web Crypto. Este proceso toma unos segundos." position="top">
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:scale-100"
                        >
                            {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                            {generating ? 'Generando Claves...' : 'Generar 15 Claves Maestras'}
                        </button>
                    </Tooltip>
                </motion.div>
            ) : (
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-50 p-6 rounded-2xl border border-green-200 flex items-center gap-4"
                    >
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-green-800">Sistema Seguro y Activo</h3>
                            <p className="text-green-700">Las 15 claves criptográficas están generadas y almacenadas localmente.</p>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {keys.map((k, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow"
                            >
                                <div className="bg-gray-100 p-2 rounded-lg text-gray-500 font-mono text-xs">
                                    #{i + 1}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-gray-400 font-semibold uppercase">Fingerprint (Public Key)</p>
                                    <p className="text-xs font-mono text-gray-600 truncate">
                                        {k.publicKey.x ? k.publicKey.x.substring(0, 20) + '...' : 'EC-P256-SHA256'}
                                    </p>
                                </div>
                                <div className="ml-auto">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Audit Logs Button */}
                    <div className="flex justify-center mt-8">
                        <Link
                            to="/audit/logs"
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                        >
                            <FileText className="w-5 h-5" />
                            Ver Registro de Auditoría
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityDashboard;
