#!/bin/bash

# ==============================================================================
# ELISHAMA POPULI — PROTOCOLO DE RESTAURACIÓN DE EMERGENCIA
# ==============================================================================
# Este script descarga los backups cifrados de S3, los descifra y los
# restaura en las bases de datos de Docker en caso de desastre.
#
# USO: ./restore_manager.sh [FECHA]
# Ejemplo: ./restore_manager.sh 2026-02-17_00-00-00
# ==============================================================================

set -euo pipefail

# ---- Variables ----
RESTORE_DATE="${1:-}"
S3_BUCKET="${S3_BUCKET:-s3://tu-bucket-seguro-elishama}"
RESTORE_DIR="/tmp/elishama_restore"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/opt/elishama/.backup_key}"

if [ -z "$RESTORE_DATE" ]; then
  echo "❌ USO: $0 <FECHA_DEL_BACKUP>"
  echo "   Ejemplo: $0 2026-02-17_00-00-00"
  echo ""
  echo "📋 Backups disponibles en S3:"
  aws s3 ls "$S3_BUCKET/census/" | tail -10
  exit 1
fi

if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
  echo "❌ ERROR: Archivo de clave de cifrado no encontrado: $ENCRYPTION_KEY_FILE"
  echo "   Sin esta clave, los backups son irrecuperables."
  exit 1
fi

ENCRYPTION_KEY=$(cat "$ENCRYPTION_KEY_FILE")

echo "======================================"
echo "🔄 Restauración de emergencia"
echo "   Fecha: $RESTORE_DATE"
echo "======================================"

# ---- Confirmación de seguridad ----
echo ""
echo "⚠️  ADVERTENCIA: Este proceso SOBRESCRIBIRÁ las bases de datos actuales."
echo "   ¿Estás seguro? (escribe 'SI' en mayúsculas para continuar)"
read -r CONFIRM
if [ "$CONFIRM" != "SI" ]; then
  echo "❌ Restauración cancelada."
  exit 0
fi

mkdir -p "$RESTORE_DIR"

# ------------------------------------------------------------------------------
# 1. DESCARGAR BACKUPS CIFRADOS DE S3
# ------------------------------------------------------------------------------
echo "☁️  Descargando backups cifrados de S3..."

aws s3 cp "$S3_BUCKET/census/census_$RESTORE_DATE.sql.enc" "$RESTORE_DIR/" || {
  echo "❌ ERROR: Backup del Censo no encontrado para la fecha $RESTORE_DATE"
  exit 1
}

aws s3 cp "$S3_BUCKET/urn/urn_$RESTORE_DATE.sql.enc" "$RESTORE_DIR/" || {
  echo "❌ ERROR: Backup de la Urna no encontrado para la fecha $RESTORE_DATE"
  exit 1
}

# Descargar y verificar checksums
aws s3 cp "$S3_BUCKET/checksums/checksums_$RESTORE_DATE.sha256" "$RESTORE_DIR/" 2>/dev/null || {
  echo "⚠️  Checksums no encontrados. Continuando sin verificación de integridad."
}

if [ -f "$RESTORE_DIR/checksums_$RESTORE_DATE.sha256" ]; then
  echo "🔍 Verificando integridad de los archivos descargados..."
  cd "$RESTORE_DIR"
  if sha256sum -c "checksums_$RESTORE_DATE.sha256"; then
    echo "✅ Integridad verificada"
  else
    echo "❌ ERROR: Los archivos están corruptos. Abortando."
    rm -rf "$RESTORE_DIR"
    exit 1
  fi
  cd -
fi

echo "✅ Archivos descargados"

# ------------------------------------------------------------------------------
# 2. DESCIFRAR BACKUPS
# ------------------------------------------------------------------------------
echo "🔓 Descifrando backup del Censo..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$RESTORE_DIR/census_$RESTORE_DATE.sql.enc" \
  -out "$RESTORE_DIR/census.sql" \
  -pass pass:"$ENCRYPTION_KEY"

echo "🔓 Descifrando backup de la Urna..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "$RESTORE_DIR/urn_$RESTORE_DATE.sql.enc" \
  -out "$RESTORE_DIR/urn.sql" \
  -pass pass:"$ENCRYPTION_KEY"

echo "✅ Backups descifrados"

# ------------------------------------------------------------------------------
# 3. RESTAURAR EN LOS CONTENEDORES DOCKER
# ------------------------------------------------------------------------------
echo "🔄 Restaurando base de datos del Censo..."
docker exec -i elishama-db-census psql -U census_admin -d elishama_identity \
  < "$RESTORE_DIR/census.sql"
echo "✅ Censo restaurado"

echo "🔄 Restaurando base de datos de la Urna..."
docker exec -i elishama-db-urn psql -U urn_admin -d elishama_votes \
  < "$RESTORE_DIR/urn.sql"
echo "✅ Urna restaurada"

# ------------------------------------------------------------------------------
# 4. VERIFICAR SERVICIOS
# ------------------------------------------------------------------------------
echo "🩺 Verificando servicios..."

docker exec elishama-db-census pg_isready -U census_admin -d elishama_identity
docker exec elishama-db-urn pg_isready -U urn_admin -d elishama_votes

echo "✅ Bases de datos operativas"

# ------------------------------------------------------------------------------
# 5. LIMPIAR ARCHIVOS TEMPORALES
# ------------------------------------------------------------------------------
echo "🗑️  Limpiando archivos temporales..."
if command -v shred &> /dev/null; then
  shred -u "$RESTORE_DIR/census.sql" 2>/dev/null || true
  shred -u "$RESTORE_DIR/urn.sql" 2>/dev/null || true
fi
rm -rf "$RESTORE_DIR"

echo "======================================"
echo "✅ Restauración completada exitosamente"
echo "   Reinicia los microservicios con:"
echo "   docker-compose restart api-census api-urn"
echo "======================================"
