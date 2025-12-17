# Flowtask AWS EC2 배포 가이드

## 아키텍처

```
[사용자] --> [EC2: nginx (포트 80)] --> [EC2: Spring Boot (포트 8081)] --> [EC2: PostgreSQL (Docker)]
```

모든 서비스가 EC2 한 대에서 Docker로 실행됩니다.

## 1. AWS EC2 설정

### EC2 인스턴스 생성
1. AMI: Amazon Linux 2023 또는 Ubuntu 22.04
2. 인스턴스 유형: t3.small 이상 권장
3. 스토리지: 20GB 이상

### 보안 그룹 설정
인바운드 규칙:
- SSH (22) - 내 IP
- HTTP (80) - 0.0.0.0/0

### Docker 설치 (Amazon Linux 2023)
```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 재로그인 필요
exit
```

### Docker 설치 (Ubuntu)
```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit
```

## 2. 배포

### 프로젝트 업로드 (방법 1: SCP)
```bash
# 로컬에서
scp -i your-key.pem -r ./Flowtask ec2-user@your-ec2-ip:~/
```

### 프로젝트 업로드 (방법 2: Git)
```bash
# EC2에서
git clone https://github.com/your-repo/flowtask.git
cd flowtask
```

### 환경 변수 설정
```bash
cd ~/Flowtask
cp .env.aws.example .env.aws
nano .env.aws
```

`.env.aws` 내용:
```
DB_USERNAME=flow
DB_PASSWORD=flow123
JWT_SECRET=your-256-bit-secret-key
API_URL=
WS_URL=/ws
```

### 배포 실행
```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

### 수동 배포
```bash
docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
```

## 3. 확인

```bash
# 컨테이너 상태 확인
docker-compose -f docker-compose.aws.yml ps

# 로그 확인
docker-compose -f docker-compose.aws.yml logs -f

# 백엔드 로그만
docker logs -f flowtask-backend
```

브라우저에서 `http://your-ec2-public-ip` 접속

## 4. 유용한 명령어

```bash
# 재시작
docker-compose -f docker-compose.aws.yml restart

# 중지
docker-compose -f docker-compose.aws.yml down

# 이미지 재빌드
docker-compose -f docker-compose.aws.yml up -d --build

# DB 데이터 백업
docker exec flowtask-db pg_dump -U flow flowtask > backup.sql

# DB 데이터 복원
cat backup.sql | docker exec -i flowtask-db psql -U flow flowtask
```

## 5. 도메인 및 HTTPS 설정 (선택)

### Route 53 도메인 연결
1. Route 53 > 호스팅 영역 생성
2. A 레코드 추가 → EC2 퍼블릭 IP

### Let's Encrypt SSL
```bash
# Amazon Linux
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# Ubuntu
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 비용 참고 (서울 리전)

| 서비스 | 사양 | 월 예상 비용 |
|--------|------|-------------|
| EC2 | t3.small | ~$15 |

프리 티어 (t2.micro) 적용 시 12개월간 무료
