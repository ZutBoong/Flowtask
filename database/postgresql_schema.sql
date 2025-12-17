-- =============================================
-- Flowtask - Complete Database Schema
-- PostgreSQL 15+ Compatible
-- For Docker initialization
-- =============================================

-- =============================================
-- 1. Member Table
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_member_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_member (
    no INTEGER PRIMARY KEY,
    userid VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    register TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flowtask_member_userid ON flowtask_member(userid);
CREATE INDEX IF NOT EXISTS idx_flowtask_member_email ON flowtask_member(email);

-- =============================================
-- 2. Team & Project Tables
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_team_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_project_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_team (
    team_id INTEGER PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_code VARCHAR(20) NOT NULL UNIQUE,
    leader_no INTEGER NOT NULL REFERENCES flowtask_member(no),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_leader ON flowtask_team(leader_no);
CREATE INDEX IF NOT EXISTS idx_team_code ON flowtask_team(team_code);

CREATE TABLE IF NOT EXISTS flowtask_team_member (
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_teammember_team ON flowtask_team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_teammember_member ON flowtask_team_member(member_no);

CREATE TABLE IF NOT EXISTS flowtask_project (
    project_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    project_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_team ON flowtask_project(team_id);

-- =============================================
-- 3. Board (Column & Task) Tables
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_column_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_task_seq START WITH 1 INCREMENT BY 1;

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
    due_date TIMESTAMP,
    status VARCHAR(30) DEFAULT 'OPEN',
    -- Verifier fields
    verifier_no INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'NONE',
    verification_notes VARCHAR(1000)
);

CREATE INDEX IF NOT EXISTS idx_flowtask_task_column ON flowtask_task(column_id);
CREATE INDEX IF NOT EXISTS idx_flowtask_task_position ON flowtask_task(column_id, position);
CREATE INDEX IF NOT EXISTS idx_task_assignee ON flowtask_task(assignee_no);
CREATE INDEX IF NOT EXISTS idx_task_status ON flowtask_task(status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON flowtask_task(priority);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON flowtask_task(due_date);
CREATE INDEX IF NOT EXISTS idx_task_verifier ON flowtask_task(verifier_no);
CREATE INDEX IF NOT EXISTS idx_task_verif_status ON flowtask_task(verification_status);

-- =============================================
-- 4. Tag Tables
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_tag_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_tag (
    tag_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6c757d',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (team_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_tag_team ON flowtask_tag(team_id);

CREATE TABLE IF NOT EXISTS flowtask_task_tag (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES flowtask_tag(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tasktag_task ON flowtask_task_tag(task_id);
CREATE INDEX IF NOT EXISTS idx_tasktag_tag ON flowtask_task_tag(tag_id);

-- =============================================
-- 5. Comment Table
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_comment_seq START WITH 1 INCREMENT BY 1;

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

-- =============================================
-- 6. Chat Message Table
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_chat_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_chat_message (
    message_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    sender_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_team ON flowtask_chat_message(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_sent ON flowtask_chat_message(sent_at DESC);

-- =============================================
-- 7. Git Integration Tables
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_git_repo_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_git_repo (
    repo_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL UNIQUE REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    provider VARCHAR(20) DEFAULT 'GITHUB',
    repo_owner VARCHAR(100) NOT NULL,
    repo_name VARCHAR(100) NOT NULL,
    access_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gitrepo_team ON flowtask_git_repo(team_id);

CREATE TABLE IF NOT EXISTS flowtask_task_commit (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    commit_sha VARCHAR(40) NOT NULL,
    commit_message VARCHAR(500),
    author_name VARCHAR(100),
    author_email VARCHAR(200),
    committed_at TIMESTAMP,
    commit_url VARCHAR(500),
    PRIMARY KEY (task_id, commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_taskcommit_task ON flowtask_task_commit(task_id);

-- =============================================
-- 8. Column Features Tables
-- (Assignee, Favorite, Archive)
-- =============================================
CREATE SEQUENCE IF NOT EXISTS flowtask_column_archive_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_column_assignee (
    column_id INTEGER NOT NULL REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (column_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_column_assignee_column ON flowtask_column_assignee(column_id);
CREATE INDEX IF NOT EXISTS idx_column_assignee_member ON flowtask_column_assignee(member_no);

CREATE TABLE IF NOT EXISTS flowtask_column_favorite (
    column_id INTEGER NOT NULL REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (column_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_column_favorite_column ON flowtask_column_favorite(column_id);
CREATE INDEX IF NOT EXISTS idx_column_favorite_member ON flowtask_column_favorite(member_no);

CREATE TABLE IF NOT EXISTS flowtask_column_archive (
    archive_id INTEGER PRIMARY KEY,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    original_column_id INTEGER NOT NULL,
    team_id INTEGER,
    team_name VARCHAR(100),
    project_id INTEGER,
    project_name VARCHAR(100),
    column_title VARCHAR(100) NOT NULL,
    column_position INTEGER,
    tasks_snapshot JSONB,
    archive_note VARCHAR(500),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_column_archive_member ON flowtask_column_archive(member_no);
CREATE INDEX IF NOT EXISTS idx_column_archive_team ON flowtask_column_archive(team_id);
CREATE INDEX IF NOT EXISTS idx_column_archive_archived ON flowtask_column_archive(archived_at DESC);

-- =============================================
-- 9. Notification Table
-- =============================================
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

-- =============================================
-- 10. Task Assignee Table (Multiple Assignees)
-- =============================================
CREATE TABLE IF NOT EXISTS flowtask_task_assignee (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_assignee_task ON flowtask_task_assignee(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_member ON flowtask_task_assignee(member_no);
