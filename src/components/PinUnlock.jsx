import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Shield, AlertCircle, CheckCircle } from 'lucide-react';

const PinUnlock = ({ onUnlock, onCancel, isFirstTime = false }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handlePinChange = (value) => {
        // Solo permitir dígitos
        const sanitized = value.replace(/\D/g, '').slice(0, 6);
        setPin(sanitized);
        setError('');
    };

    const handleConfirmPinChange = (value) => {
        const sanitized = value.replace(/\D/g, '').slice(0, 6);
        setConfirmPin(sanitized);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isFirstTime) {
            // Modo creación de PIN
            if (!showConfirm) {
                if (pin.length < 6) {
                    setError('El PIN debe tener al menos 6 dígitos');
                    return;
                }
                setShowConfirm(true);
                return;
            }

            if (pin !== confirmPin) {
                setError('Los PINs no coinciden');
                setConfirmPin('');
                return;
            }
        } else {
            // Modo desbloqueo
            if (pin.length < 6) {
                setError('Ingresa tu PIN de 6 dígitos');
                return;
            }
        }

        setIsUnlocking(true);
        try {
            await onUnlock(pin);
        } catch (err) {
            setError(err.message || 'PIN incorrecto. Intenta nuevamente.');
            setPin('');
            setConfirmPin('');
            setShowConfirm(false);
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleBack = () => {
        setShowConfirm(false);
        setConfirmPin('');
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        {isFirstTime ? (
                            <Shield className="w-10 h-10 text-white" />
                        ) : (
                            <Lock className="w-10 h-10 text-white" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isFirstTime ? 'Protege tu Bóveda' : 'Desbloquear Bóveda'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {isFirstTime
                            ? showConfirm
                                ? 'Confirma tu PIN de seguridad'
                                : 'Crea un PIN de 6 dígitos para proteger tus claves'
                            : 'Ingresa tu PIN para acceder a las claves de votación'
                        }
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <AnimatePresence mode="wait">
                        {!showConfirm ? (
                            <motion.div
                                key="pin"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {isFirstTime ? 'Nuevo PIN' : 'PIN de Seguridad'}
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={pin}
                                    onChange={(e) => handlePinChange(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    autoFocus
                                    maxLength={6}
                                />
                                <div className="flex justify-center gap-2 mt-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full transition-all ${i < pin.length
                                                    ? 'bg-blue-600 scale-110'
                                                    : 'bg-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="confirm"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirmar PIN
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={confirmPin}
                                    onChange={(e) => handleConfirmPinChange(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    autoFocus
                                    maxLength={6}
                                />
                                <div className="flex justify-center gap-2 mt-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full transition-all ${i < confirmPin.length
                                                    ? 'bg-green-600 scale-110'
                                                    : 'bg-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Security Info */}
                    {isFirstTime && !showConfirm && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Protección PBKDF2</p>
                                    <p className="text-blue-700">
                                        Tu PIN se procesará con 100,000 iteraciones de PBKDF2 para derivar una clave de cifrado de nivel militar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                        {showConfirm && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Atrás
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isUnlocking || (showConfirm ? confirmPin.length < 6 : pin.length < 6)}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                            {isUnlocking ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Procesando...
                                </>
                            ) : showConfirm ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Crear Bóveda
                                </>
                            ) : (
                                <>
                                    <Unlock className="w-5 h-5" />
                                    {isFirstTime ? 'Continuar' : 'Desbloquear'}
                                </>
                            )}
                        </button>
                    </div>

                    {onCancel && !isFirstTime && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                </form>
            </motion.div>
        </div>
    );
};

export default PinUnlock;
