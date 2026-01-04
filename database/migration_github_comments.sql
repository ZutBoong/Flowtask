-- =============================================
-- GitHub 댓글 동기화를 위한 마이그레이션
-- =============================================

-- comment 테이블에 github_comment_id 컬럼 추가
ALTER TABLE comment ADD COLUMN IF NOT EXISTS github_comment_id BIGINT;

-- 인덱스 추가 (GitHub 댓글 ID로 검색용)
CREATE INDEX IF NOT EXISTS idx_comment_github ON comment(github_comment_id) WHERE github_comment_id IS NOT NULL;
