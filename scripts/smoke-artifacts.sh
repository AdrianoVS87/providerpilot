#!/usr/bin/env bash
set -euo pipefail

BASE=${1:-https://providerpilot.adrianovs.net}
API_KEY=${API_KEY:-pp-demo-key-2026}

echo "[1] Health"
curl -fsS "$BASE/api/health" >/dev/null && echo "ok"

echo "[2] Create onboarding"
RESP=$(curl -fsS -X POST "$BASE/api/intake" \
  -H 'Content-Type: application/json' \
  -H "X-API-Key: $API_KEY" \
  -d '{"providerName":"Smoke Artifact","businessName":"Artifact LLC","state":"CA","address":"123 Main","email":"a@b.com","facilityType":"home-based","ageGroups":["infant"],"maxCapacity":5}')
OID=$(python3 - <<'PY'
import json,sys
print(json.loads(sys.stdin.read())['onboardingId'])
PY
<<< "$RESP")
echo "onboardingId=$OID"

sleep 18

echo "[3] Read status + artifact"
STATUS=$(curl -fsS "$BASE/api/status/$OID" -H "X-API-Key: $API_KEY")
ART_ID=$(python3 - <<'PY'
import json,sys
j=json.loads(sys.stdin.read())
art=''
for s in j.get('steps',[]):
  if 'FormFiller' in s.get('agent',''):
    arr=s.get('artifacts',[])
    if arr:
      art=arr[0]['id']
      break
print(art)
PY
<<< "$STATUS")

if [[ -z "$ART_ID" ]]; then
  echo "artifact_not_ready"
  exit 2
fi

echo "artifactId=$ART_ID"

TMP=/tmp/providerpilot_artifact_${ART_ID}.pdf
curl -fsSL "$BASE/api/artifacts/$ART_ID/download" -o "$TMP"
BYTES=$(wc -c < "$TMP" | tr -d ' ')
echo "downloaded_bytes=$BYTES"

FILE_SHA=$(sha256sum "$TMP" | awk '{print $1}')
DB_SHA=$(node - <<NODE
const { Client } = require('/root/projects/providerpilot/backend/node_modules/pg');
(async()=>{
 const c=new Client({connectionString:'postgresql://hookwatch:hookwatch@127.0.0.1:5433/paperclip'});
 await c.connect();
 const r=await c.query('select sha256 from artifacts where id=$1',["$ART_ID"]);
 console.log(r.rows[0]?.sha256 || '');
 await c.end();
})();
NODE
)

echo "file_sha=$FILE_SHA"
echo "db_sha=$DB_SHA"

if [[ "$FILE_SHA" != "$DB_SHA" ]]; then
  echo "sha_mismatch"
  exit 3
fi

echo "smoke_artifacts_ok"
