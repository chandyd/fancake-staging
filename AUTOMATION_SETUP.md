# 🤖 AUTOMAZIONE COMPLETA - FanCake Staging

## 🎯 ARCHITETTURA AUTOMATIZZATA

```
GitHub Repository → GitHub Actions → Supabase CLI → Database
```

## 📁 STRUTTURA CREATA

```
fancake-staging/
├── supabase/
│   ├── config.toml          # Configurazione Supabase
│   └── migrations/
│       └── 202604211930_initial_schema.sql  # Schema completo
├── .github/workflows/
│   └── deploy-migrations.yml # GitHub Actions workflow
├── scripts/
│   └── deploy-db.sh         # Script deploy locale
├── migrations/              # Migrazioni originali
├── docs/                    # Documentazione
└── AUTOMATION_SETUP.md      # Questo file
```

## 🚀 COME ATTIVARE L'AUTOMAZIONE

### **PASSO 1: Crea Repository GitHub**
```bash
cd /root/.openclaw/workspace/fancake-staging
git init
git add .
git commit -m "Initial commit: FanCake staging database"
# Crea repo su GitHub e push
```

### **PASSO 2: Configura Secrets su GitHub**
Vai su: `https://github.com/[tuo-username]/fancake-staging/settings/secrets/actions`

Aggiungi:
- `SUPABASE_ACCESS_TOKEN`: Il tuo token Supabase (da Dashboard → Access Tokens)
- `SUPABASE_DB_PASSWORD`: `Robertocalvo.1981` (o password corretta)

### **PASSO 3: Prima esecuzione MANUALE (una tantum)**
```bash
# Installa Supabase CLI
curl -fsSL https://github.com/supabase/cli/raw/main/install.sh | sh

# Link al progetto
supabase link --project-ref lftlvycvgauzrryyqxpu
# Quando chiede l'access token, usa quello del dashboard

# Deploy manuale iniziale
supabase db push
```

### **PASSO 4: Push su GitHub**
```bash
git push origin main
# GitHub Actions eseguirà automaticamente le migrazioni
```

## 🔄 FLUSSO AUTOMATICO

1. **Modifichi un file SQL** in `supabase/migrations/`
2. **Commit e push** su GitHub
3. **GitHub Actions** trigger automatico
4. **Supabase CLI** esegue migrazioni
5. **Notifica** su successo/errore

## 📊 MIGRAZIONE INIZIALE

La migrazione `202604211930_initial_schema.sql` contiene:

### **TABELLE PRINCIPALI:**
- `users` - Utenti con Stripe integration
- `media` - Images, videos, audio, live streams
- `tips` - Mance con Stripe
- `subscription_plans` + `subscriptions` - Abbonamenti
- `bookings` - Prenotazioni video/audio calls
- `follows`, `likes`, `comments` - Social interactions
- `notifications` - Sistema notifiche

### **FEATURES:**
- ✅ UUID primary keys
- ✅ Full-text search
- ✅ Performance indexes
- ✅ Triggers per updated_at
- ✅ RLS (Row Level Security) ready

## 🛠️ SCRIPT LOCALI

### **Deploy manuale:**
```bash
./scripts/deploy-db.sh
```

### **Verifica stato:**
```bash
supabase db status
```

### **Crea nuova migrazione:**
```bash
supabase migration new nome_migrazione
```

## 🔐 SICUREZZA

1. **Non commitare secrets** - Usa GitHub Secrets
2. **Service role solo in CI** - Non in locale
3. **RLS abilitato** - Configura policies dopo deploy
4. **Backup automatici** - Supabase fa backup giornalieri

## 📞 SUPPORTO

### **Problemi comuni:**

1. **"Tenant or user not found"** → Password sbagliata
2. **"Invalid access token"** → Rigenera token su Supabase Dashboard
3. **"Network unreachable"** → Il droplet blocca porte outbound

### **Soluzioni:**
- Verifica password in Supabase Dashboard → Database
- Usa Supabase SQL Editor per deploy manuale iniziale
- Configura firewall droplet se necessario

## 🎉 BENEFICI AUTOMAZIONE

- **Zero manual steps** dopo setup iniziale
- **Version control** del database
- **Rollback facile** con migrazioni
- **CI/CD integrato** con GitHub
- **Documentazione automatica** delle modifiche

---

**NEXT STEP:** Esegui il **PASSO 3** (deploy manuale iniziale) per verificare che tutto funzioni, poi push su GitHub per attivare l'automazione completa.