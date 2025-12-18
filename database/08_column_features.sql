-- =============================================
-- Flowtask - 컬럼 확장 기능 테이블
-- (즐겨찾기, 아카이브)
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_column_archive_seq START WITH 1 INCREMENT BY 1;

-- 컬럼 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS flowtask_column_favorite (
    column_id INTEGER NOT NULL REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (column_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_column_favorite_column ON flowtask_column_favorite(column_id);
CREATE INDEX IF NOT EXISTS idx_column_favorite_member ON flowtask_column_favorite(member_no);

-- 컬럼 아카이브 테이블 (삭제된 컬럼 스냅샷 저장)
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
