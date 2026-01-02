-- =============================================
-- GitHub Issue 양방향 동기화를 위한 마이그레이션
-- =============================================

-- Sequence for task_github_issue
CREATE SEQUENCE IF NOT EXISTS task_github_issue_seq START WITH 1 INCREMENT BY 1;

-- ========================================
-- Task-GitHub Issue 매핑 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS task_github_issue (
    id INTEGER PRIMARY KEY DEFAULT nextval('task_github_issue_seq'),
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    issue_number INTEGER NOT NULL,
    issue_id BIGINT NOT NULL,
    issue_title VARCHAR(500),
    issue_url VARCHAR(500),
    sync_status VARCHAR(20) DEFAULT 'SYNCED',  -- SYNCED, PENDING, CONFLICT, ERROR
    last_synced_at TIMESTAMP,
    synodos_updated_at TIMESTAMP,
    github_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_task_issue UNIQUE(task_id),
    CONSTRAINT unique_team_issue UNIQUE(team_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_task_github_issue_task ON task_github_issue(task_id);
CREATE INDEX IF NOT EXISTS idx_task_github_issue_team ON task_github_issue(team_id);
CREATE INDEX IF NOT EXISTS idx_task_github_issue_status ON task_github_issue(sync_status);

-- Sequence for github_user_mapping
CREATE SEQUENCE IF NOT EXISTS github_user_mapping_seq START WITH 1 INCREMENT BY 1;

-- ========================================
-- GitHub 사용자 매핑 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS github_user_mapping (
    id INTEGER PRIMARY KEY DEFAULT nextval('github_user_mapping_seq'),
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    github_username VARCHAR(100) NOT NULL,
    github_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_member_github UNIQUE(member_no),
    CONSTRAINT unique_github_username UNIQUE(github_username)
);

CREATE INDEX IF NOT EXISTS idx_github_user_mapping_member ON github_user_mapping(member_no);
CREATE INDEX IF NOT EXISTS idx_github_user_mapping_github ON github_user_mapping(github_username);

-- Sequence for github_issue_sync_log
CREATE SEQUENCE IF NOT EXISTS github_issue_sync_log_seq START WITH 1 INCREMENT BY 1;

-- ========================================
-- GitHub Issue 동기화 로그 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS github_issue_sync_log (
    id INTEGER PRIMARY KEY DEFAULT nextval('github_issue_sync_log_seq'),
    task_github_issue_id INTEGER REFERENCES task_github_issue(id) ON DELETE SET NULL,
    task_id INTEGER,
    issue_number INTEGER,
    team_id INTEGER,
    sync_direction VARCHAR(20),    -- PUSH (Synodos->GitHub), PULL (GitHub->Synodos)
    sync_type VARCHAR(30),         -- CREATE, UPDATE, LINK, UNLINK
    field_changed VARCHAR(50),     -- workflow_status, priority, assignees, verifiers, due_date, title, description
    old_value TEXT,
    new_value TEXT,
    sync_status VARCHAR(20),       -- SUCCESS, FAILED, CONFLICT
    error_message TEXT,
    triggered_by VARCHAR(30),      -- WEBHOOK, MANUAL, AUTO
    webhook_delivery_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_sync_log_mapping ON github_issue_sync_log(task_github_issue_id);
CREATE INDEX IF NOT EXISTS idx_github_sync_log_task ON github_issue_sync_log(task_id);
CREATE INDEX IF NOT EXISTS idx_github_sync_log_team ON github_issue_sync_log(team_id);
CREATE INDEX IF NOT EXISTS idx_github_sync_log_created ON github_issue_sync_log(created_at DESC);

-- ========================================
-- Team 테이블 확장 (GitHub Issue 동기화 설정)
-- ========================================
ALTER TABLE team ADD COLUMN IF NOT EXISTS github_access_token VARCHAR(500);
ALTER TABLE team ADD COLUMN IF NOT EXISTS github_issue_sync_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE team ADD COLUMN IF NOT EXISTS github_default_column_id INTEGER REFERENCES columns(column_id) ON DELETE SET NULL;
ALTER TABLE team ADD COLUMN IF NOT EXISTS github_column_mappings TEXT;

-- 코멘트 추가
COMMENT ON TABLE task_github_issue IS 'Synodos Task와 GitHub Issue 간의 1:1 매핑 테이블';
COMMENT ON TABLE github_user_mapping IS 'Synodos 멤버와 GitHub 사용자 간의 매핑 테이블';
COMMENT ON TABLE github_issue_sync_log IS 'GitHub Issue 동기화 작업 로그';
COMMENT ON COLUMN team.github_access_token IS '팀의 GitHub Personal Access Token (암호화 권장)';
COMMENT ON COLUMN team.github_issue_sync_enabled IS 'GitHub Issue 동기화 활성화 여부';
COMMENT ON COLUMN team.github_default_column_id IS 'GitHub Issue에서 Task 생성 시 기본 컬럼';
COMMENT ON COLUMN team.github_column_mappings IS 'Issue 제목 명령어 → 컬럼ID 매핑 규칙 (JSON)';
