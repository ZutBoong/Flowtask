# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synodos is a team-based Kanban board application with a Spring Boot backend and React frontend, using PostgreSQL database for persistence. Features include JWT authentication, real-time updates via WebSocket, task comments, verification workflow, team chat, and AI-powered analysis via Gemini.

## Build and Run Commands

### Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run          # Start backend server (port 8081)
./mvnw clean package            # Build JAR
./mvnw test                     # Run all tests
./mvnw test -Dtest=TestClass    # Run single test class
./mvnw test -Dtest=TestClass#methodName  # Run single test method

# Windows PowerShell (use quotes around profile arg)
.\mvnw spring-boot:run "-Dspring-boot.run.profiles=local"
```

### Frontend (React)
```bash
cd frontend
npm install                     # Install dependencies
npm start                       # Start dev server (port 3000, proxies to 8081)
npm run build                   # Production build
npm test                        # Run tests
npm test -- --watchAll=false    # Run tests once without watch mode
```

### Database
PostgreSQL running on localhost:5432. Schema files in `database/` folder:
- `postgresql_schema.sql` - Full consolidated schema

Setup from scratch:
```sql
CREATE DATABASE synodos;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE synodos TO flow;
\c synodos
GRANT ALL ON SCHEMA public TO flow;
```

Initialize schema:
```bash
psql -U flow -d synodos -f database/postgresql_schema.sql
```

### Docker (Full Stack)
```bash
docker-compose up --build              # Start all services
docker-compose up -d --build           # Start in background
docker-compose down                    # Stop all services
docker-compose down -v                 # Stop and remove volumes
```

### Test Accounts
Sample data is loaded from `data.sql` via Spring Boot's SQL initialization on startup.
- **Users**: admin, user1~user8 (password: `1234`)
- **Teams**: Sample team with columns and tasks

Database is reset on each startup via `reset.sql` → `schema.sql` → `data.sql`.

## Architecture

### Backend Structure (Spring Boot 3.2 + MyBatis + PostgreSQL)
```
backend/src/main/java/com/example/demo/
├── controller/     # REST endpoints under /api prefix
├── service/        # Business logic layer
├── dao/            # MyBatis mapper interfaces
├── model/          # Data entities with Lombok annotations
├── config/         # WebSocket and Security configuration
├── security/       # JWT token provider and authentication filter
└── dto/            # Data transfer objects (AuthResponse, BoardEvent, AnalysisRequest)
```
Key entities: Member, Team, TeamMember, SynodosColumn, Task, Comment, ChatMessage, Notification, TaskAssignee, TaskVerifier, TaskFavorite, TaskArchive, ProjectFile

### External Integrations
- **Gemini AI**: `GeminiService` calls Gemini API for AI-powered analysis (model: `gemini-2.0-flash`)
- **GitHub**: `GitHubService` for Git commit integration, `GitHubIssueService` for issue sync, `GitHubWebhookService` for webhook handling
- **OAuth2**: Supports Google, Naver, Kakao social login via `OAuth2SuccessHandler`
- **Email**: Gmail SMTP (default) or AWS SES for email verification

### MyBatis Conventions
- Mapper XMLs in `resources/mapper/` (one per entity)
- Standard method names: `insert`, `update`, `delete`, `content` (get by ID), `listAll`, `listByColumn`, `listByTeam`
- Database uses `snake_case`, Java uses `camelCase` (auto-mapped via `map-underscore-to-camel-case=true`)
- Use `@Param` annotations in DAO interfaces for named parameters

### Task Workflow States
Tasks use `workflow_status` field:
- `WAITING` → `IN_PROGRESS` (assignee accepts) → `REVIEW` (submitted for review) → `DONE` (approved)
- `REJECTED` (verifier rejected, needs rework)
- `DECLINED` (assignee declined the task)

Rejections store `rejection_reason`, `rejected_at`, and `rejected_by` fields.

### Service Layer Patterns
```java
// Pattern: Populate relations after DAO fetch, trigger notifications after mutations
Task task = dao.content(id);
populateRelations(task);  // Load assignees, verifiers
dao.update(task);
notificationService.notifyTaskUpdated(task, teamId);
```

### Frontend Structure (React 18 + React Router)
```
frontend/src/
├── api/            # Axios API clients (axiosInstance, boardApi, teamApi, etc.)
├── components/     # Reusable UI (Sidebar, Header, TaskModal, ChatPanel, etc.)
├── pages/          # Route components (Login, Register, Home, TeamView, etc.)
└── pages/views/    # Board sub-views (BoardView, ListView, CalendarView, etc.)
```

### Frontend State Management
- Component-level state with React Hooks (no Redux/Context)
- localStorage keys: `token` (JWT), `member` (user info), `currentTeam`
- Axios interceptors: auto token injection, 401 redirects to login

### Real-Time Communication (WebSocket)
- Endpoint: `/ws` (STOMP over SockJS)
- Subscribe: `/topic/team/{teamId}` for board events
- Publish: `/app/presence/join/{teamId}`, `/app/presence/leave/{teamId}`
- Event types: `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_DELETED`, `COLUMN_CREATED`, etc.

### Notification System (Dual-Channel)
- **Real-time:** `BoardNotificationService` → WebSocket `/topic/team/{teamId}`
- **Persistent:** `NotificationService` → database `notification` table

### GitHub Issue Sync
- Tasks can be linked to GitHub issues via `TaskGitHubIssue` entity
- `GitHubWebhookController` receives webhook events from GitHub
- `GitHubIssueSyncService` handles bidirectional sync between tasks and issues
- User mappings stored in `GitHubUserMapping` table

**GitHub 저장소 연결 흐름:**
1. 팀 설정에서 "GitHub 저장소 연결" 클릭
2. 사용자의 GitHub 저장소 목록 조회 (`GitHubService.listUserRepositories`)
3. 저장소 선택 시 자동으로 Webhook 등록 (`GitHubService.createWebhook`)
4. Webhook URL은 `GITHUB_WEBHOOK_BASE_URL` 환경변수에서 가져옴
   - 설정 안 됨 + localhost → 프론트에서 ngrok URL 입력 프롬프트
   - 설정됨 → 자동으로 해당 URL 사용
5. Webhook 이벤트: `issues`, `issue_comment`, `push`

### API Endpoint Pattern
Backend endpoints: `/api/{resource}{action}` (e.g., `/api/taskwrite`, `/api/tasklist`, `/api/taskdelete/{id}`)
Frontend proxy forwards all `/api/*` requests to backend port 8081.

## Key Configuration
- Backend port: 8081, Frontend dev port: 3000 (proxies to 8081)
- DB credentials: flow/flow123@localhost:5432/synodos
- Java 17, Node 18+

### Configuration Files

| 파일 | 용도 | Git |
|------|------|-----|
| `.env` | Docker 배포용 | .gitignore |
| `application-local.properties` | 로컬 개발용 | .gitignore |

### Environment Variable Pattern (중요)

이 프로젝트는 로컬/배포 환경을 다음 패턴으로 분리합니다:

1. **`application.properties`**: 환경변수 참조 정의
   ```properties
   github.webhook.base-url=${GITHUB_WEBHOOK_BASE_URL:}
   # ${VAR_NAME:default} 형식 - 환경변수 없으면 default 사용
   ```

2. **로컬 개발**: `application-local.properties`에 직접 값 설정
   ```properties
   github.oauth.client-id=actual-value-here
   ```

3. **Docker 배포**: `.env` → `docker-compose.yml`로 주입
   ```yaml
   # docker-compose.yml
   environment:
     GITHUB_WEBHOOK_BASE_URL: ${GITHUB_WEBHOOK_BASE_URL:-}
   ```

**새 환경변수 추가 시 체크리스트:**
- [ ] `application.properties`에 `${VAR_NAME:}` 참조 추가
- [ ] `.env.example`에 설명과 함께 추가
- [ ] `.env`에 실제 값 추가
- [ ] `docker-compose.yml`의 backend environment에 추가
- [ ] 필요시 `application-local.properties`에 로컬용 값 추가

**민감도 판단 기준:**
- 민감: API 키, 비밀번호, OAuth secret → `.env`, `application-local.properties` (gitignore)
- 비민감: 공개 URL, 포트, 모드 설정 → `application.properties`에 직접 또는 기본값

### Local Development (application-local.properties)
Copy `application-local.properties.example` and configure:
```properties
# SMTP (Gmail App Password)
spring.mail.username=your-email@gmail.com
spring.mail.password=your-16-digit-app-password

# Gemini AI
gemini.api.key=your-gemini-api-key

# OAuth2 - Google
spring.security.oauth2.client.registration.google.client-id=your-client-id
spring.security.oauth2.client.registration.google.client-secret=your-client-secret

# OAuth2 - Naver
spring.security.oauth2.client.registration.naver.client-id=your-client-id
spring.security.oauth2.client.registration.naver.client-secret=your-client-secret

# OAuth2 - Kakao
spring.security.oauth2.client.registration.kakao.client-id=your-client-id
spring.security.oauth2.client.registration.kakao.client-secret=your-client-secret
```

### Docker Deployment (.env)
Copy `.env.example` to `.env` and configure:
- `DB_USERNAME`, `DB_PASSWORD` - Database credentials
- `JWT_SECRET` - JWT signing key
- `SMTP_USERNAME`, `SMTP_PASSWORD` - Gmail SMTP
- `GEMINI_API_KEY` - Gemini AI API key
- OAuth credentials (GOOGLE, NAVER, KAKAO, GITHUB)

### Email Configuration
- `email.environment=dev` - Logs emails to console
- `email.environment=prod` - Sends via SMTP (default)

## Data Hierarchy
```
Team → SynodosColumn → Task → [Comments, TaskAssignee, TaskVerifier]
     → TeamMember (links Member to Team with role)
     → ChatMessage
```
- Drag-and-drop uses `@hello-pangea/dnd` library
- File uploads: max 50MB per file (`spring.servlet.multipart.max-file-size`)