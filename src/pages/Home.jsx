import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-16 pb-12">
            {/* Hero Section */}
            <section className="text-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent opacity-70"></div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight mb-6">
                        Tu Voz, Tu Poder, <br /> Tu Voto Seguro.
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
                        EliShamaPopuli es la plataforma de participación democrática más segura y transparente.
                        Auditable en tiempo real, encriptada de extremo a extremo.
                    </p>
                    <div className="mt-10 flex justify-center gap-4">
                        <Link to="/vote" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105">
                            Votar Ahora
                        </Link>
                        <Link to="/audit" className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-all">
                            Auditar Sistema
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <motion.section
                className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
            >
                <motion.div variants={itemVariants} className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
                    <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Seguridad Militar</h3>
                    <p className="text-gray-600">
                        Cada voto está protegido con criptografía de curva elíptica. Nadie puede alterar tu decisión.
                    </p>
                </motion.div>

                <motion.div variants={itemVariants} className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
                    <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                        <Eye className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Auditoría Aves de Rapiña</h3>
                    <p className="text-gray-600">
                        Transparencia total. Cualquier ciudadano puede verificar la integridad del sistema usando las claves públicas.
                    </p>
                </motion.div>

                <motion.div variants={itemVariants} className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                        <Shield className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">15 Claves de Seguridad</h3>
                    <p className="text-gray-600">
                        Un sistema distribuido de 15 llaves garantiza que el control nunca esté centralizado.
                    </p>
                </motion.div>
            </motion.section>
        </div>
    );
};

export default Home;
