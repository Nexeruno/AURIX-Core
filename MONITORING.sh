#!/bin/bash

# 📊 MONITORING SKRIPT pro DevOps
# Slouží k monitorování aplikace a Cloud Functions

set -e

PROJECT_ID="evidence-vydaju"
REGION="europe-west1"

echo "🚀 Evidence Výdajů - Monitoring Script"
echo "════════════════════════════════════════"
echo ""

# Barvičky
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Health Check
echo -e "${BLUE}1️⃣  Health Check${NC}"
echo "URL: https://${REGION}-${PROJECT_ID}.cloudfunctions.net/healthCheck"
HEALTH=$(curl -s https://${REGION}-${PROJECT_ID}.cloudfunctions.net/healthCheck)
echo "$HEALTH" | jq '.'
echo ""

# 2. Metrics
echo -e "${BLUE}2️⃣  System Metrics${NC}"
echo "URL: https://${REGION}-${PROJECT_ID}.cloudfunctions.net/metrics"
METRICS=$(curl -s https://${REGION}-${PROJECT_ID}.cloudfunctions.net/metrics)
echo "$METRICS" | jq '.'
echo ""

# 3. Extract Key Metrics
echo -e "${BLUE}3️⃣  Key Metrics Summary${NC}"
USERS=$(echo "$METRICS" | jq '.metrics.users.total')
PENDING=$(echo "$METRICS" | jq '.metrics.transactions.pending')
RECURRING=$(echo "$METRICS" | jq '.metrics.recurring.count')
RESPONSE_TIME=$(echo "$METRICS" | jq '.performance.responseTimeMs')

echo "👥 Total Users: $USERS"
echo "⏳ Pending Transactions: $PENDING"
echo "🔄 Recurring Templates: $RECURRING"
echo "⚡ Response Time: ${RESPONSE_TIME}ms"
echo ""

# 4. Firestore Stats
echo -e "${BLUE}4️⃣  Firestore Statistics${NC}"
echo "Getting Firestore document counts..."
USERS_COUNT=$(firebase firestore:inspect --project=${PROJECT_ID} --collection=users 2>/dev/null | wc -l || echo "N/A")
echo "Users collection: $USERS_COUNT"
echo ""

# 5. Cloud Functions Logs (poslední 10 řádků)
echo -e "${BLUE}5️⃣  Recent Cloud Functions Logs (last 5)${NC}"
echo "Cmd: firebase functions:log --limit=5 --project=${PROJECT_ID}"
firebase functions:log --limit=5 --project=${PROJECT_ID} 2>/dev/null || echo "Logs not available"
echo ""

# 6. Status Summary
echo -e "${BLUE}6️⃣  Status Summary${NC}"
if echo "$HEALTH" | jq -e '.healthy' > /dev/null; then
  echo -e "${GREEN}✅ Services HEALTHY${NC}"
else
  echo -e "${RED}❌ Services UNHEALTHY${NC}"
fi

if [ "$PENDING" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $PENDING pending transactions${NC}"
else
  echo -e "${GREEN}✅ No pending transactions${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo "📈 Monitoring Complete!"
echo "Timestamp: $(date)"
