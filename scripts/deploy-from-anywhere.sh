#!/bin/bash
# FanCake Staging - Deploy Database from ANY machine
# Usage: bash deploy-from-anywhere.sh
# Requires: curl + psql OR supabase CLI

set -e

echo "🚀 FanCake Staging - Database Deployment"
echo "=========================================="

# Chiedi password
echo -n "Password database Supabase: "
read -s DB_PASSWORD
echo ""

# Prova via psql
echo "📡 Connecting to Supabase via psql..."
if command -v psql &> /dev/null; then
  PGPASSWORD="$DB_PASSWORD" psql -h "db.lftlvycvgauzrryyqxpu.supabase.co" \
    -p 5432 -U "postgres" -d "postgres" \
    -f supabase/migrations/202604211930_initial_schema.sql
  echo "✅ Schema deployed successfully!"
else
  echo "❌ psql not found. Install it or use Supabase SQL Editor"
  echo ""
  echo "📋 Manual URL: https://supabase.com/dashboard/project/lftlvycvgauzrryyqxpu/sql"
  echo "📋 SQL file: supabase/migrations/202604211930_initial_schema.sql"
  exit 1
fi
