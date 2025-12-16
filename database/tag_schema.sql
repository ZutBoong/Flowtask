-- Tag System Schema for Flowtask Issue Tracker
-- Run this script as flowtask user

-- Tag sequence
CREATE SEQUENCE flowtask_tag_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- Tag table (team-level tags/labels)
CREATE TABLE flowtask_tag (
    tag_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    tag_name VARCHAR2(50) NOT NULL,
    color VARCHAR2(7) DEFAULT '#6c757d',
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_tag_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT uk_tag_team_name UNIQUE (team_id, tag_name)
);

-- Task-Tag mapping table (many-to-many)
CREATE TABLE flowtask_task_tag (
    task_id NUMBER NOT NULL,
    tag_id NUMBER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_tasktag_task FOREIGN KEY (task_id)
        REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_tasktag_tag FOREIGN KEY (tag_id)
        REFERENCES flowtask_tag(tag_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_tag_team ON flowtask_tag(team_id);
CREATE INDEX idx_tasktag_task ON flowtask_task_tag(task_id);
CREATE INDEX idx_tasktag_tag ON flowtask_task_tag(tag_id);

COMMIT;
