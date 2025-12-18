-- 모든 테이블 삭제 후 새로 생성 (schema.sql에서 재생성됨)
DROP TABLE IF EXISTS flowtask_task_commit CASCADE;
DROP TABLE IF EXISTS flowtask_task_tag CASCADE;
DROP TABLE IF EXISTS flowtask_task_verifier CASCADE;
DROP TABLE IF EXISTS flowtask_task_assignee CASCADE;
DROP TABLE IF EXISTS flowtask_comment CASCADE;
DROP TABLE IF EXISTS flowtask_chat_message CASCADE;
DROP TABLE IF EXISTS flowtask_column_archive CASCADE;
DROP TABLE IF EXISTS flowtask_column_favorite CASCADE;
DROP TABLE IF EXISTS flowtask_column_assignee CASCADE;
DROP TABLE IF EXISTS flowtask_notification CASCADE;
DROP TABLE IF EXISTS flowtask_file CASCADE;
DROP TABLE IF EXISTS flowtask_task CASCADE;
DROP TABLE IF EXISTS flowtask_section CASCADE;
DROP TABLE IF EXISTS flowtask_column CASCADE;
DROP TABLE IF EXISTS flowtask_project CASCADE;
DROP TABLE IF EXISTS flowtask_git_repo CASCADE;
DROP TABLE IF EXISTS flowtask_tag CASCADE;
DROP TABLE IF EXISTS flowtask_team_member CASCADE;
DROP TABLE IF EXISTS flowtask_team CASCADE;
DROP TABLE IF EXISTS flowtask_member CASCADE;

-- 시퀀스도 삭제 (schema.sql에서 재생성됨)
DROP SEQUENCE IF EXISTS flowtask_member_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_team_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_project_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_column_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_task_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_tag_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_comment_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_chat_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_git_repo_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_column_archive_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_notification_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_section_seq CASCADE;
DROP SEQUENCE IF EXISTS flowtask_file_seq CASCADE;
