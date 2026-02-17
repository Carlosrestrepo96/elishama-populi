import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import SecurityDashboard from './components/SecurityDashboard';
import Vote from './pages/Vote';
import AuditLogs from './pages/AuditLogs';
import HowItWorks from './pages/HowItWorks';
import { SecuritySentinel } from './utils/SecuritySentinel';
import { AlertTriangle, Shield } from 'lucide-react';

import { SecurityProvider } from './context/SecurityContext';

function App() {
  const [securityStatus, setSecurityStatus] = useState('checking');
  const [auditResult, setAuditResult] = useState(null);

  useEffect(() => {
    const runAudit = async () => {
      try {
        const result = await SecuritySentinel.performSecurityAudit();
        console.log(SecuritySentinel.formatReport(result));
        setAuditResult(result);

        if (!result.isSafe) {
          console.error("⚠️ Entorno comprometido detectado:", result.details);
          setSecurityStatus('blocked');
        } else {
          setSecurityStatus('safe');
        }
      } catch (error) {
        console.error('Error en auditoría de seguridad:', error);
        // Ante un error en la auditoría, permitimos el acceso (evitar falsos positivos)
        setSecurityStatus('safe');
      }
    };

    runAudit();
  }, []);

  // Pantalla de bloqueo por entorno comprometido
  if (securityStatus === 'blocked') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-red-50 to-red-100 p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center border-2 border-red-200">
          <AlertTriangle className="text-red-600 w-16 h-16 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-red-800 mb-3">Acceso Denegado por Seguridad</h1>
          <p className="text-red-600 mb-4">
            Hemos detectado un entorno no seguro (posible emulador, dispositivo modificado o navegador automatizado).
          </p>
          <p className="text-gray-600 text-sm mb-6">
            Para garantizar la transparencia del proceso electoral, esta aplicación solo puede ejecutarse en dispositivos físicos verificados.
          </p>
          <div className="bg-red-50 p-4 rounded-lg text-left text-sm text-red-700">
            <p className="font-semibold mb-2">Detalles de la auditoría:</p>
            <ul className="space-y-1">
              {auditResult?.details?.isHeadless && <li>• Navegador automatizado detectado</li>}
              {auditResult?.details?.isEmulator && <li>• Emulador o máquina virtual detectada</li>}
              {auditResult?.details?.hasSuspiciousHardware && <li>• Hardware anómalo detectado</li>}
            </ul>
            <p className="mt-2 text-xs text-red-500">
              Puntaje de amenaza: {auditResult?.score}/{auditResult?.maxScore}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de carga mientras se verifica seguridad
  if (securityStatus === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
        <Shield className="w-16 h-16 text-blue-600 animate-pulse mb-4" />
        <p className="text-lg text-gray-700 font-medium">Verificando seguridad del dispositivo...</p>
        <p className="text-sm text-gray-500 mt-2">Ejecutando auditoría de entorno</p>
      </div>
    );
  }

  return (
    <SecurityProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="vote" element={<Vote />} />
            <Route path="audit" element={<SecurityDashboard />} />
            <Route path="audit/logs" element={<AuditLogs />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="*" element={<div className="p-10 text-center text-2xl">404 - No encontrado</div>} />
          </Route>
        </Routes>
      </Router>
    </SecurityProvider>
  );
}

export default App;
