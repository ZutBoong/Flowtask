-- Git 연동 스키마
-- GitHub Personal Access Token 방식으로 연동

-- 저장소 시퀀스
CREATE SEQUENCE flowtask_git_repo_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- Git 저장소 테이블
CREATE TABLE flowtask_git_repo (
    repo_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    provider VARCHAR2(20) DEFAULT 'GITHUB',
    repo_owner VARCHAR2(100) NOT NULL,
    repo_name VARCHAR2(100) NOT NULL,
    access_token VARCHAR2(500),
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_gitrepo_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT uk_gitrepo_team UNIQUE (team_id)
);

-- 이슈-커밋 연결 테이블
CREATE TABLE flowtask_task_commit (
    task_id NUMBER NOT NULL,
    commit_sha VARCHAR2(40) NOT NULL,
    commit_message VARCHAR2(500),
    author_name VARCHAR2(100),
    author_email VARCHAR2(200),
    committed_at DATE,
    commit_url VARCHAR2(500),
    PRIMARY KEY (task_id, commit_sha),
    CONSTRAINT fk_taskcommit_task FOREIGN KEY (task_id)
        REFERENCES flowtask_task(task_id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_gitrepo_team ON flowtask_git_repo(team_id);
CREATE INDEX idx_taskcommit_task ON flowtask_task_commit(task_id);

COMMIT;
