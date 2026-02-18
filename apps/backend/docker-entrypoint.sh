#!/bin/sh
set -e

# 첫 실행 시 template DB 복사 (이후에는 기존 DB 유지)
if [ ! -f "./data/db/admin.db" ]; then
  echo "[entrypoint] Initializing database from template..."
  cp ./data-template/admin.db ./data/db/admin.db
fi

# config 기본값 복사 (첫 실행 시만)
if [ ! -f "./data/config/ui-checks.json" ]; then
  echo "[entrypoint] Copying default ui-checks config..."
  cp ./config-defaults/ui-checks.json ./data/config/ui-checks.json
fi

if [ ! -f "./data/config/datasources.config.json" ]; then
  echo "[entrypoint] Copying default datasources config..."
  cp ./config-defaults/datasources.config.json ./data/config/datasources.config.json
fi

echo "[entrypoint] Starting NestJS backend..."
exec node dist/src/main
