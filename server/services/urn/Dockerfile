# ==============================================================================
# DOCKERFILE — Microservicio de la Urna Anónima
# ==============================================================================
# Multi-stage build para producción optimizada

# --- Stage 1: Dependencias ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# --- Stage 2: Producción ---
FROM node:20-alpine AS production
WORKDIR /app

# Seguridad: No correr como root
RUN addgroup -g 1001 -S elishama && \
    adduser -S urn -u 1001 -G elishama

# Copiar solo lo necesario
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Permisos restrictivos
RUN chown -R urn:elishama /app
USER urn

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check interno
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/urna/stats || exit 1

CMD ["node", "server.js"]
