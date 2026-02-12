#!/bin/sh
set -e

echo "[entrypoint] Starting Next.js frontend..."
exec node server.js
