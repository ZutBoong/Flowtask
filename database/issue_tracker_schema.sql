-- Issue Tracker Schema Extension
-- flowtask_task 테이블에 이슈 트래커 필드 추가

-- 새 컬럼 추가
ALTER TABLE flowtask_task ADD (
    assignee_no NUMBER,
    priority VARCHAR2(20) DEFAULT 'MEDIUM',
    due_date DATE,
    status VARCHAR2(30) DEFAULT 'OPEN'
);

-- 외래 키 제약조건 (담당자 삭제 시 NULL로 설정)
ALTER TABLE flowtask_task ADD CONSTRAINT fk_task_assignee
    FOREIGN KEY (assignee_no) REFERENCES flowtask_member(no) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX idx_task_assignee ON flowtask_task(assignee_no);
CREATE INDEX idx_task_status ON flowtask_task(status);
CREATE INDEX idx_task_priority ON flowtask_task(priority);
CREATE INDEX idx_task_due_date ON flowtask_task(due_date);

-- 기존 데이터에 기본값 적용
UPDATE flowtask_task SET status = 'OPEN' WHERE status IS NULL;
UPDATE flowtask_task SET priority = 'MEDIUM' WHERE priority IS NULL;

COMMIT;

/*
Priority 값:
- CRITICAL: 긴급
- HIGH: 높음
- MEDIUM: 보통 (기본값)
- LOW: 낮음

Status 값:
- OPEN: 새로 등록됨 (기본값)
- IN_PROGRESS: 작업 중
- RESOLVED: 해결됨 (검증 대기)
- CLOSED: 완료/닫힘
- CANNOT_REPRODUCE: 재현 불가
- DUPLICATE: 중복 이슈
*/
