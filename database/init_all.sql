-- =============================================
-- Flowtask - 전체 스키마 초기화
-- PostgreSQL 15+ 호환
--
-- 사용법:
--   psql -U flow -d flowtask -f init_all.sql
-- =============================================

\echo '=========================================='
\echo 'Flowtask Database Initialization'
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
