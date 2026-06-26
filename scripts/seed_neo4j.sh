#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Seeding Neo4j..."

docker compose exec -T neo4j cypher-shell \
  -u "${NEO4J_USER:-neo4j}" \
  -p "${NEO4J_PASSWORD}" \
  < api/seed.cypher

echo "Neo4j seed complete."