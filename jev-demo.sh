#!/usr/bin/env bash
# Jev demo: one state, three question types, one request.
# Usage: TYPESAFE_API_KEY=... ./jev-demo.sh   (key from https://console.typesafe.ai/keys)
set -euo pipefail
: "${TYPESAFE_API_KEY:?set TYPESAFE_API_KEY}"

curl -sS -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON' | jq .
{
  "model": "jev-latest",
  "state": {
    "customer": { "plan": "pro", "tenure_months": 14 },
    "message": "Hi, I've been trying to connect my Stripe account for 3 days and the integration keeps failing. I'm losing sales. Please help ASAP."
  },
  "questions": {
    "is_urgent":   { "type": "noul",
                     "instructions": "Does `message` express urgency?",
                     "criteria": { "true": "Explicitly time-sensitive", "false": "No urgency expressed" } },
    "wants_refund": { "type": "noul", "instructions": "Is the customer asking for a refund in `message`?" },
    "department":  { "type": "choice",
                     "instructions": "Which team should handle `message`?",
                     "criteria": { "billing": "Payments, invoicing, refunds",
                                   "technical": "Bugs, outages, integrations",
                                   "sales": "Pricing, upgrades, new accounts" } },
    "frustration": { "type": "score",
                     "instructions": "How frustrated is the customer in `message`?",
                     "criteria": ["Calm", "Frustrated", "Very angry"] },
    "churn_risk":  { "type": "score",
                     "instructions": "Given `customer` and `message`, how likely is this account to cancel?",
                     "criteria": ["No sign of leaving", "Some risk: revenue impact mentioned", "Threatens to leave"] }
  }
}
JSON
