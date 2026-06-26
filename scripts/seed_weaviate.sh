#!/usr/bin/env bash
set -euo pipefail

echo "Seeding Weaviate..."

COUNT="$(docker compose exec -T api python - <<'PY'
import os
import weaviate

url = os.environ.get("WEAVIATE_URL", "http://weaviate:8080")
client = weaviate.Client(url)

try:
    result = client.query.aggregate("Chunk").with_meta_count().do()
    count = result["data"]["Aggregate"]["Chunk"][0]["meta"]["count"]
except Exception:
    count = 0

print(count)
PY
)"

if [ "$COUNT" != "0" ]; then
  echo "Weaviate already seeded: $COUNT chunks (idempotent)."
  echo "Weaviate seed complete."
  exit 0
fi

docker compose exec -T api python -m api.seed_weaviate

echo "Weaviate seed complete."
