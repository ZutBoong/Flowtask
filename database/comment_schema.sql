-- Comment (댓글) 스키마
-- 이슈에 대한 댓글 기능

-- 시퀀스 생성
CREATE SEQUENCE flowtask_comment_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- 댓글 테이블
CREATE TABLE flowtask_comment (
    comment_id NUMBER PRIMARY KEY,
    task_id NUMBER NOT NULL,
    author_no NUMBER NOT NULL,
    content VARCHAR2(2000) NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    updated_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_comment_task FOREIGN KEY (task_id)
        REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_no)
        REFERENCES flowtask_member(no) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_comment_task ON flowtask_comment(task_id);
CREATE INDEX idx_comment_created ON flowtask_comment(created_at DESC);

COMMIT;
