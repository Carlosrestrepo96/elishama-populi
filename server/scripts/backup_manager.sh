#!/bin/bash

# ==============================================================================
# ELISHAMA POPULI — SISTEMA DE RESPALDO CRIPTOGRÁFICO AUTOMATIZADO
# ==============================================================================
# Este script extrae los datos de los contenedores Docker sin detenerlos,
# los cifra con AES-256-CBC (PBKDF2, 100k iteraciones) y los sube a S3.
#
# USO: ./backup_manager.sh
# CRON: 0 0 * * * /opt/elishama/backup_manager.sh >> /var/log/elishama_backup.log 2>&1
# ==============================================================================

set -euo pipefail  # Salir al primer error, variables no definidas = error

# ---- Variables ----
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/tmp/elishama_backups_$DATE"
S3_BUCKET="${S3_BUCKET:-s3://tu-bucket-seguro-elishama}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# La clave de cifrado debe estar en un archivo protegido, NO en el script
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/opt/elishama/.backup_key}"

if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
  echo "❌ ERROR: Archivo de clave de cifrado no encontrado: $ENCRYPTION_KEY_FILE"
  echo "   Crea uno con: openssl rand -base64 64 > $ENCRYPTION_KEY_FILE && chmod 600 $ENCRYPTION_KEY_FILE"
  exit 1
fi

ENCRYPTION_KEY=$(cat "$ENCRYPTION_KEY_FILE")

echo "======================================"
echo "🔒 Respaldo criptográfico: $DATE"
echo "======================================"
mkdir -p "$BACKUP_DIR"

# ------------------------------------------------------------------------------
# 1. EXTRACCIÓN Y CIFRADO DEL CENSO (Identidades)
# ------------------------------------------------------------------------------
echo "📦 Extrayendo base de datos del Censo..."
docker exec elishama-db-census pg_dump -U census_admin elishama_identity \
  > "$BACKUP_DIR/census_$DATE.sql"

echo "🔐 Cifrando Censo con AES-256-CBC (PBKDF2, 100k iteraciones)..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "$BACKUP_DIR/census_$DATE.sql" \
  -out "$BACKUP_DIR/census_$DATE.sql.enc" \
  -pass pass:"$ENCRYPTION_KEY"

# Verificar que el archivo cifrado se creó correctamente
if [ ! -s "$BACKUP_DIR/census_$DATE.sql.enc" ]; then
  echo "❌ ERROR: Cifrado del Censo falló"
  exit 1
fi

echo "✅ Censo cifrado: $(du -h "$BACKUP_DIR/census_$DATE.sql.enc" | cut -f1)"

# ------------------------------------------------------------------------------
# 2. EXTRACCIÓN Y CIFRADO DE LA URNA (Votos y Cadena de Auditoría)
# ------------------------------------------------------------------------------
echo "📦 Extrayendo base de datos de la Urna..."
docker exec elishama-db-urn pg_dump -U urn_admin elishama_votes \
  > "$BACKUP_DIR/urn_$DATE.sql"

echo "🔐 Cifrando Urna con AES-256-CBC (PBKDF2, 100k iteraciones)..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "$BACKUP_DIR/urn_$DATE.sql" \
  -out "$BACKUP_DIR/urn_$DATE.sql.enc" \
  -pass pass:"$ENCRYPTION_KEY"

if [ ! -s "$BACKUP_DIR/urn_$DATE.sql.enc" ]; then
  echo "❌ ERROR: Cifrado de la Urna falló"
  exit 1
fi

echo "✅ Urna cifrada: $(du -h "$BACKUP_DIR/urn_$DATE.sql.enc" | cut -f1)"

# ------------------------------------------------------------------------------
# 3. GENERAR CHECKSUMS (Integridad de los backups)
# ------------------------------------------------------------------------------
echo "🔍 Generando checksums SHA-256..."
sha256sum "$BACKUP_DIR/census_$DATE.sql.enc" > "$BACKUP_DIR/checksums_$DATE.sha256"
sha256sum "$BACKUP_DIR/urn_$DATE.sql.enc" >> "$BACKUP_DIR/checksums_$DATE.sha256"

echo "✅ Checksums generados"

# ------------------------------------------------------------------------------
# 4. SUBIDA SEGURA A LA NUBE (AWS S3)
# ------------------------------------------------------------------------------
echo "☁️  Subiendo archivos cifrados a S3..."

# Subir archivos cifrados
aws s3 cp "$BACKUP_DIR/census_$DATE.sql.enc" "$S3_BUCKET/census/" --quiet
aws s3 cp "$BACKUP_DIR/urn_$DATE.sql.enc" "$S3_BUCKET/urn/" --quiet
aws s3 cp "$BACKUP_DIR/checksums_$DATE.sha256" "$S3_BUCKET/checksums/" --quiet

echo "✅ Archivos subidos a $S3_BUCKET"

# ------------------------------------------------------------------------------
# 5. LIMPIEZA DE BACKUPS ANTIGUOS EN S3
# ------------------------------------------------------------------------------
echo "🧹 Limpiando backups con más de $RETENTION_DAYS días en S3..."
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || \
              date -v-${RETENTION_DAYS}d +%Y-%m-%d)

# Listar y eliminar archivos antiguos
aws s3 ls "$S3_BUCKET/census/" | while read -r line; do
  FILE_DATE=$(echo "$line" | awk '{print $1}')
  FILE_NAME=$(echo "$line" | awk '{print $4}')
  if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]] && [ -n "$FILE_NAME" ]; then
    aws s3 rm "$S3_BUCKET/census/$FILE_NAME" --quiet
    echo "  Eliminado: census/$FILE_NAME"
  fi
done

aws s3 ls "$S3_BUCKET/urn/" | while read -r line; do
  FILE_DATE=$(echo "$line" | awk '{print $1}')
  FILE_NAME=$(echo "$line" | awk '{print $4}')
  if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]] && [ -n "$FILE_NAME" ]; then
    aws s3 rm "$S3_BUCKET/urn/$FILE_NAME" --quiet
    echo "  Eliminado: urn/$FILE_NAME"
  fi
done

# ------------------------------------------------------------------------------
# 6. DESTRUCCIÓN SEGURA DE ARCHIVOS TEMPORALES
# ------------------------------------------------------------------------------
echo "🗑️  Destruyendo archivos temporales en texto plano..."
# shred sobrescribe los datos antes de borrar (no funciona en todos los filesystems)
if command -v shred &> /dev/null; then
  shred -u "$BACKUP_DIR/census_$DATE.sql" 2>/dev/null || true
  shred -u "$BACKUP_DIR/urn_$DATE.sql" 2>/dev/null || true
fi
rm -rf "$BACKUP_DIR"

echo "======================================"
echo "✅ Respaldo completado: $(date +%H:%M:%S)"
echo "======================================"
