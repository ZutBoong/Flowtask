-- Verifier (검증자) 스키마
-- 이슈 해결 후 검증 프로세스를 위한 필드 추가

-- Task 테이블에 검증자 관련 컬럼 추가
ALTER TABLE flowtask_task ADD (
    verifier_no NUMBER,
    verified_at DATE,
    verification_status VARCHAR2(20) DEFAULT 'NONE',
    verification_notes VARCHAR2(1000)
);

-- 검증자 외래키 추가
ALTER TABLE flowtask_task ADD CONSTRAINT fk_task_verifier
    FOREIGN KEY (verifier_no) REFERENCES flowtask_member(no) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX idx_task_verifier ON flowtask_task(verifier_no);
CREATE INDEX idx_task_verif_status ON flowtask_task(verification_status);

-- 검증 상태:
-- NONE: 검증 불필요/미지정 (기본값)
-- PENDING: 검증 대기 중 (검증자 지정됨)
-- APPROVED: 승인됨
-- REJECTED: 반려됨 (재작업 필요)

COMMIT;
