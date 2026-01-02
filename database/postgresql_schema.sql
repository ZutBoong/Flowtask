-- =============================================
-- Synodos - PostgreSQL Schema (참조용)
-- =============================================
--
-- ⚠️ 중요: 이 파일은 참조/백업용입니다!
--
-- 실제 자동 DB 업데이트는 아래 파일에서 관리됩니다:
--   backend/src/main/resources/schema.sql  (테이블 생성/변경)
--   backend/src/main/resources/data.sql    (샘플 데이터)
--
-- Spring Boot 시작 시 위 파일들이 자동으로 실행됩니다.
-- 스키마 변경이 필요하면 backend/src/main/resources/schema.sql을 수정하세요.
--
-- 이 파일은 전체 스키마 구조 확인 및 수동 설치 시 참고용으로 사용됩니다.
-- =============================================

-- ========================================
-- 시퀀스 생성
-- ========================================
CREATE SEQUENCE IF NOT EXISTS member_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS team_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS column_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS task_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS comment_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS chat_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS file_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS email_verification_seq START WITH 1 INCREMENT BY 1;

-- ========================================
-- 회원 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS member (
    no INTEGER PRIMARY KEY,
    userid VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    profile_image VARCHAR(500),
    provider VARCHAR(20),
    provider_id VARCHAR(100),
    github_username VARCHAR(100),
    github_access_token VARCHAR(500),
    github_connected_at TIMESTAMP,
    register TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기존 테이블에 email_verified 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'email_verified') THEN
        ALTER TABLE member ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 기존 테이블에 profile_image 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'profile_image') THEN
        ALTER TABLE member ADD COLUMN profile_image VARCHAR(500);
    END IF;
END $$;

-- 기존 테이블에 GitHub 관련 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'github_username') THEN
        ALTER TABLE member ADD COLUMN github_username VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'github_access_token') THEN
        ALTER TABLE member ADD COLUMN github_access_token VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'github_connected_at') THEN
        ALTER TABLE member ADD COLUMN github_connected_at TIMESTAMP;
    END IF;
END $$;

-- 기존 테이블에 소셜 로그인 관련 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'provider') THEN
        ALTER TABLE member ADD COLUMN provider VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'member' AND column_name = 'provider_id') THEN
        ALTER TABLE member ADD COLUMN provider_id VARCHAR(100);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_member_userid ON member(userid);
CREATE INDEX IF NOT EXISTS idx_member_email ON member(email);

-- ========================================
-- 회원 소셜 연동 테이블
-- ========================================
CREATE SEQUENCE IF NOT EXISTS member_social_link_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS member_social_link (
    id INTEGER PRIMARY KEY DEFAULT nextval('member_social_link_seq'),
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_id VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    name VARCHAR(100),
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_member_provider UNIQUE(member_no, provider),
    CONSTRAINT unique_provider_id UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_member_social_link_member ON member_social_link(member_no);
CREATE INDEX IF NOT EXISTS idx_member_social_link_provider ON member_social_link(provider, provider_id);

-- ========================================
-- 팀 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS team (
    team_id INTEGER PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_code VARCHAR(20) NOT NULL UNIQUE,
    leader_no INTEGER NOT NULL REFERENCES member(no),
    description TEXT,
    github_repo_url VARCHAR(500),
    github_access_token VARCHAR(500),
    github_issue_sync_enabled BOOLEAN DEFAULT FALSE,
    github_default_column_id INTEGER,
    github_column_mappings TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기존 테이블에 GitHub 관련 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'team' AND column_name = 'github_repo_url') THEN
        ALTER TABLE team ADD COLUMN github_repo_url VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'team' AND column_name = 'github_access_token') THEN
        ALTER TABLE team ADD COLUMN github_access_token VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'team' AND column_name = 'github_issue_sync_enabled') THEN
        ALTER TABLE team ADD COLUMN github_issue_sync_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'team' AND column_name = 'github_default_column_id') THEN
        ALTER TABLE team ADD COLUMN github_default_column_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'team' AND column_name = 'github_column_mappings') THEN
        ALTER TABLE team ADD COLUMN github_column_mappings TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_leader ON team(leader_no);
CREATE INDEX IF NOT EXISTS idx_team_code ON team(team_code);

-- ========================================
-- 팀 멤버 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS team_member (
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_teammember_team ON team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_teammember_member ON team_member(member_no);

-- ========================================
-- 컬럼 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS columns (
    column_id INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_column_position ON columns(position);
CREATE INDEX IF NOT EXISTS idx_column_team ON columns(team_id);

-- ========================================
-- 태스크 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS task (
    task_id INTEGER PRIMARY KEY,
    column_id INTEGER NOT NULL REFERENCES columns(column_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Issue tracker fields
    assignee_no INTEGER REFERENCES member(no) ON DELETE SET NULL,
    priority VARCHAR(20),
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    -- Workflow fields
    workflow_status VARCHAR(20) DEFAULT 'WAITING',
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    rejected_by INTEGER REFERENCES member(no) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_column ON task(column_id);
CREATE INDEX IF NOT EXISTS idx_task_position ON task(column_id, position);
CREATE INDEX IF NOT EXISTS idx_task_assignee ON task(assignee_no);
CREATE INDEX IF NOT EXISTS idx_task_workflow_status ON task(workflow_status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON task(priority);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON task(due_date);
CREATE INDEX IF NOT EXISTS idx_task_start_date ON task(start_date);

-- ========================================
-- 댓글 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS comment (
    comment_id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    author_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_task ON comment(task_id);
CREATE INDEX IF NOT EXISTS idx_comment_created ON comment(created_at DESC);

-- ========================================
-- 채팅 메시지 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS chat_message (
    message_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    sender_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_team ON chat_message(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_sent ON chat_message(sent_at DESC);


-- ========================================
-- 태스크 즐겨찾기 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS task_favorite (
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_favorite_task ON task_favorite(task_id);
CREATE INDEX IF NOT EXISTS idx_task_favorite_member ON task_favorite(member_no);

-- ========================================
-- 태스크 아카이브 테이블 (아카이브한 태스크 스냅샷 저장)
-- ========================================
CREATE SEQUENCE IF NOT EXISTS task_archive_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS task_archive (
    archive_id INTEGER PRIMARY KEY,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    original_task_id INTEGER NOT NULL,
    team_id INTEGER,
    team_name VARCHAR(100),
    column_id INTEGER,
    column_title VARCHAR(100),
    task_snapshot JSONB NOT NULL,
    archive_note VARCHAR(500),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_archive_member ON task_archive(member_no);
CREATE INDEX IF NOT EXISTS idx_task_archive_team ON task_archive(team_id);
CREATE INDEX IF NOT EXISTS idx_task_archive_archived ON task_archive(archived_at DESC);

-- ========================================
-- 알림 테이블
-- ========================================
CREATE SEQUENCE IF NOT EXISTS notification_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS notification (
    notification_id INTEGER PRIMARY KEY,
    recipient_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    sender_no INTEGER REFERENCES member(no) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(500),
    team_id INTEGER REFERENCES team(team_id) ON DELETE CASCADE,
    column_id INTEGER REFERENCES columns(column_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES task(task_id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification(recipient_no);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON notification(created_at DESC);

-- ========================================
-- 태스크 담당자 테이블 (복수 담당자 지원)
-- ========================================
CREATE TABLE IF NOT EXISTS task_assignee (
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES member(no) ON DELETE SET NULL,
    -- Workflow fields (NEW)
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_assignee_task ON task_assignee(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_member ON task_assignee(member_no);

-- ========================================
-- 태스크 검증자 테이블 (복수 검증자 지원) - NEW
-- ========================================
CREATE TABLE IF NOT EXISTS task_verifier (
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_verifier_task ON task_verifier(task_id);
CREATE INDEX IF NOT EXISTS idx_task_verifier_member ON task_verifier(member_no);

-- ========================================
-- 파일 테이블 (프로젝트/태스크 첨부파일)
-- ========================================
CREATE TABLE IF NOT EXISTS file (
    file_id INTEGER PRIMARY KEY,
    team_id INTEGER REFERENCES team(team_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES task(task_id) ON DELETE CASCADE,
    uploader_no INTEGER NOT NULL REFERENCES member(no) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_team ON file(team_id);
CREATE INDEX IF NOT EXISTS idx_file_task ON file(task_id);
CREATE INDEX IF NOT EXISTS idx_file_uploader ON file(uploader_no);
CREATE INDEX IF NOT EXISTS idx_file_uploaded ON file(uploaded_at DESC);

-- ========================================
-- 이메일 인증 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS email_verification (
    id INTEGER PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_code ON email_verification(code);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification(expires_at);

-- ========================================
-- 태스크-커밋 연결 테이블
-- ========================================
CREATE SEQUENCE IF NOT EXISTS task_commit_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS task_commit (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    commit_sha VARCHAR(40) NOT NULL,
    commit_message VARCHAR(500),
    commit_author VARCHAR(100),
    commit_date TIMESTAMP,
    github_url VARCHAR(500),
    linked_by INTEGER REFERENCES member(no) ON DELETE SET NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_commit_task ON task_commit(task_id);
CREATE INDEX IF NOT EXISTS idx_task_commit_sha ON task_commit(commit_sha);
