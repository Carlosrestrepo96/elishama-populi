// utils/SecuritySentinel.js
// Centinela de seguridad: Detecta emuladores, dispositivos rooteados y navegadores automatizados

export class SecuritySentinel {
    /**
     * Ejecuta una batería de pruebas heurísticas de seguridad.
     * Si el nivel de amenaza es alto, podemos bloquear la generación de claves o el voto.
     * 
     * @returns {object} Resultado de la auditoría con puntaje de amenaza y detalles
     */
    static async performSecurityAudit() {
        const checks = {
            isHeadless: this.detectHeadlessBrowser(),
            isEmulator: this.detectEmulatorWebGL(),
            hasSuspiciousHardware: this.detectHardwareAnomalies(),
            hasDevToolsOpen: this.detectDevTools(),
        };

        // Calcular un "Threat Score" (Puntaje de amenaza)
        let threatScore = 0;
        if (checks.isHeadless) threatScore += 50;
        if (checks.isEmulator) threatScore += 40;
        if (checks.hasSuspiciousHardware) threatScore += 20;
        if (checks.hasDevToolsOpen) threatScore += 10; // DevTools abierto no es necesariamente malicioso

        return {
            isSafe: threatScore < 50, // Umbral de tolerancia
            score: threatScore,
            maxScore: 120,
            details: checks,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };
    }

    /**
     * Detecta si la app está corriendo en un navegador automatizado (Puppeteer, Selenium).
     * Usado frecuentemente para ataques de bots masivos.
     */
    static detectHeadlessBrowser() {
        return !!(
            navigator.webdriver ||
            window.document?.documentElement?.getAttribute("webdriver") === "true" ||
            (window.outerWidth === 0 && window.outerHeight === 0) ||
            // Phantomjs/CasperJS
            window._phantom ||
            window.__nightmare ||
            // Puppeteer headless
            window.chrome && !window.chrome.runtime
        );
    }

    /**
     * Detecta emuladores de Android leyendo el motor de renderizado gráfico.
     * Los emuladores usan renderizadores por software genéricos en lugar de GPUs físicas.
     */
    static detectEmulatorWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return false;

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return false;

            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL).toLowerCase();
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

            // Cadenas típicas de emuladores y máquinas virtuales
            const suspiciousStrings = [
                'swiftshader',       // Renderizador por software de Chrome headless
                'llvmpipe',          // Renderizador por software de Mesa (Linux VMs)
                'virtualbox',        // Oracle VirtualBox
                'vmware',            // VMware VMs
                'android emulator',  // Emulador oficial de Android
                'bluestacks',        // BlueStacks
                'nox',               // Nox Player
                'genymotion'         // Genymotion emulator
            ];

            return suspiciousStrings.some(str => renderer.includes(str) || vendor.includes(str));
        } catch (e) {
            return false; // Ante la duda, no bloqueamos (evitar falsos positivos)
        }
    }

    /**
     * Los emuladores a menudo asignan recursos irreales (ej. 1 core, o cantidades extrañas de RAM)
     */
    static detectHardwareAnomalies() {
        const cores = navigator.hardwareConcurrency;
        const ram = navigator.deviceMemory; // En GB (solo Chrome/Edge)

        // Un móvil moderno que corra React/Framer Motion fluidamente rara vez tiene 1 solo core
        const suspiciousCores = cores !== undefined && cores < 2;
        // Si la RAM reportada es menos de 1GB en tiempos modernos, es sospechoso
        const suspiciousRam = ram !== undefined && ram < 1;

        return suspiciousCores || suspiciousRam;
    }

    /**
     * Detecta si las DevTools están abiertas.
     * No es necesariamente malicioso, pero puede ser un indicador de debugging/ingeniería inversa.
     */
    static detectDevTools() {
        const threshold = 160; // Ancho típico del panel de DevTools
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        return widthDiff || heightDiff;
    }

    /**
     * Genera un reporte de seguridad formateado para logging/telemetría
     */
    static formatReport(auditResult) {
        const statusIcon = auditResult.isSafe ? '✅' : '🚨';
        const lines = [
            `${statusIcon} Security Audit - Threat Score: ${auditResult.score}/${auditResult.maxScore}`,
            `  Headless Browser: ${auditResult.details.isHeadless ? '⚠️ DETECTED' : '✅ Clean'}`,
            `  Emulator/VM: ${auditResult.details.isEmulator ? '⚠️ DETECTED' : '✅ Clean'}`,
            `  Hardware Anomalies: ${auditResult.details.hasSuspiciousHardware ? '⚠️ DETECTED' : '✅ Clean'}`,
            `  DevTools Open: ${auditResult.details.hasDevToolsOpen ? '⚠️ DETECTED' : '✅ Clean'}`,
            `  User Agent: ${auditResult.userAgent}`
        ];
        return lines.join('\n');
    }
}
