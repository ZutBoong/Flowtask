-- =============================================
-- Flowtask 샘플 데이터
-- 워크플로우 시스템 (WAITING → IN_PROGRESS → REVIEW → DONE)
-- =============================================

-- 1. 회원 (비밀번호: 1234)
INSERT INTO flowtask_member (no, userid, password, name, email, phone, register)
VALUES
    (nextval('flowtask_member_seq'), 'admin', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '관리자', 'admin@flowtask.com', '010-1234-5678', CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user1', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '홍길동', 'hong@flowtask.com', '010-2222-3333', CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user2', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '김철수', 'kim@flowtask.com', '010-3333-4444', CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user3', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '이영희', 'lee@flowtask.com', '010-4444-5555', CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user4', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '박민수', 'park@flowtask.com', '010-5555-6666', CURRENT_TIMESTAMP);

-- 2. 팀
INSERT INTO flowtask_team (team_id, team_name, team_code, leader_no, description, created_at)
VALUES
    (nextval('flowtask_team_seq'), 'Flowtask 개발팀', 'FLOW2024', 1, '칸반 보드 프로젝트 메인 개발팀', CURRENT_TIMESTAMP),
    (nextval('flowtask_team_seq'), '디자인팀', 'DESIGN24', 1, 'UI/UX 디자인 담당', CURRENT_TIMESTAMP);

-- 3. 팀 멤버
INSERT INTO flowtask_team_member (team_id, member_no, role, joined_at)
VALUES
    -- Flowtask 개발팀
    (1, 1, 'OWNER', CURRENT_TIMESTAMP),
    (1, 2, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 3, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 4, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 5, 'MEMBER', CURRENT_TIMESTAMP),
    -- 디자인팀
    (2, 1, 'OWNER', CURRENT_TIMESTAMP),
    (2, 4, 'MEMBER', CURRENT_TIMESTAMP);

-- 4. 프로젝트
INSERT INTO flowtask_project (project_id, team_id, project_name, created_at)
VALUES
    (nextval('flowtask_project_seq'), 1, '웹 애플리케이션', CURRENT_TIMESTAMP),
    (nextval('flowtask_project_seq'), 1, '모바일 앱', CURRENT_TIMESTAMP);

-- 5. 섹션 (타임라인/목록 그룹핑용)
INSERT INTO flowtask_section (section_id, team_id, section_name, position, color, created_at)
VALUES
    (nextval('flowtask_section_seq'), 1, '백엔드', 1, '#3b82f6', CURRENT_TIMESTAMP),
    (nextval('flowtask_section_seq'), 1, '프론트엔드', 2, '#10b981', CURRENT_TIMESTAMP),
    (nextval('flowtask_section_seq'), 1, '인프라', 3, '#f59e0b', CURRENT_TIMESTAMP);

-- 6. 컬럼 (칸반 보드)
INSERT INTO flowtask_column (column_id, team_id, project_id, title, position)
VALUES
    (nextval('flowtask_column_seq'), 1, 1, '할 일', 1),
    (nextval('flowtask_column_seq'), 1, 1, '진행 중', 2),
    (nextval('flowtask_column_seq'), 1, 1, '검토 중', 3),
    (nextval('flowtask_column_seq'), 1, 1, '완료', 4);

-- 7. 태그
INSERT INTO flowtask_tag (tag_id, team_id, tag_name, color, created_at)
VALUES
    (nextval('flowtask_tag_seq'), 1, '버그', '#ef4444', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, '기능', '#22c55e', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, '개선', '#3b82f6', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, '문서', '#6b7280', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, '긴급', '#f97316', CURRENT_TIMESTAMP);

-- 8. 태스크 (워크플로우 상태: WAITING, IN_PROGRESS, REVIEW, DONE, REJECTED)
INSERT INTO flowtask_task (task_id, column_id, title, description, position, priority, workflow_status, assignee_no, section_id, start_date, due_date, created_at)
VALUES
    -- 할 일 컬럼 (WAITING 상태)
    (nextval('flowtask_task_seq'), 1, '사용자 프로필 페이지 구현', '프로필 조회/수정 기능 개발', 1, 'MEDIUM', 'WAITING', 2, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '알림 설정 기능', '이메일/푸시 알림 설정 UI', 2, 'LOW', 'WAITING', NULL, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, 'API 문서화', 'Swagger로 REST API 문서 작성', 3, 'LOW', 'WAITING', 3, 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', CURRENT_TIMESTAMP),

    -- 진행 중 컬럼 (IN_PROGRESS 상태)
    (nextval('flowtask_task_seq'), 2, '워크플로우 시스템 개발', '태스크 상태 전환 시스템 구현', 1, 'CRITICAL', 'IN_PROGRESS', 2, 1, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '실시간 알림 기능', 'WebSocket 기반 실시간 알림', 2, 'HIGH', 'IN_PROGRESS', 3, 1, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '4 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '칸반 보드 드래그앤드롭', '태스크 이동 DnD 기능 개선', 3, 'HIGH', 'IN_PROGRESS', 4, 2, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', CURRENT_TIMESTAMP),

    -- 검토 중 컬럼 (REVIEW 상태)
    (nextval('flowtask_task_seq'), 3, '로그인 보안 강화', 'JWT 토큰 갱신 로직 개선', 1, 'HIGH', 'REVIEW', 2, 1, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '검색 필터 기능', '태스크 검색 및 필터링 UI', 2, 'MEDIUM', 'REVIEW', 4, 2, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '1 day', CURRENT_TIMESTAMP),

    -- 완료 컬럼 (DONE 상태)
    (nextval('flowtask_task_seq'), 4, '프로젝트 초기 설정', 'Spring Boot + React 프로젝트 구조 설정', 1, 'HIGH', 'DONE', 1, 3, CURRENT_DATE - INTERVAL '21 days', CURRENT_DATE - INTERVAL '14 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, 'DB 스키마 설계', 'PostgreSQL 테이블 구조 설계', 2, 'HIGH', 'DONE', 1, 1, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '13 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, '회원가입/로그인 구현', 'JWT 인증 시스템 구현', 3, 'HIGH', 'DONE', 2, 1, CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '10 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, '팀 관리 기능', '팀 생성/초대/관리 기능', 4, 'MEDIUM', 'DONE', 3, 1, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '8 days', CURRENT_TIMESTAMP),

    -- 반려된 태스크 (REJECTED 상태)
    (nextval('flowtask_task_seq'), 2, '다크모드 구현', 'UI 다크모드 테마 적용', 4, 'LOW', 'REJECTED', 4, 2, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', CURRENT_TIMESTAMP);

-- 반려 사유 업데이트
UPDATE flowtask_task
SET rejection_reason = '디자인 시안이 아직 확정되지 않았습니다. 디자인팀 검토 후 재진행해주세요.',
    rejected_at = CURRENT_TIMESTAMP,
    rejected_by = 1
WHERE task_id = 13;

-- 9. 태스크-태그 연결
INSERT INTO flowtask_task_tag (task_id, tag_id)
VALUES
    (1, 2),   -- 프로필 - 기능
    (2, 2),   -- 알림설정 - 기능
    (3, 4),   -- API문서 - 문서
    (4, 2),   -- 워크플로우 - 기능
    (4, 5),   -- 워크플로우 - 긴급
    (5, 2),   -- 실시간알림 - 기능
    (6, 3),   -- DnD - 개선
    (7, 3),   -- 로그인보안 - 개선
    (8, 2),   -- 검색필터 - 기능
    (9, 2),   -- 초기설정 - 기능
    (10, 4),  -- DB스키마 - 문서
    (11, 2),  -- 회원가입 - 기능
    (12, 2),  -- 팀관리 - 기능
    (13, 2);  -- 다크모드 - 기능

-- 10. 태스크 담당자 (워크플로우 상태 포함)
INSERT INTO flowtask_task_assignee (task_id, member_no, assigned_at, assigned_by, accepted, accepted_at, completed, completed_at)
VALUES
    -- WAITING 상태 태스크 (아직 수락 안함)
    (1, 2, CURRENT_TIMESTAMP, 1, false, NULL, false, NULL),
    (3, 3, CURRENT_TIMESTAMP, 1, false, NULL, false, NULL),

    -- IN_PROGRESS 상태 태스크 (수락함, 진행중)
    (4, 2, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '3 days', false, NULL),
    (4, 3, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '3 days', false, NULL),
    (5, 3, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '2 days', false, NULL),
    (5, 5, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '2 days', false, NULL),
    (6, 4, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '1 day', false, NULL),

    -- REVIEW 상태 태스크 (수락함, 완료함 - 검토 대기)
    (7, 2, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '7 days', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (8, 4, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '5 days', true, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (8, 5, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '5 days', true, CURRENT_TIMESTAMP - INTERVAL '2 days'),

    -- DONE 상태 태스크 (전부 완료)
    (9, 1, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '21 days', true, CURRENT_TIMESTAMP - INTERVAL '14 days'),
    (10, 1, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '20 days', true, CURRENT_TIMESTAMP - INTERVAL '13 days'),
    (11, 2, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '18 days', true, CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (12, 3, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '15 days', true, CURRENT_TIMESTAMP - INTERVAL '8 days'),

    -- REJECTED 상태 태스크
    (13, 4, CURRENT_TIMESTAMP, 1, true, CURRENT_TIMESTAMP - INTERVAL '5 days', true, CURRENT_TIMESTAMP - INTERVAL '3 days');

-- 11. 태스크 검증자
INSERT INTO flowtask_task_verifier (task_id, member_no, assigned_at, approved, approved_at, rejection_reason)
VALUES
    -- REVIEW 상태 (검토 대기중)
    (7, 1, CURRENT_TIMESTAMP, false, NULL, NULL),  -- 로그인보안 - 관리자가 검토
    (7, 3, CURRENT_TIMESTAMP, false, NULL, NULL),  -- 로그인보안 - 김철수도 검토
    (8, 1, CURRENT_TIMESTAMP, false, NULL, NULL),  -- 검색필터 - 관리자가 검토

    -- DONE 상태 (검토 승인됨)
    (9, 2, CURRENT_TIMESTAMP - INTERVAL '14 days', true, CURRENT_TIMESTAMP - INTERVAL '14 days', NULL),
    (10, 2, CURRENT_TIMESTAMP - INTERVAL '13 days', true, CURRENT_TIMESTAMP - INTERVAL '13 days', NULL),
    (11, 1, CURRENT_TIMESTAMP - INTERVAL '10 days', true, CURRENT_TIMESTAMP - INTERVAL '10 days', NULL),
    (12, 1, CURRENT_TIMESTAMP - INTERVAL '8 days', true, CURRENT_TIMESTAMP - INTERVAL '8 days', NULL),

    -- REJECTED 상태 (검토 반려됨)
    (13, 1, CURRENT_TIMESTAMP - INTERVAL '2 days', false, NULL, '디자인 시안이 아직 확정되지 않았습니다. 디자인팀 검토 후 재진행해주세요.');

-- 12. 댓글
INSERT INTO flowtask_comment (comment_id, task_id, author_no, content, created_at, updated_at)
VALUES
    (nextval('flowtask_comment_seq'), 4, 1, '워크플로우 상태 전환 로직 설계 문서 공유드립니다. 확인 부탁드려요.', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (nextval('flowtask_comment_seq'), 4, 2, '네, 확인했습니다. 상태 전환시 알림 발송도 추가하면 좋을 것 같습니다.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_comment_seq'), 4, 3, '동의합니다. 알림 기능과 연동하면 좋겠네요.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_comment_seq'), 5, 3, 'WebSocket 연결 테스트 완료했습니다. STOMP 프로토콜 사용합니다.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (nextval('flowtask_comment_seq'), 5, 5, '실시간 알림 UI 컴포넌트 작업 중입니다.', CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    (nextval('flowtask_comment_seq'), 7, 2, '토큰 갱신 로직 구현 완료했습니다. 리뷰 부탁드립니다.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (nextval('flowtask_comment_seq'), 7, 1, 'LGTM! 보안 테스트 진행 후 승인하겠습니다.', CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    (nextval('flowtask_comment_seq'), 13, 1, '디자인 시안이 아직 확정되지 않아서 반려합니다. 디자인팀과 협의 후 재진행해주세요.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_comment_seq'), 13, 4, '네, 알겠습니다. 디자인팀에 요청드리겠습니다.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- 13. 채팅 메시지
INSERT INTO flowtask_chat_message (message_id, team_id, sender_no, content, sent_at)
VALUES
    (nextval('flowtask_chat_seq'), 1, 1, '안녕하세요! Flowtask 개발팀 채팅방입니다.', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (nextval('flowtask_chat_seq'), 1, 2, '반갑습니다! 오늘 워크플로우 시스템 개발 시작합니다.', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (nextval('flowtask_chat_seq'), 1, 3, '저는 실시간 알림 기능 담당입니다. 같이 열심히 해봐요!', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_chat_seq'), 1, 4, '칸반 보드 DnD 개선 작업 진행중입니다.', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (nextval('flowtask_chat_seq'), 1, 5, '프론트엔드 쪽 도움 필요하시면 말씀해주세요!', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    (nextval('flowtask_chat_seq'), 1, 1, '다들 수고하셨습니다. 이번 주 목표 달성 화이팅!', CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- 14. 컬럼 즐겨찾기
INSERT INTO flowtask_column_favorite (column_id, member_no, created_at)
VALUES
    (2, 2, CURRENT_TIMESTAMP),  -- 홍길동 - 진행 중
    (2, 3, CURRENT_TIMESTAMP),  -- 김철수 - 진행 중
    (3, 1, CURRENT_TIMESTAMP);  -- 관리자 - 검토 중
