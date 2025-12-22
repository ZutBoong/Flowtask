-- =============================================
-- Flowtask 샘플 데이터
-- 작업 단위별 컬럼 구조 (프론트엔드, 백엔드, 데이터베이스, DevOps, 디자인/UI)
-- =============================================

-- 1. 회원 (비밀번호: 1234)
INSERT INTO flowtask_member (no, userid, password, name, email, phone, email_verified, register)
VALUES
    (nextval('flowtask_member_seq'), 'admin', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '김팀장', 'admin@flowtask.com', '010-1111-1111', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user1', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '이프론트', 'frontend@flowtask.com', '010-2222-2222', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user2', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '박백엔드', 'backend@flowtask.com', '010-3333-3333', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user3', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '최데브옵스', 'devops@flowtask.com', '010-4444-4444', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user4', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', '정디자이너', 'designer@flowtask.com', '010-5555-5555', TRUE, CURRENT_TIMESTAMP);

-- 2. 팀
INSERT INTO flowtask_team (team_id, team_name, team_code, leader_no, description, created_at)
VALUES
    (nextval('flowtask_team_seq'), 'Flowtask 개발팀', 'TEAM2024', 1, '칸반 보드 협업 툴 개발 프로젝트', CURRENT_TIMESTAMP);

-- 3. 팀 멤버
INSERT INTO flowtask_team_member (team_id, member_no, role, joined_at)
VALUES
    (1, 1, 'LEADER', CURRENT_TIMESTAMP),
    (1, 2, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 3, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 4, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 5, 'MEMBER', CURRENT_TIMESTAMP);

-- 4. 프로젝트
INSERT INTO flowtask_project (project_id, team_id, project_name, created_at)
VALUES
    (nextval('flowtask_project_seq'), 1, 'Flowtask v1.0', CURRENT_TIMESTAMP);

-- 5. 섹션 (타임라인/목록 그룹핑용)
INSERT INTO flowtask_section (section_id, team_id, section_name, position, color, created_at)
VALUES
    (nextval('flowtask_section_seq'), 1, '인증/보안', 0, '#e74c3c', CURRENT_TIMESTAMP),
    (nextval('flowtask_section_seq'), 1, '핵심 기능', 1, '#3498db', CURRENT_TIMESTAMP),
    (nextval('flowtask_section_seq'), 1, '부가 기능', 2, '#2ecc71', CURRENT_TIMESTAMP),
    (nextval('flowtask_section_seq'), 1, '인프라', 3, '#f39c12', CURRENT_TIMESTAMP);

-- 6. 컬럼 (작업 단위별)
INSERT INTO flowtask_column (column_id, team_id, project_id, title, position)
VALUES
    (nextval('flowtask_column_seq'), 1, 1, '프론트엔드', 0),
    (nextval('flowtask_column_seq'), 1, 1, '백엔드', 1),
    (nextval('flowtask_column_seq'), 1, 1, '데이터베이스', 2),
    (nextval('flowtask_column_seq'), 1, 1, 'DevOps', 3),
    (nextval('flowtask_column_seq'), 1, 1, '디자인/UI', 4);

-- 7. 태스크 (프론트엔드)
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, section_id, workflow_status, created_at)
VALUES
    (nextval('flowtask_task_seq'), 1, '로그인 페이지 UI 구현', 'React로 로그인 폼 컴포넌트 개발', 0, 2, 'HIGH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '2 days', 1, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '회원가입 폼 유효성 검사', '이메일, 비밀번호 형식 검증 로직 추가', 1, 2, 'MEDIUM', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 1, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '칸반 보드 드래그 앤 드롭 구현', 'react-beautiful-dnd 라이브러리 활용', 2, 2, 'HIGH', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '1 day', 2, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '태스크 카드 컴포넌트 디자인', '태스크 카드 레이아웃 및 스타일링', 3, 2, 'MEDIUM', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '3 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '컬럼 추가/삭제 기능', '컬럼 관리 UI 및 로직 구현', 4, 2, 'MEDIUM', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '태스크 상세 모달 개선', '댓글, 첨부파일 UI 추가', 5, 2, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '팀 멤버 초대 UI', '멤버 초대 폼 및 팀 코드 입력', 6, 2, 'MEDIUM', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '알림 센터 구현', '실시간 알림 표시 컴포넌트', 7, 2, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '다크모드 지원', '테마 전환 기능 추가', 8, 2, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, '반응형 디자인 적용', '모바일 화면 대응', 9, 2, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 3, 'WAITING', CURRENT_TIMESTAMP);

-- 8. 태스크 (백엔드)
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, section_id, workflow_status, created_at)
VALUES
    (nextval('flowtask_task_seq'), 2, 'JWT 인증 시스템 구축', 'Spring Security + JWT 토큰 기반 인증', 0, 3, 'HIGH', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE + INTERVAL '1 day', 1, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '회원가입 API 개발', '회원가입 엔드포인트 및 비밀번호 암호화', 1, 3, 'HIGH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '2 days', 1, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '권한 관리 시스템', 'ROLE 기반 권한 체크 로직', 2, 3, 'MEDIUM', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 1, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '태스크 CRUD API', '태스크 생성/조회/수정/삭제 엔드포인트', 3, 3, 'HIGH', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE, 2, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '컬럼 관리 API', '컬럼 CRUD 및 순서 변경 API', 4, 3, 'HIGH', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '2 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '드래그 앤 드롭 위치 저장', '태스크 위치 업데이트 API', 5, 3, 'MEDIUM', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '댓글 시스템 API', '댓글 작성/수정/삭제 엔드포인트', 6, 3, 'MEDIUM', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '팀 생성 및 관리 API', '팀 CRUD 및 멤버 관리', 7, 3, 'HIGH', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '1 day', 2, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, 'WebSocket 실시간 통신', 'STOMP 프로토콜로 실시간 업데이트', 8, 3, 'HIGH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '2 days', 3, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '파일 업로드 API', '이미지 및 파일 첨부 기능', 9, 3, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '검색 및 필터링 API', '태스크 검색, 필터링 엔드포인트', 10, 3, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '9 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, '알림 발송 시스템', '이벤트 기반 알림 생성 및 전송', 11, 3, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 3, 'WAITING', CURRENT_TIMESTAMP);

-- 9. 태스크 (데이터베이스)
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, section_id, workflow_status, created_at)
VALUES
    (nextval('flowtask_task_seq'), 3, 'ERD 설계 및 정규화', '데이터베이스 스키마 설계', 0, 3, 'HIGH', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '3 days', 1, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '회원 테이블 생성', 'flowtask_member 테이블 및 인덱스', 1, 3, 'HIGH', CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE - INTERVAL '4 days', 1, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '팀/프로젝트 테이블 생성', 'flowtask_team, flowtask_project 테이블', 2, 3, 'HIGH', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '3 days', 2, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '태스크 관련 테이블 생성', 'flowtask_task, flowtask_column 테이블', 3, 3, 'HIGH', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '2 days', 2, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '댓글/태그 테이블 생성', 'flowtask_comment, flowtask_tag 테이블', 4, 3, 'MEDIUM', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '1 day', 2, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '인덱스 최적화', '자주 조회되는 컬럼에 인덱스 추가', 5, 3, 'MEDIUM', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '쿼리 성능 튜닝', 'N+1 문제 해결 및 쿼리 최적화', 6, 3, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, '백업 전략 수립', '데이터베이스 자동 백업 설정', 7, 4, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 4, 'WAITING', CURRENT_TIMESTAMP);

-- 10. 태스크 (DevOps)
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, section_id, workflow_status, created_at)
VALUES
    (nextval('flowtask_task_seq'), 4, 'Docker 컨테이너화', 'Dockerfile 및 docker-compose 설정', 0, 4, 'HIGH', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '1 day', 4, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, 'AWS EC2 인스턴스 설정', '프로덕션 서버 환경 구축', 1, 4, 'HIGH', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '2 days', 4, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, 'Nginx 리버스 프록시 설정', 'SSL 인증서 및 도메인 연결', 2, 4, 'HIGH', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 4, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, 'CI/CD 파이프라인 구축', 'GitHub Actions 자동 배포', 3, 4, 'MEDIUM', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 4, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, '모니터링 시스템 구축', 'Prometheus + Grafana 설정', 4, 4, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 4, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, '로그 수집 시스템', 'ELK Stack 구성', 5, 4, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 4, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, '부하 테스트 수행', 'JMeter로 성능 테스트', 6, 4, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days', 4, 'WAITING', CURRENT_TIMESTAMP);

-- 11. 태스크 (디자인/UI)
INSERT INTO flowtask_task (task_id, column_id, title, description, position, assignee_no, priority, start_date, due_date, section_id, workflow_status, created_at)
VALUES
    (nextval('flowtask_task_seq'), 5, '와이어프레임 제작', 'Figma로 전체 화면 와이어프레임', 0, 5, 'HIGH', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '5 days', 1, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, 'UI/UX 디자인 시스템', '컬러, 타이포그래피, 컴포넌트 정의', 1, 5, 'HIGH', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '3 days', 1, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '로고 및 브랜딩', 'Flowtask 로고 디자인', 2, 5, 'MEDIUM', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '2 days', 1, 'DONE', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '칸반 보드 UI 디자인', '보드 화면 상세 디자인', 3, 5, 'HIGH', CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, 2, 'IN_PROGRESS', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '태스크 카드 디자인', '카드 레이아웃 및 상태 표시', 4, 5, 'HIGH', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '2 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '아이콘 세트 제작', 'SVG 아이콘 라이브러리', 5, 5, 'MEDIUM', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 2, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '모바일 UI 디자인', '반응형 디자인 가이드', 6, 5, 'MEDIUM', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '인터랙션 프로토타입', 'Figma 인터랙티브 프로토타입', 7, 5, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '9 days', 3, 'WAITING', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 5, '사용성 테스트', '유저 테스트 및 피드백 수집', 8, 5, 'LOW', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 days', 3, 'WAITING', CURRENT_TIMESTAMP);

-- 12. 댓글
INSERT INTO flowtask_comment (comment_id, task_id, author_no, content, created_at, updated_at)
VALUES
    (nextval('flowtask_comment_seq'), 1, 1, 'JWT 토큰 처리 로직과 연동 필요합니다.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_comment_seq'), 1, 2, '로그인 실패 시 에러 메시지 표시 완료했습니다.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (nextval('flowtask_comment_seq'), 3, 1, '드래그 앤 드롭 시 부드러운 애니메이션 추가해주세요.', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (nextval('flowtask_comment_seq'), 3, 2, '라이브러리 버전 업데이트 후 문제 해결했습니다.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_comment_seq'), 11, 3, 'JWT 토큰 검증 로직 추가 완료', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (nextval('flowtask_comment_seq'), 11, 1, '테스트 케이스도 작성 부탁드립니다.', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (nextval('flowtask_comment_seq'), 14, 3, '태스크 위치 저장 API 엔드포인트: POST /api/task/move', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (nextval('flowtask_comment_seq'), 31, 4, 'Docker Compose로 PostgreSQL, Spring Boot, React 모두 통합했습니다.', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (nextval('flowtask_comment_seq'), 31, 1, '잘 작동하는 것 확인했습니다!', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (nextval('flowtask_comment_seq'), 38, 5, 'Figma 링크 공유드립니다: https://figma.com/...', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days');

-- 13. 채팅 메시지
INSERT INTO flowtask_chat_message (message_id, team_id, sender_no, content, sent_at)
VALUES
    (nextval('flowtask_chat_seq'), 1, 1, '안녕하세요! Flowtask 개발팀 채팅방입니다.', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (nextval('flowtask_chat_seq'), 1, 2, '프론트엔드 개발 시작했습니다!', CURRENT_TIMESTAMP - INTERVAL '9 days'),
    (nextval('flowtask_chat_seq'), 1, 3, '백엔드 JWT 인증 구현 중입니다.', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    (nextval('flowtask_chat_seq'), 1, 4, 'Docker 설정 완료했습니다.', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (nextval('flowtask_chat_seq'), 1, 5, 'UI 디자인 시안 공유드립니다.', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    (nextval('flowtask_chat_seq'), 1, 1, '오늘 오후 3시에 스프린트 회의 진행하겠습니다.', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    (nextval('flowtask_chat_seq'), 1, 2, '칸반 보드 드래그 앤 드롭 기능 완성했습니다!', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (nextval('flowtask_chat_seq'), 1, 3, 'API 문서 업데이트했으니 확인 부탁드립니다.', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (nextval('flowtask_chat_seq'), 1, 4, 'AWS 배포 환경 구축 완료', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (nextval('flowtask_chat_seq'), 1, 5, '사용성 테스트 일정 잡아봅시다.', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (nextval('flowtask_chat_seq'), 1, 1, '다들 고생하셨습니다! 금주 목표 달성했습니다.', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    (nextval('flowtask_chat_seq'), 1, 2, '다음 주 일정 논의가 필요할 것 같습니다.', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    (nextval('flowtask_chat_seq'), 1, 3, 'WebSocket 실시간 업데이트 잘 작동하네요!', CURRENT_TIMESTAMP - INTERVAL '3 hours');

-- 14. 태스크 담당자
INSERT INTO flowtask_task_assignee (task_id, member_no, assigned_at, assigned_by, accepted, completed)
VALUES
    (1, 2, CURRENT_TIMESTAMP - INTERVAL '5 days', 1, true, false),
    (2, 2, CURRENT_TIMESTAMP - INTERVAL '3 days', 1, true, false),
    (3, 2, CURRENT_TIMESTAMP - INTERVAL '7 days', 1, true, false),
    (11, 3, CURRENT_TIMESTAMP - INTERVAL '6 days', 1, true, false),
    (12, 3, CURRENT_TIMESTAMP - INTERVAL '5 days', 1, true, false),
    (14, 3, CURRENT_TIMESTAMP - INTERVAL '8 days', 1, true, true),
    (23, 3, CURRENT_TIMESTAMP - INTERVAL '10 days', 1, true, true),
    (24, 3, CURRENT_TIMESTAMP - INTERVAL '9 days', 1, true, true),
    (31, 4, CURRENT_TIMESTAMP - INTERVAL '8 days', 1, true, true),
    (32, 4, CURRENT_TIMESTAMP - INTERVAL '5 days', 1, true, false),
    (38, 5, CURRENT_TIMESTAMP - INTERVAL '12 days', 1, true, true),
    (39, 5, CURRENT_TIMESTAMP - INTERVAL '10 days', 1, true, true),
    (41, 5, CURRENT_TIMESTAMP - INTERVAL '6 days', 1, true, false);

-- 15. 태스크 즐겨찾기
INSERT INTO flowtask_task_favorite (task_id, member_no, created_at)
VALUES
    (1, 1, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (3, 1, CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (11, 1, CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (14, 3, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (32, 4, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (41, 5, CURRENT_TIMESTAMP - INTERVAL '1 day');
