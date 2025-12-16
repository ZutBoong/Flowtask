-- Flowtask 프로젝트 Oracle DB 스크립트 - Member
-- 실행 전 적절한 사용자로 접속하세요

-- 테이블 삭제 (존재할 경우)
-- DROP TABLE flowtask_member CASCADE CONSTRAINTS;
-- DROP SEQUENCE flowtask_member_seq;

-- =============================================
-- 회원 테이블
-- =============================================

-- 회원 시퀀스 생성
CREATE SEQUENCE flowtask_member_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- 회원 테이블 생성
CREATE TABLE flowtask_member (
    no NUMBER PRIMARY KEY,
    userid VARCHAR2(50) NOT NULL UNIQUE,
    password VARCHAR2(100) NOT NULL,
    name VARCHAR2(50) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    phone VARCHAR2(20),
    register DATE DEFAULT SYSDATE
);

-- 회원 인덱스 생성
CREATE INDEX idx_flowtask_member_userid ON flowtask_member(userid);
CREATE INDEX idx_flowtask_member_email ON flowtask_member(email);

COMMIT;
