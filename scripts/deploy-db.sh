#!/bin/bash
# Script per deploy database locale

set -e

echo "=== DEPLOY DATABASE FANCAKE ==="

# Verifica Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "Installing Supabase CLI..."
  curl -fsSL https://github.com/supabase/cli/raw/refs/heads/main/install.sh | sh
fi

# Link al progetto
echo "Linking to project lftlvycvgauzrryyqxpu..."
supabase link --project-ref lftlvycvgauzrryyqxpu

# Push migrazioni
echo "Deploying migrations..."
supabase db push

echo "✅ Database deployed successfully!"

echo "\n📊 Database tables created:"
supabase db dump --schema-only | grep "CREATE TABLE" | wc -l | xargs echo "Total tables:"
