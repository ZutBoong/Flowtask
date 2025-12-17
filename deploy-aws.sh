#!/bin/bash

# AWS EC2 배포 스크립트
# 사용법: ./deploy-aws.sh

set -e

echo "=== Flowtask AWS 배포 ==="

# .env.aws 파일 확인
if [ ! -f .env.aws ]; then
    echo "오류: .env.aws 파일이 없습니다."
    echo ".env.aws.example을 복사하여 .env.aws를 생성하고 값을 설정하세요."
    echo "  cp .env.aws.example .env.aws"
    exit 1
fi

# 환경 변수 로드
export $(grep -v '^#' .env.aws | xargs)

echo "1. 기존 컨테이너 중지..."
docker-compose -f docker-compose.aws.yml down || true

echo "2. 이미지 빌드..."
docker-compose -f docker-compose.aws.yml build --no-cache

echo "3. 컨테이너 시작..."
docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d

echo "4. 상태 확인..."
docker-compose -f docker-compose.aws.yml ps

echo ""
echo "=== 배포 완료 ==="
echo "프론트엔드: http://$(curl -s ifconfig.me)"
echo "백엔드 API: http://$(curl -s ifconfig.me):8081"
