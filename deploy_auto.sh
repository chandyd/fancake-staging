#!/bin/bash
# Script per deploy automatico via psql

set -e

echo "=== DEPLOY AUTOMATICO FANCAKE ==="

# Credenziali
DB_HOST="aws-0-us-east-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.lftlvycvgauzrryyqxpu"
DB_PASS="Robertocalvo.1981"

# File SQL
SQL_FILE="deploy_full.sql"

echo "1. Test connessione..."
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>/dev/null; then
  echo "✅ Connessione OK"
else
  echo "❌ Connessione fallita"
  exit 1
fi

echo "2. Eseguo deploy..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

echo "✅ Deploy completato!"
