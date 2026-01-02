-- =============================================
-- Synodos - 전체 스키마 초기화 (수동 설치용)
-- PostgreSQL 15+ 호환
-- =============================================
--
-- ⚠️ 참고: 이 폴더의 파일들은 수동 설치/참조용입니다!
--
-- 실제 자동 DB 업데이트는 아래 파일에서 관리됩니다:
--   backend/src/main/resources/schema.sql  (테이블 생성/변경)
--   backend/src/main/resources/data.sql    (샘플 데이터)
--
-- Spring Boot 시작 시 위 파일들이 자동으로 실행됩니다.
-- 스키마 변경 시 반드시 backend/src/main/resources/schema.sql을 수정하세요.
--
-- 수동 사용법:
--   psql -U flow -d synodos -f init_all.sql
-- =============================================

\echo '=========================================='
\echo 'Synodos Database Initialization'
\echo '=========================================='

\echo '1. Creating member tables...'
\i 01_member.sql

\echo '2. Creating team & project tables...'
\i 02_team.sql

\echo '3. Creating board tables...'
\i 03_board.sql

\echo '4. Creating comment tables...'
\i 05_comment.sql

\echo '6. Creating chat tables...'
\i 06_chat.sql

\echo '7. Creating notification tables...'
\i 09_notification.sql

\echo '=========================================='
\echo 'Database initialization complete!'
\echo '=========================================='
