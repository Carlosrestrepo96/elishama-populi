import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, Key, FileText, ArrowRight, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
    const steps = [
        {
            icon: Key,
            title: 'Generación de Claves',
            description: 'El sistema genera 15 pares de claves ECDSA P-256 usando la API Web Crypto nativa del navegador.',
            technical: 'ECDSA (Elliptic Curve Digital Signature Algorithm) con curva P-256 es el mismo estándar usado por Bitcoin y sistemas bancarios.',
            color: 'from-blue-500 to-indigo-600'
        },
        {
            icon: Lock,
            title: 'Protección con PIN',
            description: 'Tu PIN se convierte en una clave maestra usando PBKDF2 con 100,000 iteraciones.',
            technical: 'PBKDF2 (Password-Based Key Derivation Function 2) hace que los ataques de fuerza bruta sean computacionalmente imposibles.',
            color: 'from-purple-500 to-pink-600'
        },
        {
            icon: Database,
            title: 'Almacenamiento Cifrado',
            description: 'Las claves privadas se cifran con AES-GCM y se guardan en IndexedDB de tu navegador.',
            technical: 'AES-GCM de 256 bits es el estándar de cifrado usado por la NSA para información clasificada.',
            color: 'from-green-500 to-teal-600'
        },
        {
            icon: FileText,
            title: 'Firma Digital',
            description: 'Cada voto se firma criptográficamente, creando una prueba matemática de autenticidad.',
            technical: 'La firma ECDSA garantiza que nadie puede modificar tu voto sin invalidar la firma digital.',
            color: 'from-orange-500 to-red-600'
        },
        {
            icon: Eye,
            title: 'Auditoría Transparente',
            description: 'Todos los votos firmados se registran en un log inmutable que cualquiera puede verificar.',
            technical: 'El hash SHA-256 de cada voto crea una cadena de integridad imposible de alterar retroactivamente.',
            color: 'from-cyan-500 to-blue-600'
        }
    ];

    const securityFeatures = [
        {
            title: 'Claves No Exportables',
            description: 'Las claves privadas nunca salen de tu dispositivo',
            icon: Shield
        },
        {
            title: 'Protección XSS',
            description: 'Content Security Policy bloquea scripts maliciosos',
            icon: Lock
        },
        {
            title: 'Sin Servidor Central',
            description: 'Todo funciona offline en tu navegador',
            icon: Database
        }
    ];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-16 pb-16">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
                    ¿Cómo Funciona EliShama?
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Una explicación técnica pero accesible del sistema de votación más seguro del mundo
                </p>
            </motion.div>

            {/* Process Steps */}
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                    El Proceso de Votación Segura
                </h2>

                {steps.map((step, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row items-start gap-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                                <step.icon className="w-8 h-8 text-white" />
                            </div>

                            {/* Content */}
                            <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-sm font-bold text-gray-400">PASO {index + 1}</span>
                                    <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                                </div>
                                <p className="text-gray-700 text-lg mb-4">{step.description}</p>
                                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold text-gray-800">💡 Detalle técnico:</span> {step.technical}
                                    </p>
                                </div>
                            </div>

                            {/* Arrow */}
                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute -bottom-8 left-1/2 -translate-x-1/2">
                                    <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Security Features */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 md:p-12 rounded-2xl border border-blue-100">
                <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                    Características de Seguridad
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {securityFeatures.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white p-6 rounded-xl shadow-md"
                        >
                            <feature.icon className="w-10 h-10 text-blue-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                            <p className="text-gray-600">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Comparison */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                    EliShama vs. Votación Tradicional
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Traditional */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-red-600 mb-4">❌ Votación Tradicional</h3>
                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span>Urnas físicas pueden ser manipuladas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span>Conteo manual propenso a errores</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span>Difícil auditar después del evento</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span>Requiere confianza ciega en autoridades</span>
                            </li>
                        </ul>
                    </div>

                    {/* EliShama */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-green-600 mb-4">✅ EliShama Populi</h3>
                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Firmas digitales imposibles de falsificar</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Conteo automático y verificable</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Auditoría permanente en tiempo real</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Verificación matemática, no confianza</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 p-12 rounded-2xl shadow-2xl"
            >
                <h2 className="text-3xl font-bold text-white mb-4">
                    ¿Listo para Participar?
                </h2>
                <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                    Únete a la revolución democrática. Tu voto, tu poder, tu seguridad.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/audit"
                        className="px-8 py-4 bg-white text-blue-600 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                        Generar Claves de Seguridad
                    </Link>
                    <Link
                        to="/vote"
                        className="px-8 py-4 bg-blue-500 text-white font-bold rounded-full shadow-lg hover:bg-blue-400 hover:scale-105 transition-all"
                    >
                        Ir a Votar
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default HowItWorks;
