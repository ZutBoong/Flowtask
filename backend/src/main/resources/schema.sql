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
    register TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기존 테이블에 email_verified 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'flowtask_member' AND column_name = 'email_verified') THEN
        ALTER TABLE flowtask_member ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

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
-- 태스크 아카이브 테이블 (아카이브한 태스크 스냅샷 저장)
-- ========================================
CREATE SEQUENCE IF NOT EXISTS flowtask_task_archive_seq START WITH 1 INCREMENT BY 1;

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
