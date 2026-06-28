#!/usr/bin/env bash
set -euo pipefail

SERVICES=("api" "web" "neo4j" "weaviate")
MAX_ATTEMPTS=45
SLEEP_SECONDS=2

echo "Waiting for stack health..."

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  all_healthy=true

  for service in "${SERVICES[@]}"; do
    health="$(docker compose ps --format json "$service" 2>/dev/null \
      | python -c "import sys,json; data=sys.stdin.read().strip(); print(json.loads(data).get('Health','') if data else '')" \
      || true)"

    if [ "$health" != "healthy" ]; then
      all_healthy=false
      break
    fi
  done

  if [ "$all_healthy" = true ]; then
    echo "All services healthy."
    exit 0
  fi

  echo "Attempt $attempt/$MAX_ATTEMPTS: stack not healthy yet..."
  sleep "$SLEEP_SECONDS"
done

echo "Timed out waiting for healthy stack."
docker compose ps
exit 1