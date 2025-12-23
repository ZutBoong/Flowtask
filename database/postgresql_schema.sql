-- =============================================
-- Flowtask - PostgreSQL Schema
-- Docker + Spring Boot 공용
-- =============================================

-- ========================================
-- 시퀀스 생성
-- ========================================
CREATE SEQUENCE IF NOT EXISTS flowtask_member_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_team_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_project_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_column_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_task_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_comment_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_chat_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_task_archive_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_file_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_email_verification_seq START WITH 1 INCREMENT BY 1;

-- ========================================
-- 회원 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_member (
    no INTEGER PRIMARY KEY,
    userid VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    profile_image VARCHAR(500),
    register TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flowtask_member_userid ON flowtask_member(userid);
CREATE INDEX IF NOT EXISTS idx_flowtask_member_email ON flowtask_member(email);

-- ========================================
-- 팀 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_team (
    team_id INTEGER PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_code VARCHAR(20) NOT NULL UNIQUE,
    leader_no INTEGER NOT NULL REFERENCES flowtask_member(no),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_leader ON flowtask_team(leader_no);
CREATE INDEX IF NOT EXISTS idx_team_code ON flowtask_team(team_code);

-- ========================================
-- 팀 멤버 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_team_member (
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_teammember_team ON flowtask_team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_teammember_member ON flowtask_team_member(member_no);

-- ========================================
-- 프로젝트 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_project (
    project_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    project_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_team ON flowtask_project(team_id);

-- ========================================
-- 컬럼 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_column (
    column_id INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    team_id INTEGER REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES flowtask_project(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flowtask_column_position ON flowtask_column(position);
CREATE INDEX IF NOT EXISTS idx_flowtask_column_team ON flowtask_column(team_id);
CREATE INDEX IF NOT EXISTS idx_flowtask_column_project ON flowtask_column(project_id);

-- ========================================
-- 태스크 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_task (
    task_id INTEGER PRIMARY KEY,
    column_id INTEGER NOT NULL REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Issue tracker fields
    assignee_no INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    -- Workflow fields
    workflow_status VARCHAR(20) DEFAULT 'WAITING',
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    rejected_by INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flowtask_task_column ON flowtask_task(column_id);
CREATE INDEX IF NOT EXISTS idx_flowtask_task_position ON flowtask_task(column_id, position);
CREATE INDEX IF NOT EXISTS idx_task_assignee ON flowtask_task(assignee_no);
CREATE INDEX IF NOT EXISTS idx_task_workflow_status ON flowtask_task(workflow_status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON flowtask_task(priority);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON flowtask_task(due_date);
CREATE INDEX IF NOT EXISTS idx_task_start_date ON flowtask_task(start_date);

-- ========================================
-- 댓글 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_comment (
    comment_id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    author_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_task ON flowtask_comment(task_id);
CREATE INDEX IF NOT EXISTS idx_comment_created ON flowtask_comment(created_at DESC);

-- ========================================
-- 채팅 메시지 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_chat_message (
    message_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    sender_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_team ON flowtask_chat_message(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_sent ON flowtask_chat_message(sent_at DESC);


-- ========================================
-- 태스크 즐겨찾기 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_task_favorite (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_favorite_task ON flowtask_task_favorite(task_id);
CREATE INDEX IF NOT EXISTS idx_task_favorite_member ON flowtask_task_favorite(member_no);

-- ========================================
-- 태스크 아카이브 테이블 (아카이브된 태스크 스냅샷 저장)
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_task_archive (
    archive_id INTEGER PRIMARY KEY,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    original_task_id INTEGER NOT NULL,
    team_id INTEGER,
    team_name VARCHAR(100),
    column_id INTEGER,
    column_title VARCHAR(100),
    task_snapshot JSONB NOT NULL,
    archive_note VARCHAR(500),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_archive_member ON flowtask_task_archive(member_no);
CREATE INDEX IF NOT EXISTS idx_task_archive_team ON flowtask_task_archive(team_id);
CREATE INDEX IF NOT EXISTS idx_task_archive_archived ON flowtask_task_archive(archived_at DESC);

-- ========================================
-- 알림 테이블
-- ========================================
CREATE SEQUENCE IF NOT EXISTS flowtask_notification_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_notification (
    notification_id INTEGER PRIMARY KEY,
    recipient_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    sender_no INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(500),
    team_id INTEGER REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    column_id INTEGER REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON flowtask_notification(recipient_no);
CREATE INDEX IF NOT EXISTS idx_notification_type ON flowtask_notification(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_read ON flowtask_notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON flowtask_notification(created_at DESC);

-- ========================================
-- 태스크 담당자 테이블 (복수 담당자 지원)
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_task_assignee (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    -- Workflow fields (NEW)
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_assignee_task ON flowtask_task_assignee(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_member ON flowtask_task_assignee(member_no);

-- ========================================
-- 태스크 검증자 테이블 (복수 검증자 지원) - NEW
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_task_verifier (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_verifier_task ON flowtask_task_verifier(task_id);
CREATE INDEX IF NOT EXISTS idx_task_verifier_member ON flowtask_task_verifier(member_no);

-- ========================================
-- 파일 테이블 (프로젝트/태스크 첨부파일)
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_file (
    file_id INTEGER PRIMARY KEY,
    team_id INTEGER REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    uploader_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_team ON flowtask_file(team_id);
CREATE INDEX IF NOT EXISTS idx_file_task ON flowtask_file(task_id);
CREATE INDEX IF NOT EXISTS idx_file_uploader ON flowtask_file(uploader_no);
CREATE INDEX IF NOT EXISTS idx_file_uploaded ON flowtask_file(uploaded_at DESC);

-- ========================================
-- 이메일 인증 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS flowtask_email_verification (
    id INTEGER PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_email ON flowtask_email_verification(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_code ON flowtask_email_verification(code);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON flowtask_email_verification(expires_at);

-- ========================================
-- 샘플 데이터 초기화 (기존 데이터 삭제)
-- ========================================
DELETE FROM flowtask_email_verification;
DELETE FROM flowtask_task_favorite;
DELETE FROM flowtask_task_verifier;
DELETE FROM flowtask_task_assignee;
DELETE FROM flowtask_comment;
DELETE FROM flowtask_task;
DELETE FROM flowtask_column;
DELETE FROM flowtask_project;
DELETE FROM flowtask_chat_message;
DELETE FROM flowtask_team_member;
DELETE FROM flowtask_team;
DELETE FROM flowtask_member;

-- 시퀀스 초기화
ALTER SEQUENCE flowtask_member_seq RESTART WITH 1;
ALTER SEQUENCE flowtask_team_seq RESTART WITH 1;
ALTER SEQUENCE flowtask_project_seq RESTART WITH 1;
ALTER SEQUENCE flowtask_column_seq RESTART WITH 1;
ALTER SEQUENCE flowtask_task_seq RESTART WITH 1;
ALTER SEQUENCE flowtask_comment_seq RESTART WITH 1;
ALTER SEQUENCE flowtask_chat_seq RESTART WITH 1;

-- ========================================
-- 샘플 데이터: 회원
-- ========================================
INSERT INTO flowtask_member (no, userid, password, name, email, phone, email_verified) VALUES
(nextval('flowtask_member_seq'), 'admin', '$2a$10$XJ7z8f9kCf.IYc8xFfqEm.CZW5v8Cd5yRz0w1a8qV9xOJLz9Z1Zr2', '김팀장', 'admin@flowtask.com', '010-1111-1111', TRUE),
(nextval('flowtask_member_seq'), 'user1', '$2a$10$XJ7z8f9kCf.IYc8xFfqEm.CZW5v8Cd5yRz0w1a8qV9xOJLz9Z1Zr2', '이프론트', 'frontend@flowtask.com', '010-2222-2222', TRUE),
(nextval('flowtask_member_seq'), 'user2', '$2a$10$XJ7z8f9kCf.IYc8xFfqEm.CZW5v8Cd5yRz0w1a8qV9xOJLz9Z1Zr2', '박백엔드', 'backend@flowtask.com', '010-3333-3333', TRUE),
(nextval('flowtask_member_seq'), 'user3', '$2a$10$XJ7z8f9kCf.IYc8xFfqEm.CZW5v8Cd5yRz0w1a8qV9xOJLz9Z1Zr2', '최데브옵스', 'devops@flowtask.com', '010-4444-4444', TRUE),
(nextval('flowtask_member_seq'), 'user4', '$2a$10$XJ7z8f9kCf.IYc8xFfqEm.CZW5v8Cd5yRz0w1a8qV9xOJLz9Z1Zr2', '정디자이너', 'designer@flowtask.com', '010-5555-5555', TRUE);

-- ========================================
-- 샘플 데이터: 팀
-- ========================================
INSERT INTO flowtask_team (team_id, team_name, team_code, leader_no, description) VALUES
(nextval('flowtask_team_seq'), 'Flowtask 개발팀', 'TEAM2024', 1, '칸반 보드 협업 툴 개발 프로젝트');

-- ========================================
-- 샘플 데이터: 팀 멤버
-- ========================================
INSERT INTO flowtask_team_member (team_id, member_no, role) VALUES
(1, 1, 'LEADER'),
(1, 2, 'MEMBER'),
(1, 3, 'MEMBER'),
(1, 4, 'MEMBER'),
(1, 5, 'MEMBER');

-- ========================================
-- 샘플 데이터: 프로젝트
-- ========================================
INSERT INTO flowtask_project (project_id, team_id, project_name) VALUES
(nextval('flowtask_project_seq'), 1, 'Flowtask v1.0');

-- ========================================
-- 샘플 데이터: 컬럼 (작업 단위별)
-- ========================================
INSERT INTO flowtask_column (column_id, title, position, team_id, project_id) VALUES
(nextval('flowtask_column_seq'), '프론트엔드', 0, 1, 1),
(nextval('flowtask_column_seq'), '백엔드', 1, 1, 1),
(nextval('flowtask_column_seq'), '데이터베이스', 2, 1, 1),
(nextval('flowtask_column_seq'), 'DevOps', 3, 1, 1),
(nextval('flowtask_column_seq'), '디자인/UI', 4, 1, 1);

-- ========================================
-- 샘플 데이터: 태스크 (프론트엔드)
-- ========================================
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, workflow_status) VALUES
(nextval('flowtask_task_seq'), 1, '로그인 페이지 UI 구현', 'React로 로그인 폼 컴포넌트 개발', 0, 2, 'HIGH', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 1, '회원가입 폼 유효성 검사', '이메일, 비밀번호 형식 검증 로직 추가', 1, 2, 'MEDIUM', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '칸반 보드 드래그 앤 드롭 구현', 'react-beautiful-dnd 라이브러리 활용', 2, 2, 'HIGH', NOW() - INTERVAL '7 days', NOW() + INTERVAL '1 day', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 1, '태스크 카드 컴포넌트 디자인', '태스크 카드 레이아웃 및 스타일링', 3, 2, 'MEDIUM', NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '컬럼 추가/삭제 기능', '컬럼 관리 UI 및 로직 구현', 4, 2, 'MEDIUM', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '태스크 상세 모달 개선', '댓글, 첨부파일 UI 추가', 5, 2, 'LOW', NOW(), NOW() + INTERVAL '7 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '팀 멤버 초대 UI', '멤버 초대 폼 및 팀 코드 입력', 6, 2, 'MEDIUM', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '알림 센터 구현', '실시간 알림 표시 컴포넌트', 7, 2, 'LOW', NOW(), NOW() + INTERVAL '10 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '다크모드 지원', '테마 전환 기능 추가', 8, 2, 'LOW', NOW(), NOW() + INTERVAL '14 days', 'WAITING'),
(nextval('flowtask_task_seq'), 1, '반응형 디자인 적용', '모바일 화면 대응', 9, 2, 'MEDIUM', NOW(), NOW() + INTERVAL '8 days', 'WAITING');

-- ========================================
-- 샘플 데이터: 태스크 (백엔드)
-- ========================================
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, workflow_status) VALUES
(nextval('flowtask_task_seq'), 2, 'JWT 인증 시스템 구축', 'Spring Security + JWT 토큰 기반 인증', 0, 3, 'HIGH', NOW() - INTERVAL '6 days', NOW() + INTERVAL '1 day', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 2, '회원가입 API 개발', '회원가입 엔드포인트 및 비밀번호 암호화', 1, 3, 'HIGH', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 2, '권한 관리 시스템', 'ROLE 기반 권한 체크 로직', 2, 3, 'MEDIUM', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 'WAITING'),
(nextval('flowtask_task_seq'), 2, '태스크 CRUD API', '태스크 생성/조회/수정/삭제 엔드포인트', 3, 3, 'HIGH', NOW() - INTERVAL '8 days', NOW(), 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 2, '컬럼 관리 API', '컬럼 CRUD 및 순서 변경 API', 4, 3, 'HIGH', NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', 'WAITING'),
(nextval('flowtask_task_seq'), 2, '드래그 앤 드롭 위치 저장', '태스크 위치 업데이트 API', 5, 3, 'MEDIUM', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'WAITING'),
(nextval('flowtask_task_seq'), 2, '댓글 시스템 API', '댓글 작성/수정/삭제 엔드포인트', 6, 3, 'MEDIUM', NOW() - INTERVAL '3 days', NOW() + INTERVAL '3 days', 'WAITING'),
(nextval('flowtask_task_seq'), 2, '팀 생성 및 관리 API', '팀 CRUD 및 멤버 관리', 7, 3, 'HIGH', NOW() - INTERVAL '7 days', NOW() + INTERVAL '1 day', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 2, 'WebSocket 실시간 통신', 'STOMP 프로토콜로 실시간 업데이트', 8, 3, 'HIGH', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 2, '파일 업로드 API', '이미지 및 파일 첨부 기능', 9, 3, 'MEDIUM', NOW(), NOW() + INTERVAL '6 days', 'WAITING'),
(nextval('flowtask_task_seq'), 2, '검색 및 필터링 API', '태스크 검색, 필터링 엔드포인트', 10, 3, 'LOW', NOW(), NOW() + INTERVAL '9 days', 'WAITING'),
(nextval('flowtask_task_seq'), 2, '알림 발송 시스템', '이벤트 기반 알림 생성 및 전송', 11, 3, 'MEDIUM', NOW(), NOW() + INTERVAL '7 days', 'WAITING');

-- ========================================
-- 샘플 데이터: 태스크 (데이터베이스)
-- ========================================
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, workflow_status) VALUES
(nextval('flowtask_task_seq'), 3, 'ERD 설계 및 정규화', '데이터베이스 스키마 설계', 0, 3, 'HIGH', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 3, '회원 테이블 생성', 'flowtask_member 테이블 및 인덱스', 1, 3, 'HIGH', NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 3, '팀/프로젝트 테이블 생성', 'flowtask_team, flowtask_project 테이블', 2, 3, 'HIGH', NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 3, '태스크 관련 테이블 생성', 'flowtask_task, flowtask_column 테이블', 3, 3, 'HIGH', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 3, '댓글 테이블 생성', 'flowtask_comment 테이블', 4, 3, 'MEDIUM', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', 'COMPLETED'),
(nextval('flowtask_task_seq'), 3, '인덱스 최적화', '자주 조회되는 컬럼에 인덱스 추가', 5, 3, 'MEDIUM', NOW() - INTERVAL '3 days', NOW() + INTERVAL '3 days', 'WAITING'),
(nextval('flowtask_task_seq'), 3, '쿼리 성능 튜닝', 'N+1 문제 해결 및 쿼리 최적화', 6, 3, 'LOW', NOW(), NOW() + INTERVAL '8 days', 'WAITING'),
(nextval('flowtask_task_seq'), 3, '백업 전략 수립', '데이터베이스 자동 백업 설정', 7, 4, 'MEDIUM', NOW(), NOW() + INTERVAL '10 days', 'WAITING');

-- ========================================
-- 샘플 데이터: 태스크 (DevOps)
-- ========================================
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, workflow_status) VALUES
(nextval('flowtask_task_seq'), 4, 'Docker 컨테이너화', 'Dockerfile 및 docker-compose 설정', 0, 4, 'HIGH', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', 'COMPLETED'),
(nextval('flowtask_task_seq'), 4, 'AWS EC2 인스턴스 설정', '프로덕션 서버 환경 구축', 1, 4, 'HIGH', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 4, 'Nginx 리버스 프록시 설정', 'SSL 인증서 및 도메인 연결', 2, 4, 'HIGH', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 'WAITING'),
(nextval('flowtask_task_seq'), 4, 'CI/CD 파이프라인 구축', 'GitHub Actions 자동 배포', 3, 4, 'MEDIUM', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 'WAITING'),
(nextval('flowtask_task_seq'), 4, '모니터링 시스템 구축', 'Prometheus + Grafana 설정', 4, 4, 'MEDIUM', NOW(), NOW() + INTERVAL '7 days', 'WAITING'),
(nextval('flowtask_task_seq'), 4, '로그 수집 시스템', 'ELK Stack 구성', 5, 4, 'LOW', NOW(), NOW() + INTERVAL '10 days', 'WAITING'),
(nextval('flowtask_task_seq'), 4, '부하 테스트 수행', 'JMeter로 성능 테스트', 6, 4, 'MEDIUM', NOW(), NOW() + INTERVAL '8 days', 'WAITING');

-- ========================================
-- 샘플 데이터: 태스크 (디자인/UI)
-- ========================================
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, workflow_status) VALUES
(nextval('flowtask_task_seq'), 5, '와이어프레임 제작', 'Figma로 전체 화면 와이어프레임', 0, 5, 'HIGH', NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 5, 'UI/UX 디자인 시스템', '컬러, 타이포그래피, 컴포넌트 정의', 1, 5, 'HIGH', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 5, '로고 및 브랜딩', 'Flowtask 로고 디자인', 2, 5, 'MEDIUM', NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days', 'COMPLETED'),
(nextval('flowtask_task_seq'), 5, '칸반 보드 UI 디자인', '보드 화면 상세 디자인', 3, 5, 'HIGH', NOW() - INTERVAL '6 days', NOW(), 'IN_PROGRESS'),
(nextval('flowtask_task_seq'), 5, '태스크 카드 디자인', '카드 레이아웃 및 상태 표시', 4, 5, 'HIGH', NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', 'WAITING'),
(nextval('flowtask_task_seq'), 5, '아이콘 세트 제작', 'SVG 아이콘 라이브러리', 5, 5, 'MEDIUM', NOW() - INTERVAL '3 days', NOW() + INTERVAL '3 days', 'WAITING'),
(nextval('flowtask_task_seq'), 5, '모바일 UI 디자인', '반응형 디자인 가이드', 6, 5, 'MEDIUM', NOW(), NOW() + INTERVAL '6 days', 'WAITING'),
(nextval('flowtask_task_seq'), 5, '인터랙션 프로토타입', 'Figma 인터랙티브 프로토타입', 7, 5, 'LOW', NOW(), NOW() + INTERVAL '9 days', 'WAITING'),
(nextval('flowtask_task_seq'), 5, '사용성 테스트', '유저 테스트 및 피드백 수집', 8, 5, 'LOW', NOW(), NOW() + INTERVAL '12 days', 'WAITING');

-- ========================================
-- 샘플 데이터: 댓글
-- ========================================
INSERT INTO flowtask_comment (comment_id, task_id, author_no, content, created_at) VALUES
(nextval('flowtask_comment_seq'), 1, 1, 'JWT 토큰 처리 로직과 연동 필요합니다.', NOW() - INTERVAL '2 days'),
(nextval('flowtask_comment_seq'), 1, 2, '로그인 실패 시 에러 메시지 표시 완료했습니다.', NOW() - INTERVAL '1 day'),
(nextval('flowtask_comment_seq'), 3, 1, '드래그 앤 드롭 시 부드러운 애니메이션 추가해주세요.', NOW() - INTERVAL '3 days'),
(nextval('flowtask_comment_seq'), 3, 2, '라이브러리 버전 업데이트 후 문제 해결했습니다.', NOW() - INTERVAL '2 days'),
(nextval('flowtask_comment_seq'), 11, 3, 'JWT 토큰 검증 로직 추가 완료', NOW() - INTERVAL '4 days'),
(nextval('flowtask_comment_seq'), 11, 1, '테스트 케이스도 작성 부탁드립니다.', NOW() - INTERVAL '3 days'),
(nextval('flowtask_comment_seq'), 14, 3, '태스크 위치 저장 API 엔드포인트: POST /api/task/move', NOW() - INTERVAL '1 day'),
(nextval('flowtask_comment_seq'), 21, 4, 'Docker Compose로 PostgreSQL, Spring Boot, React 모두 통합했습니다.', NOW() - INTERVAL '5 days'),
(nextval('flowtask_comment_seq'), 21, 1, '잘 작동하는 것 확인했습니다!', NOW() - INTERVAL '4 days'),
(nextval('flowtask_comment_seq'), 31, 5, 'Figma 링크 공유드립니다: https://figma.com/...', NOW() - INTERVAL '6 days');

-- ========================================
-- 샘플 데이터: 팀 채팅
-- ========================================
INSERT INTO flowtask_chat_message (message_id, team_id, sender_no, content, sent_at) VALUES
(nextval('flowtask_chat_seq'), 1, 1, '안녕하세요! Flowtask 개발팀 채팅방입니다.', NOW() - INTERVAL '10 days'),
(nextval('flowtask_chat_seq'), 1, 2, '프론트엔드 개발 시작했습니다!', NOW() - INTERVAL '9 days'),
(nextval('flowtask_chat_seq'), 1, 3, '백엔드 JWT 인증 구현 중입니다.', NOW() - INTERVAL '8 days'),
(nextval('flowtask_chat_seq'), 1, 4, 'Docker 설정 완료했습니다.', NOW() - INTERVAL '7 days'),
(nextval('flowtask_chat_seq'), 1, 5, 'UI 디자인 시안 공유드립니다.', NOW() - INTERVAL '6 days'),
(nextval('flowtask_chat_seq'), 1, 1, '오늘 오후 3시에 스프린트 회의 진행하겠습니다.', NOW() - INTERVAL '5 days'),
(nextval('flowtask_chat_seq'), 1, 2, '칸반 보드 드래그 앤 드롭 기능 완성했습니다!', NOW() - INTERVAL '4 days'),
(nextval('flowtask_chat_seq'), 1, 3, 'API 문서 업데이트했으니 확인 부탁드립니다.', NOW() - INTERVAL '3 days'),
(nextval('flowtask_chat_seq'), 1, 4, 'AWS 배포 환경 구축 완료', NOW() - INTERVAL '2 days'),
(nextval('flowtask_chat_seq'), 1, 5, '사용성 테스트 일정 잡아봅시다.', NOW() - INTERVAL '1 day'),
(nextval('flowtask_chat_seq'), 1, 1, '다들 고생하셨습니다! 금주 목표 달성했습니다.', NOW() - INTERVAL '12 hours'),
(nextval('flowtask_chat_seq'), 1, 2, '다음 주 일정 논의가 필요할 것 같습니다.', NOW() - INTERVAL '6 hours'),
(nextval('flowtask_chat_seq'), 1, 3, 'WebSocket 실시간 업데이트 잘 작동하네요!', NOW() - INTERVAL '3 hours');

-- ========================================
-- 샘플 데이터: 태스크 담당자
-- ========================================
INSERT INTO flowtask_task_assignee (task_id, member_no, assigned_at, assigned_by, accepted, completed) VALUES
(1, 2, NOW() - INTERVAL '5 days', 1, true, false),
(2, 2, NOW() - INTERVAL '3 days', 1, true, false),
(3, 2, NOW() - INTERVAL '7 days', 1, true, false),
(11, 3, NOW() - INTERVAL '6 days', 1, true, false),
(12, 3, NOW() - INTERVAL '5 days', 1, true, false),
(14, 3, NOW() - INTERVAL '8 days', 1, true, true),
(19, 3, NOW() - INTERVAL '10 days', 1, true, true),
(20, 3, NOW() - INTERVAL '9 days', 1, true, true),
(28, 4, NOW() - INTERVAL '8 days', 1, true, true),
(29, 4, NOW() - INTERVAL '5 days', 1, true, false),
(38, 5, NOW() - INTERVAL '12 days', 1, true, true),
(39, 5, NOW() - INTERVAL '10 days', 1, true, true),
(41, 5, NOW() - INTERVAL '6 days', 1, true, false);

-- ========================================
-- 샘플 데이터: 태스크 즐겨찾기
-- ========================================
INSERT INTO flowtask_task_favorite (task_id, member_no, created_at) VALUES
(1, 1, NOW() - INTERVAL '2 days'),
(3, 1, NOW() - INTERVAL '3 days'),
(11, 1, NOW() - INTERVAL '4 days'),
(14, 3, NOW() - INTERVAL '1 day'),
(29, 4, NOW() - INTERVAL '2 days'),
(41, 5, NOW() - INTERVAL '1 day');
