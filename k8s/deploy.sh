#!/bin/bash
set -euo pipefail

# ============================================================
# OLA B2B Monitoring - K8s 배포 스크립트
# 사용법: ./k8s/deploy.sh
#
# 필수 환경변수: GCP_PROJECT_ID, BIGQUERY_DATASET, BIGQUERY_TABLE, JWT_SECRET
# 선택 환경변수: SERVER_IP (배포 완료 메시지용), ADMIN_SEED_PASSWORD
# ============================================================

# === 환경변수 파일 자동 로드 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.deploy"
if [ -f "$ENV_FILE" ]; then
  echo ">>> .env.deploy 파일에서 환경변수 로드: ${ENV_FILE}"
  set -a
  source "$ENV_FILE"
  set +a
else
  echo ">>> .env.deploy 파일 없음 - 기존 환경변수 사용"
fi

# === 필수 도구 확인 ===
for cmd in docker kubectl; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "ERROR: '$cmd' 명령어를 찾을 수 없습니다. 설치 후 다시 시도하세요."
    exit 1
  fi
done

# === 필수 환경변수 ===
: "${GCP_PROJECT_ID:?ERROR: GCP_PROJECT_ID를 설정해주세요}"
: "${BIGQUERY_DATASET:?ERROR: BIGQUERY_DATASET를 설정해주세요}"
: "${BIGQUERY_TABLE:?ERROR: BIGQUERY_TABLE를 설정해주세요}"
: "${JWT_SECRET:?ERROR: JWT_SECRET을 설정해주세요 (최소 32자)}"

# === 선택 환경변수 (기본값) ===
ADMIN_SEED_PASSWORD="${ADMIN_SEED_PASSWORD:-admin123}"
SA_KEY_PATH="${SA_KEY_PATH:-./secrets/service-account.json}"
NAMESPACE="ola-monitoring"
TAG="$(date +%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo 'nogit')"

# === SA 키 파일 확인 ===
if [ ! -f "$SA_KEY_PATH" ]; then
  echo "ERROR: GCP 서비스 계정 키 파일을 찾을 수 없습니다: $SA_KEY_PATH"
  echo "  secrets/service-account.json 경로에 파일을 배치하세요."
  exit 1
fi

echo "============================================"
echo " OLA B2B Monitoring K8s 배포"
echo " Image Tag: ${TAG}"
echo " Namespace: ${NAMESPACE}"
echo "============================================"

# === 배포 실패 시 롤백 함수 ===
# TODO(human): rollback_deployment 함수 구현
rollback_deployment() {
  local deployment_name="$1"
  local namespace="$2"
  echo "TODO: implement rollback for ${deployment_name}"
}

# === 1. Docker 이미지 빌드 ===
cd "$(git rev-parse --show-toplevel)"

echo ""
echo ">>> [1/6] Backend 이미지 빌드..."
docker build -t "ola-backend:${TAG}" \
  --build-arg "ADMIN_SEED_PASSWORD=${ADMIN_SEED_PASSWORD}" \
  -f apps/backend/Dockerfile .

echo ""
echo ">>> [2/6] Frontend 이미지 빌드..."
docker build -t "ola-frontend:${TAG}" \
  -f apps/frontend-next/Dockerfile .

# === 2. K8s 네임스페이스 ===
echo ""
echo ">>> [3/6] K8s 네임스페이스 & Secret 생성..."
kubectl apply -f k8s/namespace.yaml

# === 3. Secret 생성 ===
# GCP 서비스 계정 (파일)
kubectl create secret generic gcp-sa-secret \
  --from-file=service-account.json="${SA_KEY_PATH}" \
  -n "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# 백엔드 민감 환경변수
kubectl create secret generic backend-secrets \
  --from-literal="GCP_PROJECT_ID=${GCP_PROJECT_ID}" \
  --from-literal="BIGQUERY_DATASET=${BIGQUERY_DATASET}" \
  --from-literal="BIGQUERY_TABLE=${BIGQUERY_TABLE}" \
  --from-literal="JWT_SECRET=${JWT_SECRET}" \
  --from-literal="GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY:-}" \
  --from-literal="SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}" \
  --from-literal="SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN:-}" \
  --from-literal="SLACK_DEFAULT_CHANNEL=${SLACK_DEFAULT_CHANNEL:-#alerts}" \
  --from-literal="UI_CHECK_LOGIN_URL=${UI_CHECK_LOGIN_URL:-}" \
  --from-literal="UI_CHECK_USERNAME=${UI_CHECK_USERNAME:-}" \
  --from-literal="UI_CHECK_PASSWORD=${UI_CHECK_PASSWORD:-}" \
  --from-literal="WIND_PG_HOST=${WIND_PG_HOST:-}" \
  --from-literal="WIND_PG_PORT=${WIND_PG_PORT:-5432}" \
  --from-literal="WIND_PG_DATABASE=${WIND_PG_DATABASE:-}" \
  --from-literal="WIND_PG_USER=${WIND_PG_USER:-}" \
  --from-literal="WIND_PG_PASSWORD=${WIND_PG_PASSWORD:-}" \
  --from-literal="MINKABU_PG_HOST=${MINKABU_PG_HOST:-}" \
  --from-literal="MINKABU_PG_PORT=${MINKABU_PG_PORT:-5432}" \
  --from-literal="MINKABU_PG_DATABASE=${MINKABU_PG_DATABASE:-}" \
  --from-literal="MINKABU_PG_USER=${MINKABU_PG_USER:-}" \
  --from-literal="MINKABU_PG_PASSWORD=${MINKABU_PG_PASSWORD:-}" \
  --from-literal="REPORT_DB_TYPE=${REPORT_DB_TYPE:-}" \
  --from-literal="REPORT_DB_HOST=${REPORT_DB_HOST:-}" \
  --from-literal="REPORT_DB_PORT=${REPORT_DB_PORT:-3306}" \
  --from-literal="REPORT_DB_USER=${REPORT_DB_USER:-}" \
  --from-literal="REPORT_DB_PASSWORD=${REPORT_DB_PASSWORD:-}" \
  --from-literal="REPORT_DB_NAME=${REPORT_DB_NAME:-}" \
  -n "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# === 4. ConfigMap 적용 ===
echo ""
echo ">>> [4/6] ConfigMap 적용..."
kubectl apply -f k8s/backend/configmap.yaml
kubectl apply -f k8s/frontend/configmap.yaml

# ConfigMap 해시 계산 (Pod 자동 재시작 트리거)
BACKEND_CONFIG_HASH=$(kubectl get configmap backend-config -n "${NAMESPACE}" -o jsonpath='{.data}' | md5sum | cut -d' ' -f1)
FRONTEND_CONFIG_HASH=$(kubectl get configmap frontend-config -n "${NAMESPACE}" -o jsonpath='{.data}' | md5sum | cut -d' ' -f1)

# === 5. PVC, Deployment, Service 적용 (이미지 태그 + ConfigMap 해시 치환) ===
echo ""
echo ">>> [5/6] Deployment & Service 적용..."
kubectl apply -f k8s/backend/pv.yaml
kubectl apply -f k8s/backend/pvc.yaml

sed -e "s|TAG_PLACEHOLDER|${TAG}|g" \
    -e "s|CONFIG_HASH_PLACEHOLDER|${BACKEND_CONFIG_HASH}|g" \
    k8s/backend/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/backend/service.yaml

sed -e "s|TAG_PLACEHOLDER|${TAG}|g" \
    -e "s|CONFIG_HASH_PLACEHOLDER|${FRONTEND_CONFIG_HASH}|g" \
    k8s/frontend/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/frontend/service.yaml

# === 6. 배포 확인 (롤백 포함) ===
echo ""
echo ">>> [6/6] 배포 상태 확인..."

if ! kubectl rollout status deployment/ola-backend -n "${NAMESPACE}" --timeout=180s; then
  rollback_deployment "ola-backend" "${NAMESPACE}"
  exit 1
fi

if ! kubectl rollout status deployment/ola-frontend -n "${NAMESPACE}" --timeout=120s; then
  rollback_deployment "ola-frontend" "${NAMESPACE}"
  exit 1
fi

echo ""
echo "============================================"
echo " 배포 완료!"
echo ""
echo "   Frontend: http://<NODE_IP>:30001"
echo "   (Backend: ClusterIP - K8s 내부에서만 접근 가능)"
echo ""
echo "   로그인: admin@ola.com / (ADMIN_SEED_PASSWORD 참조)"
echo "============================================"
