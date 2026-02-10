#!/bin/sh
set -e

echo "=== OLA B2B Monitoring - Backend Startup ==="

# --- DATABASE_URL 검증 ---
if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL environment variable is required"
  exit 1
fi

# --- Config 기본값 복사 (최초 실행 시) ---
if [ -d "config-defaults" ]; then
    cp -n config-defaults/ui-checks.json data/config/ui-checks.json 2>/dev/null || true
fi

# --- 템플릿 DB 복사 (최초 실행 시) ---
DB_PATH="./data/db/admin.db"
if [ ! -f "$DB_PATH" ]; then
    if [ -f "data-template/admin.db" ]; then
        echo "First run: copying template database..."
        cp data-template/admin.db "$DB_PATH"
        echo "Database ready."
    else
        echo "WARNING: No template DB found. Application may fail."
    fi
else
    echo "Database exists. Skipping copy."
fi

echo "=== Starting application ==="
exec "$@"
