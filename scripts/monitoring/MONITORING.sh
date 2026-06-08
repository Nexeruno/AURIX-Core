#!/bin/bash

# 📊 MONITORING SKRIPT pro DevOps
# Slouží k monitorování aplikace a Cloud Functions

set -e

PROJECT_ID="evidence-vydaju"
REGION="europe-west1"

echo "🚀 Evidence Výdajů - Skript monitorování"
echo "════════════════════════════════════════"
echo ""

# Barvy
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Bez barvy

# 1. Kontrola stavu
echo -e "${BLUE}1️⃣  Kontrola stavu${NC}"
echo "URL: https://${REGION}-${PROJECT_ID}.cloudfunctions.net/healthCheck"
HEALTH=$(curl -s https://${REGION}-${PROJECT_ID}.cloudfunctions.net/healthCheck)
echo "$HEALTH" | jq '.'
echo ""

# 2. Metriky systému
echo -e "${BLUE}2️⃣  Metriky systému${NC}"
echo "URL: https://${REGION}-${PROJECT_ID}.cloudfunctions.net/metrics"
METRICS=$(curl -s https://${REGION}-${PROJECT_ID}.cloudfunctions.net/metrics)
echo "$METRICS" | jq '.'
echo ""

# 3. Extrahuj klíčové metriky
echo -e "${BLUE}3️⃣  Souhrn klíčových metrik${NC}"
USERS=$(echo "$METRICS" | jq '.metrics.users.total')
PENDING=$(echo "$METRICS" | jq '.metrics.transactions.pending')
RECURRING=$(echo "$METRICS" | jq '.metrics.recurring.count')
RESPONSE_TIME=$(echo "$METRICS" | jq '.performance.responseTimeMs')

echo "👥 Celkový počet uživatelů: $USERS"
echo "⏳ Čekající transakce: $PENDING"
echo "🔄 Šablony opakování: $RECURRING"
echo "⚡ Doba odezvy: ${RESPONSE_TIME}ms"
echo ""

# 4. Statistika Firestore
echo -e "${BLUE}4️⃣  Statistika Firestore${NC}"
echo "Stahuju počty dokumentů Firestore..."
USERS_COUNT=$(firebase firestore:inspect --project=${PROJECT_ID} --collection=users 2>/dev/null | wc -l || echo "N/A")
echo "Sbírka uživatelů: $USERS_COUNT"
echo ""

# 5. Nedávné protokoly Cloud Functions (posledních 5)
echo -e "${BLUE}5️⃣  Nedávné protokoly Cloud Functions (posledních 5)${NC}"
echo "Příkaz: firebase functions:log --limit=5 --project=${PROJECT_ID}"
firebase functions:log --limit=5 --project=${PROJECT_ID} 2>/dev/null || echo "Protokoly nejsou dostupné"
echo ""

# 6. Souhrn stavu
echo -e "${BLUE}6️⃣  Souhrn stavu${NC}"
if echo "$HEALTH" | jq -e '.healthy' > /dev/null; then
  echo -e "${GREEN}✅ Služby jsou ZDRAVÉ${NC}"
else
  echo -e "${RED}❌ Služby jsou NEZDRAVÉ${NC}"
fi

if [ "$PENDING" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $PENDING čekajících transakcí${NC}"
else
  echo -e "${GREEN}✅ Žádné čekající transakce${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo "📈 Monitorování dokončeno!"
echo "Časové razítko: $(date)"
