# FLOWTASK 프로젝트 종합 명명규칙 및 아키텍처 문서

## 1. 디렉토리 구조 (Directory Structure)

### 1.1 루트 디렉토리
```
/mnt/c/Flowtask/
├── backend/                 # Spring Boot 백엔드 서버
├── frontend/                # React 프론트엔드 애플리케이션
├── database/                # PostgreSQL 스키마 및 초기화 파일
├── docker-compose.yml       # 로컬 개발용 Docker 구성
├── docker-compose.aws.yml   # AWS 배포용 Docker 구성
├── CLAUDE.md               # 프로젝트 개발 가이드
└── README.md               # 프로젝트 소개 및 배포 가이드
```

### 1.2 백엔드 구조 (`/backend/src/main/java/com/example/demo/`)
```
backend/
├── controller/              # REST API 엔드포인트 (15개 파일)
│   ├── MemberController.java
│   ├── TaskController.java
│   ├── TeamController.java
│   ├── FlowtaskColumnController.java
│   ├── ProjectController.java
│   ├── TagController.java
│   ├── CommentController.java
│   ├── ChatController.java
│   ├── GitController.java
│   ├── TaskAssigneeController.java
│   ├── ColumnAssigneeController.java
│   ├── ColumnFavoriteController.java
│   ├── ColumnArchiveController.java
│   └── NotificationController.java
│
├── service/                 # 비즈니스 로직 레이어 (13개 파일)
│   ├── MemberService.java
│   ├── TaskService.java
│   ├── TeamService.java
│   ├── FlowtaskColumnService.java
│   ├── ProjectService.java
│   ├── TagService.java
│   ├── CommentService.java
│   ├── ChatService.java
│   ├── GitService.java
│   ├── TaskAssigneeService.java
│   ├── ColumnAssigneeService.java
│   ├── ColumnFavoriteService.java
│   ├── ColumnArchiveService.java
│   ├── BoardNotificationService.java
│   └── NotificationService.java
│
├── dao/                     # MyBatis Mapper 인터페이스 (14개 파일)
│   ├── MemberDao.java
│   ├── TaskDao.java
│   ├── TeamDao.java
│   ├── FlowtaskColumnDao.java
│   ├── ProjectDao.java
│   ├── TagDao.java
│   ├── CommentDao.java
│   ├── ChatMessageDao.java
│   ├── GitRepoDao.java
│   ├── TaskAssigneeDao.java
│   ├── ColumnAssigneeDao.java
│   ├── ColumnFavoriteDao.java
│   ├── ColumnArchiveDao.java
│   └── NotificationDao.java
│
├── model/                   # 엔티티 및 데이터 모델 (16개 파일)
│   ├── Member.java
│   ├── Team.java
│   ├── TeamMember.java
│   ├── Task.java
│   ├── FlowtaskColumn.java
│   ├── Project.java
│   ├── Tag.java
│   ├── Comment.java
│   ├── ChatMessage.java
│   ├── GitRepo.java
│   ├── TaskCommit.java
│   ├── TaskAssignee.java
│   ├── ColumnAssignee.java
│   ├── ColumnFavorite.java
│   ├── ColumnArchive.java
│   └── Notification.java
│
├── config/                  # Spring Boot 설정
│   ├── SecurityConfig.java      # JWT 보안 설정
│   └── WebSocketConfig.java     # WebSocket STOMP 설정
│
├── security/                # 인증/인가 관련
│   ├── JwtTokenProvider.java    # JWT 토큰 생성 및 검증
│   └── JwtAuthenticationFilter.java # JWT 필터
│
├── dto/                     # Data Transfer Objects
│   ├── AuthResponse.java    # 로그인 응답
│   └── BoardEvent.java      # WebSocket 이벤트
│
└── FlowtaskApplication.java # 메인 애플리케이션
```

### 1.3 프론트엔드 구조 (`/frontend/src/`)
```
frontend/src/
├── api/                     # Axios API 호출 함수 (12개 파일)
│   ├── axiosInstance.js     # Axios 설정 및 인터셉터
│   ├── boardApi.js          # 보드, 컬럼, 태스크 API
│   ├── teamApi.js           # 팀 관련 API
│   ├── memberApi.js         # 회원 관련 API
│   ├── tagApi.js            # 태그 API
│   ├── commentApi.js        # 댓글 API
│   ├── chatApi.js           # 채팅 API
│   ├── gitApi.js            # Git 통합 API
│   ├── columnApi.js         # 컬럼 기능 API
│   ├── projectApi.js        # 프로젝트 API
│   ├── notificationApi.js   # 알림 API
│   └── websocketService.js  # WebSocket 서비스
│
├── pages/                   # 라우팅 페이지 (10개 파일)
│   ├── Board.js             # 칸반 보드 메인 페이지
│   ├── Login.js             # 로그인 페이지
│   ├── Register.js          # 회원가입 페이지
│   ├── TeamList.js          # 팀 목록 페이지
│   ├── Calendar.js          # 캘린더 페이지
│   ├── MyPage.js            # 마이페이지
│   ├── MyActivity.js        # 활동 내역 페이지
│   ├── Home.js              # 홈 페이지
│   ├── FindId.js            # 아이디 찾기
│   └── FindPassword.js      # 비밀번호 찾기
│
├── components/              # 재사용 가능한 UI 컴포넌트 (9개 파일)
│   ├── Sidebar.js           # 좌측 사이드바 (팀/프로젝트 선택)
│   ├── TaskModal.js         # 태스크 상세 모달 (편집, 검증, 태그)
│   ├── CommentSection.js    # 댓글 섹션
│   ├── ChatPanel.js         # 팀 채팅 패널
│   ├── FilterBar.js         # 필터링 바
│   ├── TagInput.js          # 태그 입력 컴포넌트
│   ├── GitRepoSettings.js   # Git 저장소 설정
│   ├── TaskCommits.js       # 태스크 연결 커밋 표시
│   └── NotificationBell.js  # 알림 벨 아이콘
│
├── App.js                   # 메인 App 컴포넌트 및 라우팅
├── index.js                 # React 진입점
├── App.css                  # 글로벌 스타일
└── index.css                # 기본 스타일
```

### 1.4 데이터베이스 구조 (`/database/`)
```
database/
├── postgresql_schema.sql    # 전체 스키마 (메인 파일)
├── init_all.sql            # 초기화 마스터 파일
├── 01_member.sql           # 회원 테이블
├── 02_team.sql             # 팀 관련 테이블
├── 03_board.sql            # 보드/컬럼/태스크 테이블
├── 04_tag.sql              # 태그 관련 테이블
├── 05_comment.sql          # 댓글 테이블
├── 06_chat.sql             # 채팅 메시지 테이블
├── 07_git.sql              # Git 저장소/커밋 테이블
├── 08_column_features.sql  # 컬럼 기능 테이블
├── 09_notification.sql     # 알림 테이블
├── 10_task_assignee.sql    # 태스크 복수 담당자 테이블
└── seed_data.sql           # 초기 데이터 (테스트 계정)
```

### 1.5 MyBatis Mapper XML 파일 (`/backend/src/main/resources/mapper/`)
```
mapper/
├── member.xml              # 회원 쿼리
├── team.xml                # 팀 쿼리
├── flowtaskcolumn.xml      # 컬럼 쿼리
├── task.xml                # 태스크 쿼리 (가장 큰 파일)
├── tag.xml                 # 태그 쿼리
├── comment.xml             # 댓글 쿼리
├── chatMessage.xml         # 채팅 쿼리
├── gitRepo.xml             # Git 저장소 쿼리
├── taskCommit.xml          # 태스크-커밋 연결 쿼리
├── taskAssignee.xml        # 복수 담당자 쿼리
├── columnAssignee.xml      # 컬럼 담당자 쿼리
├── columnFavorite.xml      # 컬럼 즐겨찾기 쿼리
├── columnArchive.xml       # 컬럼 아카이브 쿼리
├── notification.xml        # 알림 쿼리
└── project.xml             # 프로젝트 쿼리
```

---

## 2. 파일 명명 규칙 (File Naming Conventions)

### 2.1 백엔드 Java 파일

| 카테고리 | 명명 규칙 | 예시 | 설명 |
|---------|---------|------|------|
| **Controller** | `{Entity}Controller.java` | `TaskController.java` | REST 엔드포인트, PascalCase |
| **Service** | `{Entity}Service.java` | `TaskService.java` | 비즈니스 로직, PascalCase |
| **DAO** | `{Entity}Dao.java` | `TaskDao.java` | MyBatis 매퍼 인터페이스, PascalCase |
| **Model** | `{Entity}.java` | `Task.java` | 엔티티 클래스, PascalCase |
| **Config** | `{Purpose}Config.java` | `SecurityConfig.java` | Spring 설정 클래스, PascalCase |
| **Security** | `{Type}{Purpose}.java` | `JwtTokenProvider.java` | 보안 관련, PascalCase |
| **DTO** | `{Name}Response.java` | `AuthResponse.java` | 응답 객체, PascalCase |

**특이 사항:**
- `FlowtaskColumn` 클래스: "flowtask"라는 프로젝트명과 "Column"을 합쳐서 네이밍
- MyBatis `@Alias`: 소문자로 정의 (예: `@Alias("task")`, `@Alias("member")`)

### 2.2 프론트엔드 파일

| 카테고리 | 명명 규칙 | 예시 | 설명 |
|---------|---------|------|------|
| **페이지** | `{PageName}.js` | `Board.js`, `Login.js` | 라우팅 페이지, PascalCase |
| **컴포넌트** | `{ComponentName}.js` | `TaskModal.js`, `Sidebar.js` | 재사용 컴포넌트, PascalCase |
| **API 함수** | `{Feature}Api.js` | `boardApi.js`, `teamApi.js` | API 호출 함수, camelCase |
| **서비스** | `{Service}Service.js` | `websocketService.js` | 비즈니스 로직 서비스, camelCase |
| **스타일시트** | `{Component}.css` | `Board.css`, `TaskModal.css` | 컴포넌트 스타일, 컴포넌트명과 동일 |

### 2.3 데이터베이스 파일

| 유형 | 명명 규칙 | 예시 |
|------|---------|------|
| **스키마 파일** | `{Number}_{Entity}.sql` | `01_member.sql`, `03_board.sql` |
| **마스터 파일** | `{Type}_all.sql` 또는 스키마명 | `init_all.sql`, `postgresql_schema.sql` |
| **초기 데이터** | `seed_data.sql` | `seed_data.sql` |

### 2.4 MyBatis XML 파일

| 항목 | 명명 규칙 | 예시 |
|------|---------|------|
| **파일명** | `{entity}.xml` (소문자) | `task.xml`, `member.xml` |
| **네임스페이스** | `com.example.demo.dao.{Entity}Dao` | `com.example.demo.dao.TaskDao` |
| **SQL ID** | camelCase (메서드명과 동일) | `insert`, `listByColumn`, `updatePosition` |

---

## 3. 변수/필드 명명 규칙 (Variable/Field Naming Conventions)

### 3.1 Java 백엔드

**원칙: camelCase, 의미 있는 영문 사용**

| 유형 | 명명 규칙 | 예시 | 설명 |
|------|---------|------|------|
| **일반 변수** | camelCase | `taskId`, `columnName` | 소문자로 시작 |
| **상수** | UPPER_SNAKE_CASE | `MAX_POSITION`, `STATUS_PENDING` | 모두 대문자, 언더스코어 |
| **필드 접미사** | 명확한 의미 | `memberNo`, `dueDate`, `createdAt` | 무엇인지 명확하게 |
| **boolean** | `is{Name}` 또는 `has{Name}` | `isActive`, `hasVerifier` | - |
| **ID 필드** | `{Entity}Id` | `taskId`, `teamId`, `columnId` | 일관성 있는 ID 표기 |
| **Number 필드** | `{Entity}No` 또는 `{Entity}Id` | `memberNo`, `verifierNo` | Member는 `No` 사용 |

**백엔드 필드 네이밍 예시 (Task.java):**
```java
// 기본 필드
private int taskId;           // 태스크 ID
private int columnId;         // 속한 컬럼 ID
private String title;         // 제목
private String description;   // 설명
private int position;         // 위치 (순서)
private Date createdAt;       // 생성 시간

// 담당자 관련
private Integer assigneeNo;      // 담당자 (FK)
private String assigneeName;     // 담당자 이름 (JOIN)
private List<TaskAssignee> assignees;  // 복수 담당자

// 우선순위/상태
private String priority;      // CRITICAL, HIGH, MEDIUM, LOW
private String status;        // OPEN, IN_PROGRESS, RESOLVED, CLOSED

// 검증자 관련
private Integer verifierNo;          // 검증자 (FK)
private String verificationStatus;   // NONE, PENDING, APPROVED, REJECTED

// 관계 데이터
private List<Tag> tags;       // 태그 목록
```

### 3.2 JavaScript/React 프론트엔드

**원칙: camelCase, 상태/함수명은 의미 명확하게**

| 유형 | 명명 규칙 | 예시 | 설명 |
|------|---------|------|------|
| **상태 변수** | camelCase | `selectedTask`, `isLoading`, `teamMembers` | useState 변수 |
| **이벤트 핸들러** | `handle{Event}` | `handleChange`, `handleSubmit`, `handleClickOutside` | 이벤트 처리 함수 |
| **Fetch/조회 함수** | `fetch{Resource}` 또는 단순 함수명 | `fetchTeamMembers`, `loadColumns` | - |
| **상수** | camelCase | `API_BASE_URL`, `STATUS_LABELS` | 객체 상수도 camelCase |
| **boolean 함수** | `is{Condition}` | `isOpen`, `isLoading`, `isFavorite` | 상태 확인 |
| **Ref** | `{Name}Ref` | `columnsContainerRef`, `assigneeDropdownRef` | useRef 변수 |

**프론트엔드 상태 예시 (Board.js):**
```javascript
// 기본 상태
const [columns, setColumns] = useState([]);
const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(true);

// 선택/편집 상태
const [selectedTask, setSelectedTask] = useState(null);
const [editingColumn, setEditingColumn] = useState(null);
const [editingTask, setEditingTask] = useState(null);

// 로그인 정보
const [loginMember, setLoginMember] = useState(null);
const [currentTeam, setCurrentTeam] = useState(null);

// UI 상태
const [sidebarOpen, setSidebarOpen] = useState(true);
const [chatOpen, setChatOpen] = useState(false);

// 필터 상태
const [filters, setFilters] = useState({
    searchQuery: '',
    priorities: [],
    statuses: [],
    tags: [],
    assigneeNo: null,
    dueDateFilter: ''
});

// 컬럼 기능 상태
const [columnAssignees, setColumnAssignees] = useState({});  // { columnId: [...] }
const [columnFavorites, setColumnFavoritesState] = useState({});
const [columnMenuOpen, setColumnMenuOpen] = useState(null);
```

### 3.3 데이터베이스 필드명

**원칙: snake_case, 명확한 영어, 타입 구분**

| 유형 | 패턴 | 예시 |
|------|------|------|
| **ID/FK** | `{entity}_id` | `task_id`, `column_id`, `team_id` |
| **Number ID** | `{entity}_no` | `member_no`, `verifier_no` |
| **텍스트** | `{adjective}_{noun}` | `team_name`, `task_title`, `user_id` |
| **날짜/시간** | `{verb}_at` | `created_at`, `updated_at`, `due_date` |
| **상태** | snake_case | `verification_status`, `archive_notes` |
| **시퀀스** | `flowtask_{entity}_seq` | `flowtask_task_seq`, `flowtask_member_seq` |

---

## 4. 데이터베이스 명명 규칙 (Database Naming Conventions)

### 4.1 테이블명

**규칙: `flowtask_{entity}` (모두 소문자, 언더스코어 구분자)**

```sql
-- 핵심 엔티티
flowtask_member              -- 회원
flowtask_team                -- 팀
flowtask_team_member         -- 팀 멤버 (다대다)
flowtask_project             -- 프로젝트
flowtask_column              -- 칸반 컬럼
flowtask_task                -- 태스크

-- 관계/추가 기능
flowtask_task_tag            -- 태스크-태그 매핑
flowtask_tag                 -- 태그
flowtask_comment             -- 댓글
flowtask_chat_message        -- 채팅 메시지
flowtask_git_repo            -- Git 저장소
flowtask_task_commit         -- 태스크-커밋 연결
flowtask_task_assignee       -- 복수 담당자
flowtask_column_assignee     -- 컬럼 담당자
flowtask_column_favorite     -- 컬럼 즐겨찾기
flowtask_column_archive      -- 컬럼 아카이브
flowtask_notification        -- 알림
```

### 4.2 컬럼명

**규칙: snake_case, 의미 명확**

| 컬럼 유형 | 패턴 | 예시 |
|----------|------|------|
| **Primary Key** | `{entity}_id` 또는 `{entity}_no` | `task_id`, `member_no` |
| **Foreign Key** | `{entity}_{id/no}` | `column_id`, `member_no` |
| **이름** | `{descriptor}_name` | `team_name`, `tag_name` |
| **설명** | `description` 또는 `{descriptor}_notes` | `description`, `archive_notes` |
| **상태** | `{descriptor}_status` | `status`, `verification_status` |
| **시간** | `{verb}_at` | `created_at`, `updated_at`, `verified_at` |
| **기타** | snake_case | `due_date`, `access_token`, `repo_owner` |

**테이블 예시 - flowtask_task:**
```sql
CREATE TABLE flowtask_task (
    task_id INTEGER PRIMARY KEY,              -- 태스크 ID
    column_id INTEGER NOT NULL,               -- 소속 컬럼 FK
    title VARCHAR(200) NOT NULL,              -- 제목
    description TEXT,                         -- 설명
    position INTEGER DEFAULT 0,               -- 위치
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 생성 시간

    -- Issue Tracker 필드
    assignee_no INTEGER REFERENCES flowtask_member(no),  -- 담당자
    priority VARCHAR(20) DEFAULT 'MEDIUM',    -- 우선순위
    due_date TIMESTAMP,                       -- 마감일
    status VARCHAR(30) DEFAULT 'OPEN',        -- 상태

    -- 검증자 필드
    verifier_no INTEGER REFERENCES flowtask_member(no),  -- 검증자
    verified_at TIMESTAMP,                    -- 검증 완료 시간
    verification_status VARCHAR(20) DEFAULT 'NONE',  -- 검증 상태
    verification_notes VARCHAR(1000)          -- 검증 메모
);
```

### 4.3 인덱스명

**규칙: `idx_{table}_{column}` 또는 `idx_{descriptor}`**

```sql
-- 단순 인덱스
CREATE INDEX idx_flowtask_member_userid ON flowtask_member(userid);
CREATE INDEX idx_flowtask_member_email ON flowtask_member(email);

-- 복합 인덱스
CREATE INDEX idx_flowtask_task_position ON flowtask_task(column_id, position);

-- 외래키 인덱스
CREATE INDEX idx_team_leader ON flowtask_team(leader_no);
CREATE INDEX idx_task_assignee ON flowtask_task(assignee_no);

-- 상태/시간 기반 인덱스
CREATE INDEX idx_task_status ON flowtask_task(status);
CREATE INDEX idx_chat_sent ON flowtask_chat_message(sent_at DESC);
```

### 4.4 시퀀스명

**규칙: `flowtask_{entity}_seq`**

```sql
CREATE SEQUENCE flowtask_member_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_team_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_project_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_column_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_task_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_tag_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_comment_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flowtask_chat_seq START WITH 1 INCREMENT BY 1;
```

---

## 5. API 명명 규칙 (API Naming Conventions)

### 5.1 엔드포인트 패턴

**기본 규칙: `/api/{action}` 또는 `/api/{resource}/{id}/{action}`**

```
패턴: /api/{entity}{action}

예시:
  POST   /api/taskwrite           # 태스크 생성
  GET    /api/tasklist            # 전체 태스크 목록
  GET    /api/tasklist/{columnId} # 컬럼별 태스크
  GET    /api/taskcontent/{taskId} # 태스크 상세
  PUT    /api/taskupdate          # 태스크 수정
  DELETE /api/taskdelete/{taskId} # 태스크 삭제
```

### 5.2 HTTP 메서드별 엔드포인트

| HTTP 메서드 | 패턴 | 예시 | 설명 |
|-----------|------|------|------|
| **POST** | `/api/{entity}write` | `/api/taskwrite` | 생성 |
| **GET** | `/api/{entity}list` | `/api/tasklist` | 목록 조회 |
| **GET** | `/api/{entity}list/{id}` | `/api/tasklist/team/{teamId}` | 필터링 목록 |
| **GET** | `/api/{entity}content/{id}` | `/api/taskcontent/{taskId}` | 상세 조회 |
| **PUT** | `/api/{entity}update` | `/api/taskupdate` | 수정 (Body 포함) |
| **PUT** | `/api/{entity}/{id}/{action}` | `/api/task/{taskId}/status` | 부분 수정 |
| **DELETE** | `/api/{entity}delete/{id}` | `/api/taskdelete/{taskId}` | 삭제 |

**특이 사항:**
- "list" 사용: 컬렉션 반환
- "content" 사용: 단일 엔티티 상세 조회
- "write" 사용: 생성 (create 대신)
- "update" 사용: 전체/부분 수정

### 5.3 Task 관련 엔드포인트 전체 목록

```
기본 CRUD
  POST   /api/taskwrite
  GET    /api/tasklist
  GET    /api/tasklist/{columnId}
  GET    /api/taskcontent/{taskId}
  PUT    /api/taskupdate
  DELETE /api/taskdelete/{taskId}

필터링/범위 조회
  GET    /api/tasklist/team/{teamId}
  GET    /api/tasklist/project/{projectId}
  GET    /api/tasklist/assignee/{memberNo}
  GET    /api/tasklist/team/{teamId}/status/{status}
  GET    /api/tasklist/team/{teamId}/calendar

위치 변경 (드래그앤드롭)
  PUT    /api/taskposition

상태 관리
  PUT    /api/task/{taskId}/status
  PUT    /api/task/{taskId}/assignee?senderNo={senderNo}

검증자/검증 (Verification)
  PUT    /api/task/{taskId}/verifier
  PUT    /api/task/{taskId}/verify/approve
  PUT    /api/task/{taskId}/verify/reject
  GET    /api/tasklist/verification/pending/{memberNo}

복수 담당자 (Multiple Assignees)
  GET    /api/task/{taskId}/assignees
  POST   /api/task/{taskId}/assignees?senderNo={senderNo}
  DELETE /api/task/{taskId}/assignees/{memberNo}
  PUT    /api/task/{taskId}/assignees?senderNo={senderNo}
```

### 5.4 프론트엔드 API 함수명 (boardApi.js 예시)

```javascript
// 기본 CRUD
export const taskwrite = async (task) => { ... }          // 생성
export const tasklist = async () => { ... }               // 전체 목록
export const taskcontent = async (taskId) => { ... }      // 상세 조회
export const taskupdate = async (task) => { ... }         // 수정
export const taskdelete = async (taskId) => { ... }       // 삭제
export const taskposition = async (task) => { ... }       // 위치 변경

// 필터링
export const tasklistByTeam = async (teamId) => { ... }
export const tasklistByColumn = async (columnId) => { ... }
export const tasklistByProject = async (projectId) => { ... }
export const tasklistByAssignee = async (memberNo) => { ... }
export const tasklistByStatusAndTeam = async (teamId, status) => { ... }

// 부분 수정
export const updateTaskStatus = async (taskId, status) => { ... }
export const updateTaskAssignee = async (taskId, assigneeNo, senderNo = null) => { ... }

// 검증
export const updateTaskVerifier = async (taskId, verifierNo) => { ... }
export const approveTask = async (taskId, verificationNotes = '') => { ... }
export const rejectTask = async (taskId, verificationNotes = '') => { ... }

// 복수 담당자
export const getTaskAssignees = async (taskId) => { ... }
export const addTaskAssignee = async (taskId, memberNo, senderNo = null) => { ... }
export const updateTaskAssignees = async (taskId, memberNos, senderNo = null) => { ... }
```

---

## 6. 컴포넌트 관계도 (Component Relationships)

### 6.1 백엔드 레이어 구조 (MVC/Service 패턴)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React)                            │
│                   (Frontend API calls)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP Request
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Controller Layer                            │
│        (REST Endpoints: /api/taskwrite, etc.)              │
│  TaskController, MemberController, TeamController, etc.     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│      (Business Logic: 알림, 검증, 복합 처리)               │
│  TaskService, MemberService, BoardNotificationService       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DAO Layer                                │
│        (MyBatis Mapper Interface: Query 호출)               │
│  TaskDao.java → task.xml, MemberDao.java → member.xml       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Executes
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│           PostgreSQL (flowtask_task, flowtask_member)       │
└─────────────────────────────────────────────────────────────┘
```

**예시: Task 생성 플로우**
```
1. Client: POST /api/taskwrite { title: "...", columnId: 1 }
                    ↓
2. TaskController.taskwrite()
                    ↓
3. TaskService.insert(Task task)
   - Task 생성 실행
   - FlowtaskColumn 조회
   - BoardNotificationService.notifyTaskCreated() 호출
   - WebSocket 브로드캐스트
                    ↓
4. TaskDao.insert(Task task)
                    ↓
5. task.xml <insert id="insert"> SQL 실행
                    ↓
6. PostgreSQL INSERT INTO flowtask_task
                    ↓
7. 응답: Integer (성공=1, 실패=0)
```

### 6.2 프론트엔드 컴포넌트 계층

```
┌─────────────────────────────────────────┐
│              App.js                      │
│          (라우팅 및 권한 검사)           │
└────────┬────────────────────────────────┘
         │
         ├─ Login.js (로그인)
         ├─ Register.js (가입)
         ├─ TeamList.js (팀 선택)
         └─ Board.js (메인 보드)
              │
              ├─ Sidebar (팀/프로젝트 선택)
              │   └─ Navigation Links
              │
              ├─ FilterBar (필터/검색)
              │
              ├─ DragDropContext (@hello-pangea/dnd)
              │   ├─ Droppable (Column)
              │   │   ├─ Column Title
              │   │   ├─ Column Menu (∨)
              │   │   │   ├─ Archive Column
              │   │   │   ├─ Column Assignees
              │   │   │   └─ Toggle Favorite
              │   │   │
              │   │   └─ Draggable (Task Cards)
              │   │       ├─ Task Basic Info
              │   │       ├─ Task Tags
              │   │       ├─ Task Priority Badge
              │   │       ├─ Task Status Badge
              │   │       └─ [Click] → TaskModal
              │   │
              │   └─ New Column Input
              │
              ├─ TaskModal (태스크 상세)
              │   ├─ Details Tab
              │   │   ├─ Title, Description
              │   │   ├─ Status Selector
              │   │   ├─ Priority Selector
              │   │   ├─ Due Date Picker
              │   │   ├─ Assignees (복수)
              │   │   ├─ Verifier Selector
              │   │   ├─ Verification Status
              │   │   └─ TagInput
              │   ├─ Comments Tab
              │   │   └─ CommentSection
              │   └─ Commits Tab
              │       └─ TaskCommits
              │
              ├─ ChatPanel (팀 채팅)
              │   ├─ Chat Message List
              │   └─ Message Input
              │
              └─ NotificationBell (알림)
                  └─ Notification Dropdown
```

---

## 7. 주요 파일 및 역할 (Key Files and Roles)

### 7.1 백엔드 핵심 파일

| 파일 | 위치 | 역할 |
|------|------|------|
| **FlowtaskApplication.java** | `/backend/src/main/java/com/example/demo/` | Spring Boot 메인 진입점, @SpringBootApplication |
| **SecurityConfig.java** | `/config/` | JWT 보안 설정, 공개 엔드포인트 정의 |
| **WebSocketConfig.java** | `/config/` | STOMP 웹소켓 설정, 메시지 브로커 구성 |
| **JwtTokenProvider.java** | `/security/` | JWT 토큰 생성/검증/파싱 |
| **JwtAuthenticationFilter.java** | `/security/` | 요청 인터셉터, 토큰 검증 필터 |
| **application.properties** | `/resources/` | 포트, DB, JWT, MyBatis 설정 |
| **pom.xml** | `/backend/` | Maven 의존성 정의 |

### 7.2 백엔드 엔티티/모델 (중요도 순)

| 엔티티 | 파일 | 주요 필드 | 설명 |
|--------|------|---------|------|
| **Task** | Task.java | taskId, columnId, title, status, assigneeNo, verifierNo | 칸반 보드의 카드 |
| **FlowtaskColumn** | FlowtaskColumn.java | columnId, title, position, teamId, projectId | 칸반 컬럼 |
| **Team** | Team.java | teamId, teamName, teamCode, leaderNo | 팀 (다중 사용자) |
| **Member** | Member.java | no, userid, password, name, email | 사용자 계정 |
| **TeamMember** | TeamMember.java | teamId, memberNo, role | 팀-멤버 매핑 |
| **Project** | Project.java | projectId, teamId, projectName | 프로젝트 |
| **Tag** | Tag.java | tagId, teamId, tagName, color | 태스크 태그 |
| **TaskAssignee** | TaskAssignee.java | taskId, memberNo | 복수 담당자 |
| **Comment** | Comment.java | commentId, taskId, authorNo, content | 태스크 댓글 |
| **ChatMessage** | ChatMessage.java | messageId, teamId, senderNo, content | 팀 채팅 |
| **Notification** | Notification.java | notificationId, recipientNo, type | 알림 |
| **ColumnFavorite** | ColumnFavorite.java | teamId, memberNo, columnId | 컬럼 즐겨찾기 |

### 7.3 서비스 계층 (Service)

| 서비스 | 주요 메서드 |
|--------|-----------|
| **TaskService** | insert, update, delete, listByColumn, updateStatus, updateAssignee, updateVerifier, updateVerification |
| **MemberService** | insert (회원가입), authenticate (로그인), findByUserid, checkUserid |
| **TeamService** | insertTeam, getTeamMembers, addTeamMember |
| **FlowtaskColumnService** | insertColumn, updateColumn, deleteColumn, listByTeam |
| **BoardNotificationService** | notifyTaskCreated, notifyTaskUpdated, notifyTaskDeleted, notifyTaskMoved |
| **NotificationService** | notifyTaskUpdated, notifyTaskAssignee (영구 알림) |

### 7.4 프론트엔드 핵심 파일

| 파일 | 위치 | 역할 |
|------|------|------|
| **App.js** | `/frontend/src/` | 라우팅, 전체 레이아웃 |
| **axiosInstance.js** | `/api/` | Axios 설정, 토큰 인터셉터 |
| **websocketService.js** | `/api/` | WebSocket 연결, STOMP 메시지 |
| **boardApi.js** | `/api/` | 태스크/컬럼 관련 API 함수 |
| **Board.js** | `/pages/` | 칸반 보드 메인 페이지, 상태 관리 |
| **TaskModal.js** | `/components/` | 태스크 상세 모달, 편집 폼 |
| **Sidebar.js** | `/components/` | 팀/프로젝트 선택 메뉴 |
| **package.json** | `/frontend/` | npm 의존성, 빌드 설정 |

---

## 8. 전체 엔티티 관계도 (Entity Relationship Diagram)

```
┌──────────────────────────────────────────────────────────────┐
│                    flowtask_member (회원)                     │
│  no (PK)  │ userid │ password │ name │ email │ phone │      │
└────┬───────────────────────────────────────────────────────┬──┘
     │                                                        │
     │ 1:N (leader_no)                                   N:1 (member_no)
     │                                                        │
┌────▼────────────────────────────────────────────┬──────────▼──┐
│             flowtask_team (팀)                  │             │
│  team_id (PK) │ team_name │ team_code │ ...    │             │
└────┬──────────────────────────────────────┬─────┘             │
     │                                      │                   │
     │ 1:N                            N:M (flowtask_team_member)│
     │                                      └───────────────────┘
     │
     │ 1:N
     ▼
┌────────────────────────────────────────────────────────────────┐
│              flowtask_project (프로젝트)                        │
│  project_id (PK) │ team_id (FK) │ project_name                │
└────┬─────────────────────────────────────────────────────────┘
     │
     │ 1:N
     ▼
┌────────────────────────────────────────────────────────────────┐
│              flowtask_column (칸반 컬럼)                         │
│  column_id (PK) │ team_id (FK) │ project_id (FK) │ title      │
└────┬─────────────────────────────────────────────────────────┘
     │
     │ 1:N
     ▼
┌────────────────────────────────────────────────────────────────┐
│              flowtask_task (태스크)                             │
│  task_id (PK) │ column_id (FK) │ title │ status │             │
│  assignee_no (FK to member) │ verifier_no (FK) │ ...         │
└────┬────────────────────┬───────────────────────────────────┘
     │                    │
     │ 1:N          N:M (flowtask_task_tag)
     │                    │
     │                    ▼
     │    ┌──────────────────────────┐
     │    │  flowtask_tag (태그)      │
     │    │  tag_id (PK) │ team_id   │
     │    │  tag_name │ color       │
     │    └──────────────────────────┘
     │
     │ 1:N
     ▼
┌────────────────────────────────────────────────────────────────┐
│              flowtask_comment (댓글)                            │
│  comment_id (PK) │ task_id (FK) │ author_no (FK) │ content    │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. 개발 가이드라인 요약

### 9.1 새로운 기능 추가 시 체크리스트

**백엔드 추가:**
1. [ ] `Model` 클래스 생성 (예: `Feature.java`) - `@Data` 및 `@Alias("feature")` 추가
2. [ ] `DAO` 인터페이스 생성 (예: `FeatureDao.java`) - `@Mapper` 애너테이션
3. [ ] `Service` 클래스 생성 (예: `FeatureService.java`) - `@Service` 애너테이션
4. [ ] `Controller` 클래스 생성 (예: `FeatureController.java`) - `@RestController`
5. [ ] MyBatis XML 매퍼 생성 (예: `feature.xml`)
6. [ ] 데이터베이스 스키마 생성 - 테이블명: `flowtask_feature`

**프론트엔드 추가:**
1. [ ] API 함수 생성 (예: `featureApi.js`)
2. [ ] 페이지/컴포넌트 생성 - PascalCase
3. [ ] 상태 관리 (useState) - camelCase
4. [ ] 라우팅 추가 (App.js)

### 9.2 명명 규칙 요약

| 계층 | 규칙 | 예시 |
|------|------|------|
| **Java 클래스** | PascalCase | `TaskController`, `TaskService` |
| **Java 변수/필드** | camelCase | `taskId`, `columnName` |
| **JavaScript 변수** | camelCase | `selectedTask`, `isLoading` |
| **이벤트 핸들러** | handle{Event} | `handleSubmit`, `handleChange` |
| **DB 테이블** | flowtask_{entity} | `flowtask_task`, `flowtask_member` |
| **DB 컬럼** | snake_case | `task_id`, `created_at` |
| **API 엔드포인트** | /api/{entity}{action} | `/api/taskwrite`, `/api/tasklist` |

---

## 10. 참고 자료

### 10.1 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| **Backend** | Spring Boot | 3.2.0 |
| | Java | 17 |
| | MyBatis | 3.0.3 |
| | JWT | 0.12.3 |
| **Frontend** | React | 18+ |
| | Axios | (npm) |
| | @hello-pangea/dnd | (드래그앤드롭) |
| **Real-time** | WebSocket (STOMP) | Spring Boot 포함 |
| **Database** | PostgreSQL | 14+ |

### 10.2 포트 및 URL

```
Backend API:    http://localhost:8081
Frontend Dev:   http://localhost:3000
WebSocket:      ws://localhost:8081/ws
Database:       localhost:5432
```

### 10.3 테스트 계정

| userid | password | role |
|--------|----------|------|
| admin | 1234 | Team owner |
| user1 | 1234 | Team member |
| user2 | 1234 | Team member |
| user3 | 1234 | Team member |
