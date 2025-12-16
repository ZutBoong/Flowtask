# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowtask is a team-based Kanban board application with a Spring Boot backend and React frontend, using Oracle database for persistence. Features include JWT authentication, real-time updates via WebSocket, task comments, tags, verification workflow, team chat, and Git integration.

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
Oracle XE running on localhost:1521. Schema files in `database/`:
- `schema.sql` - Member tables
- `kanban_schema.sql` - Columns and tasks
- `issue_tracker_schema.sql` - Extended task fields (priority, assignee, dates)
- `tag_schema.sql` - Task tags
- `verifier_schema.sql` - Task verification workflow
- `comment_schema.sql` - Task comments
- `chat_schema.sql` - Team chat messages
- `git_schema.sql` - Git repository and commit links

## Architecture

### Backend Structure (Spring Boot 3.2 + MyBatis + Oracle)
- **Controllers** (`controller/`): REST endpoints under `/api` prefix
- **Services** (`service/`): Business logic layer
- **DAOs** (`dao/`): MyBatis mapper interfaces
- **Models** (`model/`): Data entities with Lombok annotations
- **MyBatis XML** (`resources/mapper/`): SQL mapping files
- **Config** (`config/`): WebSocket and Security configuration
- **Security** (`security/`): JWT token provider and authentication filter

Key entities: Member, Team, TeamMember, Project, FlowtaskColumn, Task, Tag, Comment, ChatMessage, GitRepo, TaskCommit

### Frontend Structure (React 18 + React Router)
- **Pages** (`pages/`): Route components (Board, Login, Register, Calendar, etc.)
- **Components** (`components/`): Reusable UI (Sidebar, TaskModal, CommentSection, ChatPanel, TagInput, FilterBar, GitRepoSettings, TaskCommits)
- **API** (`api/`): Axios API client functions for backend communication

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
- Frontend proxy: http://localhost:8081 (package.json)
- DB credentials: flow/flow123@localhost:1521:xe
- Java version: 17