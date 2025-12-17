# Flowtask

팀 기반 칸반 보드 및 실시간 협업 애플리케이션입니다.

## 기술 스택

### 런타임 환경
| 기술 | 버전 |
|------|------|
| Java | 17 |
| Node.js | 18+ |
| PostgreSQL | 16+ |

### Backend
| 라이브러리 | 버전 |
|------------|------|
| Spring Boot | 3.2.0 |
| Spring Boot Security | 3.2.0 |
| Spring Boot WebSocket | 3.2.0 |
| MyBatis Spring Boot Starter | 3.0.3 |
| JJWT (JWT) | 0.12.3 |
| Lombok | Spring 관리 |

### Frontend
| 라이브러리 | 버전 |
|------------|------|
| React | 18.2.0 |
| React Router DOM | 6.20.0 |
| Axios | 1.6.2 |
| @hello-pangea/dnd | 16.5.0 |
| @stomp/stompjs | 7.2.1 |
| sockjs-client | 1.6.1 |

## 주요 기능

- 팀/프로젝트 관리
- 칸반 보드 (드래그 앤 드롭)
- 태스크 관리 (복수 담당자, 마감일, 우선순위)
- 태스크 댓글
- 태그 시스템
- 검증자 워크플로우
- 팀 채팅 (실시간 WebSocket)
- 캘린더 뷰
- Git 커밋 연동
- 실시간 알림

## 빠른 시작 (Docker)

Docker만 설치되어 있으면 바로 실행할 수 있습니다.

```bash
# 클론
git clone https://github.com/your-repo/Flowtask.git
cd Flowtask

# 실행
docker-compose up --build
```

브라우저에서 http://localhost 접속

### Docker 명령어

```bash
# 백그라운드 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 종료
docker-compose down

# 데이터 포함 완전 삭제
docker-compose down -v
```

### 접속 정보

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8081 |
| PostgreSQL | localhost:5432 |

## 로컬 개발 환경 (Docker 없이)

### 필수 요구사항

- Java 17+
- Node.js 18+
- PostgreSQL 16+

### 1. 데이터베이스 설정

```sql
CREATE DATABASE flowtask;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE flowtask TO flow;
\c flowtask
GRANT ALL ON SCHEMA public TO flow;
```

```bash
psql -U flow -d flowtask -f database/postgresql_schema.sql
```

### 2. Backend 실행

```bash
cd backend
./mvnw spring-boot:run
```

### 3. Frontend 실행

```bash
cd frontend
npm install
npm start
```

브라우저에서 http://localhost:3000 접속

## AWS EC2 배포

### 1. EC2 인스턴스 생성
- AMI: Amazon Linux 2023 또는 Ubuntu 22.04
- 인스턴스 유형: t3.small 이상
- 보안 그룹: SSH(22), HTTP(80) 허용

### 2. Docker 설치

**Amazon Linux 2023:**
```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 재로그인
exit
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit
```

### 3. 배포

```bash
# 프로젝트 클론
git clone https://github.com/your-repo/Flowtask.git
cd Flowtask

# 환경 변수 설정
cp .env.aws.example .env.aws
nano .env.aws

# 배포
docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
```

브라우저에서 `http://EC2-퍼블릭-IP` 접속

자세한 내용은 [AWS_DEPLOY.md](AWS_DEPLOY.md) 참고

## 프로젝트 구조

```
Flowtask/
├── backend/                 # Spring Boot 백엔드
│   ├── src/main/java/      # Java 소스
│   └── src/main/resources/ # 설정 및 MyBatis 매퍼
├── frontend/               # React 프론트엔드
│   └── src/
│       ├── api/           # API 클라이언트
│       ├── components/    # 재사용 컴포넌트
│       └── pages/         # 페이지 컴포넌트
└── database/              # SQL 스키마 파일
```

## 설정 변경

### 데이터베이스 연결 정보

`backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/flowtask
spring.datasource.username=flow
spring.datasource.password=flow123
```

## 라이선스

MIT License
