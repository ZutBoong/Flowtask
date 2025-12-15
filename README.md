# Kari

프로젝트 관리 및 실시간 협업 애플리케이션입니다.

## 기술 스택

- **Backend**: Spring Boot 3.2, MyBatis, Java 17
- **Frontend**: React 18, React Router
- **Database**: Oracle XE
- **Real-time**: WebSocket (STOMP)
- **Auth**: JWT

## 주요 기능

- 팀/프로젝트 관리
- 칸반 보드 (드래그 앤 드롭)
- 태스크 관리 (담당자, 마감일, 우선순위)
- 태스크 댓글
- 태그 시스템
- 검증자 워크플로우
- 팀 채팅 (실시간)
- 캘린더 뷰
- Git 연동

## 필수 요구사항

- Java 17+
- Node.js 18+
- Oracle XE (11g 이상)

## 초기 설정

### 1. 데이터베이스 설정

Oracle XE에 사용자와 테이블을 생성합니다.

```sql
-- Oracle에 접속 후 사용자 생성
CREATE USER kari IDENTIFIED BY kari123;
GRANT CONNECT, RESOURCE TO kari;
GRANT UNLIMITED TABLESPACE TO kari;
```

kari 사용자로 접속 후 스키마 파일들을 순서대로 실행:

```bash
# SQL*Plus 또는 SQL Developer에서 실행
@database/schema.sql
@database/kanban_schema.sql
@database/issue_tracker_schema.sql
@database/tag_schema.sql
@database/verifier_schema.sql
@database/comment_schema.sql
@database/chat_schema.sql
@database/git_schema.sql
```

### 2. Backend 실행

```bash
cd backend
./mvnw spring-boot:run
```

서버가 `http://localhost:8081`에서 시작됩니다.

### 3. Frontend 실행

```bash
cd frontend
npm install
npm start
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 프로젝트 구조

```
Kari/
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
spring.datasource.url=jdbc:oracle:thin:@localhost:1521:xe
spring.datasource.username=kari
spring.datasource.password=kari123
```

## 라이선스

MIT License
