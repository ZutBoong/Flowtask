# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowtask is a team-based Kanban board application with a Spring Boot backend and React frontend, using PostgreSQL database for persistence. Features include JWT authentication, real-time updates via WebSocket, task comments, tags, verification workflow, team chat, and Git integration.

## Build and Run Commands

### Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run          # Start backend server (port 8081)
./mvnw clean package            # Build JAR
./mvnw test                     # Run tests
./mvnw test -Dtest=TestClass    # Run single test class
```

### Frontend (React)
```bash
cd frontend
npm install                     # Install dependencies
npm start                       # Start dev server (port 3000, proxies to 8081)
npm run build                   # Production build
npm test                        # Run tests
```

### Database
PostgreSQL running on localhost:5432. Schema files in `database/` directory (organized by feature: member, team, board, tag, comment, chat, git, etc.)

Setup from scratch:
```sql
CREATE DATABASE flowtask;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE flowtask TO flow;
\c flowtask
GRANT ALL ON SCHEMA public TO flow;
```

Initialize schema:
```bash
psql -U flow -d flowtask -f database/postgresql_schema.sql
```

### Docker (Full Stack)
```bash
docker-compose up --build              # Start all services
docker-compose up -d --build           # Start in background
docker-compose down                    # Stop all services
docker-compose down -v                 # Stop and remove volumes
docker-compose logs -f                 # View logs
```

### Test Accounts
Sample data is auto-generated. All passwords are `1234`.
| userid | name | role |
|--------|------|------|
| admin | 관리자 | Team owner |
| user1 | 홍길동 | Team member |
| user2 | 김철수 | Team member |
| user3 | 이영희 | Team member |

## Architecture

### Backend Structure (Spring Boot 3.2 + MyBatis + PostgreSQL)
- **Controllers** (`controller/`): REST endpoints under `/api` prefix
- **Services** (`service/`): Business logic layer
- **DAOs** (`dao/`): MyBatis mapper interfaces
- **Models** (`model/`): Data entities with Lombok annotations
- **MyBatis XML** (`resources/mapper/`): SQL mapping files
- **Config** (`config/`): WebSocket and Security configuration
- **Security** (`security/`): JWT token provider and authentication filter

Key entities: Member, Team, TeamMember, Project, FlowtaskColumn, Task, Tag, Comment, ChatMessage, GitRepo, TaskCommit, Section, Notification, TaskAssignee, ColumnArchive, ColumnAssignee, ColumnFavorite, ProjectFile

### Frontend Structure (React 18 + React Router)
- **Pages** (`pages/`): Route components (Board, Login, Register, Calendar, etc.)
- **Components** (`components/`): Reusable UI (Sidebar, Header, TaskModal, CommentSection, ChatPanel, TagInput, FilterBar, GitRepoSettings, TaskCommits, NotificationBell)
- **API** (`api/`): Axios API client functions for backend communication (axiosInstance, boardApi, teamApi, memberApi, etc.)
- **Views** (`pages/views/`): Sub-views for Board page (BoardView, ListView, CalendarView, TimelineView, FilesView, AdminView, OverviewView)

### Data Flow
1. Teams contain Projects
2. Projects contain Columns (Kanban columns)
3. Columns contain Tasks
4. Tasks can have Tags, Comments, Assignees, Verifiers, and linked Git commits
5. Drag-and-drop uses `@hello-pangea/dnd` library

### Real-Time Communication
- WebSocket endpoint: `/ws` (STOMP over SockJS)
- Topic prefix: `/topic` for subscriptions
- App prefix: `/app` for client-to-server messages
- Frontend uses `@stomp/stompjs` and `sockjs-client`

### API Patterns
Backend endpoints follow pattern: `/api/{resource}{action}` (e.g., `/api/taskwrite`, `/api/tasklist`)
Frontend proxy configured to forward requests to backend on port 8081.

### Authentication
JWT-based authentication with tokens stored client-side. Configured in `SecurityConfig.java` with public endpoints for login/register.

## Key Configuration
- Backend port: 8081 (application.properties)
- Frontend dev port: 3000, proxies to 8081 (package.json proxy setting)
- Frontend Docker port: 80 via Nginx
- DB credentials: flow/flow123@localhost:5432/flowtask
- Java version: 17
- Node version: 18+
- MyBatis: Maps underscore to camelCase automatically
- Database init: Schema loaded from `reset.sql`, `schema.sql`, `data.sql` on startup (local mode)

## Deployment
For AWS EC2 deployment, use `docker-compose.aws.yml` with environment file:
```bash
cp .env.aws.example .env.aws
docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
```
See `AWS_DEPLOY.md` for detailed instructions.