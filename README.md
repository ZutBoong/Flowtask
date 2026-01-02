# Synodos

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
| Spring Boot Mail | 3.2.0 |
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
- 이메일 인증 (회원가입, 비밀번호 찾기)

---

## 빠른 시작 (Docker)

Docker만 설치되어 있으면 바로 실행할 수 있습니다.

```bash
# 클론
git clone https://github.com/your-repo/Synodos.git
cd Synodos

# 환경 변수 설정
cp .env.example .env
nano .env  # SMTP 설정 입력

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

### 테스트 계정

샘플 데이터가 자동으로 생성됩니다. (비밀번호는 모두 `1234`)

| 아이디 | 이름 | 역할 |
|--------|------|------|
| admin | 관리자 | 팀 소유자 |
| user1 | 홍길동 | 팀 멤버 |
| user2 | 김철수 | 팀 멤버 |
| user3 | 이영희 | 팀 멤버 |

---

## 로컬 개발 환경 (Docker 없이)

### 필수 요구사항

- Java 17+
- Node.js 18+
- PostgreSQL 16+

### 1. 데이터베이스 설정

```sql
CREATE DATABASE synodos;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE synodos TO flow;
\c synodos
GRANT ALL ON SCHEMA public TO flow;
```

```bash
psql -U flow -d synodos -f database/postgresql_schema.sql
```

### 데이터베이스 관리

```bash
# 데이터베이스 전체 리셋 (모든 테이블 삭제)
psql -U flow -d synodos -f database/reset.sql

# 샘플 데이터 추가 (테스트 계정, 팀, 태스크 등)
psql -U flow -d synodos -f backend/src/main/resources/sample-data.sql
```

> **참고**: 백엔드 재시작 시 테이블 구조(schema.sql)는 자동 생성되지만, 샘플 데이터는 자동 생성되지 않습니다.

### 2. SMTP 설정 (이메일 인증용)

Gmail 앱 비밀번호 발급:
1. [Google 계정](https://myaccount.google.com/) > 보안 > 2단계 인증 활성화
2. [앱 비밀번호](https://myaccount.google.com/apppasswords) 생성
3. `application-local.properties` 파일 생성:

```properties
# backend/src/main/resources/application-local.properties
spring.mail.username=your-email@gmail.com
spring.mail.password=your-16-digit-app-password
```

### 3. Backend 실행

```bash
cd backend

# Windows PowerShell
.\mvnw spring-boot:run "-Dspring-boot.run.profiles=local"
#or
mvn spring-boot:run "-Dspring-boot.run.profiles=local"

# Mac/Linux
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

### 4. Frontend 실행

```bash
cd frontend
npm install
npm start
```

브라우저에서 http://localhost:3000 접속

---

## AWS EC2 배포

### 아키텍처

```
[사용자] --> [EC2: nginx (포트 80)] --> [EC2: Spring Boot (포트 8081)] --> [EC2: PostgreSQL (Docker)]
```

모든 서비스가 EC2 한 대에서 Docker로 실행됩니다.

### 1. EC2 인스턴스 생성

| 설정 | 권장값 |
|------|--------|
| AMI | Ubuntu 22.04 |
| 인스턴스 유형 | t3.small 이상 |
| 스토리지 | 20GB 이상 |

**보안 그룹 인바운드 규칙:**
- SSH (22) - 내 IP
- HTTP (80) - 0.0.0.0/0

### 2. Docker 설치 (Ubuntu)

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
git clone https://github.com/your-repo/Synodos.git
cd Synodos

# 환경 변수 설정
cp .env.example .env
nano .env
```

`.env` 파일 내용:
```properties
# DB 설정
DB_USERNAME=flow
DB_PASSWORD=flow123

# JWT 시크릿 (프로덕션용으로 변경)
JWT_SECRET=your-production-secret-key

# SMTP 설정 (Gmail 앱 비밀번호)
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
```

```bash
# 배포 실행
docker-compose up -d --build
```

브라우저에서 `http://EC2-퍼블릭-IP` 접속

### 4. 유용한 명령어

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 백엔드 로그만
docker logs -f synodos-backend

# 재시작
docker-compose restart

# 중지
docker-compose down

# 이미지 재빌드
docker-compose up -d --build

# DB 데이터 백업
docker exec synodos-db pg_dump -U flow synodos > backup.sql

# DB 데이터 복원
cat backup.sql | docker exec -i synodos-db psql -U flow synodos
```

### 5. 도메인 및 HTTPS 설정 (선택)

**Route 53 도메인 연결:**
1. Route 53 > 호스팅 영역 생성
2. A 레코드 추가 > EC2 퍼블릭 IP

**Let's Encrypt SSL:**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 비용 참고 (서울 리전)

| 서비스 | 사양 | 월 예상 비용 |
|--------|------|-------------|
| EC2 | t3.small | ~$15 |

프리 티어 (t2.micro) 적용 시 12개월간 무료

---

## 환경 변수 설정

### 파일 구조

| 파일 | Git | 용도 |
|------|-----|------|
| `.env.example` | O | 템플릿 (예시값) |
| `.env` | X | 실제 설정값 (Docker용) |
| `application.properties` | O | Spring Boot 기본 설정 |
| `application-local.properties` | X | 로컬 개발용 민감 정보 |

### 환경별 설정 방법

| 환경 | 설정 방법 |
|------|----------|
| 로컬 (mvn) | `application-local.properties` + `-Dspring-boot.run.profiles=local` |
| Docker / AWS | `.env` 파일에 환경변수 설정 |

---

## 프로젝트 구조

```
Synodos/
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

---

## 라이선스

MIT License
