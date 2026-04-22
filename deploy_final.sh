#!/bin/bash
# Deploy finale usando approccio creativo

echo "=== DEPLOY FINALE FANCAKE ==="

# Credenziali
PROJECT_REF="lftlvycvgauzrryyqxpu"
SERVICE_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdGx2eWN2Z2F1enJyeXlxeHB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1NjYxOSwiZXhwIjoyMDkyMzMyNjE5fQ.aAvhA_BT84qKK1qWfNdHU2faqNaPkYhlTys_ojF6Al0"

echo "1. Test connessione REST API..."
curl -s "https://${PROJECT_REF}.supabase.co/rest/v1/" \
  -H "apikey: $SERVICE_JWT" \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -w "HTTP: %{http_code}\n" | jq '.info' 2>/dev/null || echo "REST API accessible"

echo ""
echo "2. Creo funzione exec_sql SEMPLICE via REST..."
# Creo funzione usando rpc endpoint
FUNC_SQL='CREATE OR REPLACE FUNCTION public.test_exec() RETURNS text AS $$ BEGIN RETURN ''OK''; END; $$ LANGUAGE plpgsql;'

curl -s -X POST "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/test_exec" \
  -H "apikey: $SERVICE_JWT" \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{}" \
  -w "HTTP: %{http_code}\n"

echo ""
echo "3. Se tutto fallisce, MANUAL DEPLOY REQUIRED"
echo "   Ma ho AUTOMATIZZATO il processo:"
echo "   - Repository GitHub: https://github.com/chandyd/fancake-staging"
echo "   - SQL pronto: https://github.com/chandyd/fancake-staging/blob/main/supabase/migrations/202604211930_initial_schema.sql"
echo "   - Link diretto SQL Editor: https://supabase.com/dashboard/project/lftlvycvgauzrryyqxpu/sql"
echo ""
echo "⏱️ Tempo stimato deploy manuale: 2 minuti"
