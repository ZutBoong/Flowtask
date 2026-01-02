-- =============================================
-- Synodos - 샘플 데이터 (자동 실행)
-- =============================================
--
-- ✅ 이 파일은 Spring Boot 시작 시 자동으로 실행됩니다!
--
-- 위치: backend/src/main/resources/data.sql
-- 역할: 초기 샘플 데이터 삽입
-- 비밀번호: 1234 (BCrypt - Spring Security 생성)
--
-- ON CONFLICT DO NOTHING으로 중복 삽입을 방지합니다.
-- =============================================

-- =============================================
-- 1. 회원 데이터
-- =============================================
INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'admin', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '관리자', 'admin@synodos.com', '010-0000-0000', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user1', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '김철수', 'user1@synodos.com', '010-1234-5678', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user2', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '이영희', 'user2@synodos.com', '010-2345-6789', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user3', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '박민수', 'user3@synodos.com', '010-3456-7890', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user4', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '정수진', 'user4@synodos.com', '010-4567-8901', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user5', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '강동원', 'user5@synodos.com', '010-5678-9012', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user6', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '윤서연', 'user6@synodos.com', '010-6789-0123', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user7', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '한지민', 'user7@synodos.com', '010-7890-1234', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user8', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '오준혁', 'user8@synodos.com', '010-8901-2345', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user9', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '서예린', 'user9@synodos.com', '010-9012-3456', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

-- =============================================
-- 2. 팀 데이터
-- =============================================
INSERT INTO team (team_id, team_name, description, leader_no, team_code, created_at)
VALUES (nextval('team_seq'), 'Synodos 테스트 프로젝트', 'GitHub 연동 테스트를 위한 프로젝트입니다.',
        (SELECT no FROM member WHERE userid = 'admin'), 'SYNODOS1', CURRENT_TIMESTAMP)
ON CONFLICT (team_code) DO NOTHING;

-- =============================================
-- 3. 팀 멤버 데이터
-- =============================================
INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'LEADER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'admin'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user1'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user2'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user3'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user4'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user5'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user6'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user7'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user8'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user9'
ON CONFLICT (team_id, member_no) DO NOTHING;

-- =============================================
-- 4. 컬럼 데이터
-- =============================================
INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Backlog', 0 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'To Do', 1 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'In Progress', 2 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Review', 3 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Done', 4 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. 태스크 데이터
-- =============================================
-- Backlog
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'subtract 함수 추가', 'main.js에 뺄셈 함수를 추가합니다.',
       0, 'MEDIUM', 'WAITING', CURRENT_DATE - 7, CURRENT_DATE + 7, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Backlog';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'divide 함수 추가', 'main.js에 나눗셈 함수를 추가합니다.',
       1, 'MEDIUM', 'WAITING', CURRENT_DATE - 5, CURRENT_DATE + 10, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Backlog';

-- To Do
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '테스트 코드 작성', 'Jest를 사용하여 테스트 코드를 작성합니다.',
       0, 'HIGH', 'WAITING', CURRENT_DATE - 4, CURRENT_DATE + 5, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'To Do';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'ESLint 설정 추가', '코드 품질을 위한 ESLint 설정을 추가합니다.',
       1, 'MEDIUM', 'WAITING', CURRENT_DATE - 3, CURRENT_DATE + 7, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'To Do';

-- In Progress
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'modulo 함수 구현', 'main.js에 나머지 연산 함수를 구현 중입니다.',
       0, 'MEDIUM', 'IN_PROGRESS', CURRENT_DATE - 6, CURRENT_DATE + 3, (SELECT no FROM member WHERE userid = 'user1')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'In Progress';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '로깅 유틸 추가', 'utils.js에 로깅 유틸리티 함수를 추가 중입니다.',
       1, 'HIGH', 'IN_PROGRESS', CURRENT_DATE - 5, CURRENT_DATE + 2, (SELECT no FROM member WHERE userid = 'user2')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'In Progress';

-- Review
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'power 함수 구현', '거듭제곱 함수를 구현했습니다. 리뷰 부탁드립니다.',
       0, 'MEDIUM', 'REVIEW', CURRENT_DATE - 8, CURRENT_DATE + 1, (SELECT no FROM member WHERE userid = 'user3')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Review';

-- Done
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '프로젝트 초기 설정', 'package.json 및 기본 구조를 설정했습니다.',
       0, 'HIGH', 'DONE', CURRENT_DATE - 14, CURRENT_DATE - 7, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Done';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'add 함수 구현', 'main.js에 덧셈 함수를 구현 완료했습니다.',
       1, 'MEDIUM', 'DONE', CURRENT_DATE - 11, CURRENT_DATE - 4, (SELECT no FROM member WHERE userid = 'user5')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Done';

-- =============================================
-- 6. 담당자 데이터
-- =============================================
INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현' AND m.userid = 'user1';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '로깅 유틸 추가' AND m.userid = 'user2';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현' AND m.userid = 'user3';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '프로젝트 초기 설정' AND m.userid = 'admin';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'add 함수 구현' AND m.userid = 'user5';

-- =============================================
-- 7. 검증자 데이터
-- =============================================
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현' AND m.userid = 'admin';

INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '프로젝트 초기 설정' AND m.userid = 'admin';

-- =============================================
-- 8. 댓글 데이터
-- =============================================
INSERT INTO comment (comment_id, task_id, author_no, content, created_at, updated_at)
SELECT nextval('comment_seq'), t.task_id, m.no, '진행 상황 업데이트합니다.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현' AND m.userid = 'user1';

INSERT INTO comment (comment_id, task_id, author_no, content, created_at, updated_at)
SELECT nextval('comment_seq'), t.task_id, m.no, '코드 확인했습니다. LGTM!', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현' AND m.userid = 'admin';

-- =============================================
-- 9. 알림 데이터
-- =============================================
INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TASK_ASSIGNED', '새 태스크가 배정되었습니다',
       'modulo 함수 구현 태스크가 배정되었습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'user1' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TASK_ASSIGNED', '새 태스크가 배정되었습니다',
       '로깅 유틸 추가 태스크가 배정되었습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'user2' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '로깅 유틸 추가';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'COMMENT_ADDED', '새 댓글이 달렸습니다',
       'power 함수 구현에 새 댓글이 달렸습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'user3' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'VERIFICATION_REQUESTED', '검증 요청이 도착했습니다',
       'power 함수 구현 태스크의 검증을 요청받았습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '20 hours'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'admin' AND s.userid = 'user3'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TASK_COMPLETED', '태스크가 완료되었습니다',
       '프로젝트 초기 설정 태스크가 완료되었습니다.', tm.team_id, t.task_id, true, CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'admin' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '프로젝트 초기 설정';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, NULL, 'TASK_DUE_SOON', '마감일이 임박했습니다',
       'modulo 함수 구현 태스크의 마감일이 3일 남았습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '6 hours'
FROM member r, task t, columns c, team tm
WHERE r.userid = 'user1'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TEAM_INVITED', '팀에 초대되었습니다',
       'Synodos 테스트 프로젝트 팀에 초대되었습니다.', tm.team_id, true, CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM member r, member s, team tm
WHERE r.userid = 'user9' AND s.userid = 'admin' AND tm.team_code = 'SYNODOS1';
