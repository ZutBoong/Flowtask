-- Chat (팀 채팅) 스키마
-- 팀 내 실시간 채팅 기능

-- 시퀀스 생성
CREATE SEQUENCE flowtask_chat_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- 채팅 메시지 테이블
CREATE TABLE flowtask_chat_message (
    message_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    sender_no NUMBER NOT NULL,
    content VARCHAR2(2000) NOT NULL,
    sent_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_chat_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_no)
        REFERENCES flowtask_member(no) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_chat_team ON flowtask_chat_message(team_id);
CREATE INDEX idx_chat_sent ON flowtask_chat_message(sent_at DESC);

COMMIT;
