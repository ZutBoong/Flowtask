-- =============================================
-- Flowtask Sample Data
-- Docker + Spring Boot
-- =============================================

-- 1. Sample Members (password: 1234)
INSERT INTO flowtask_member (no, userid, password, name, email, email_verified, register)
VALUES
    (nextval('flowtask_member_seq'), 'admin', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', 'Admin', 'admin@flowtask.com', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user1', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', 'John Doe', 'john@flowtask.com', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user2', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', 'Jane Smith', 'jane@flowtask.com', TRUE, CURRENT_TIMESTAMP),
    (nextval('flowtask_member_seq'), 'user3', '$2a$10$yXU9hNrs4xJPAZ/RdnpxzuaXH4aNT7f1RyW7FCJ3GPDVbGksO4u6W', 'Bob Wilson', 'bob@flowtask.com', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

-- 2. Sample Teams
INSERT INTO flowtask_team (team_id, team_name, team_code, leader_no, created_at)
VALUES
    (nextval('flowtask_team_seq'), 'Flowtask Dev Team', 'FLOW2024', 1, CURRENT_TIMESTAMP),
    (nextval('flowtask_team_seq'), 'Marketing Team', 'MARK2024', 1, CURRENT_TIMESTAMP)
ON CONFLICT (team_code) DO NOTHING;

-- 3. Team Members
INSERT INTO flowtask_team_member (team_id, member_no, role, joined_at)
VALUES
    (1, 1, 'OWNER', CURRENT_TIMESTAMP),
    (1, 2, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 3, 'MEMBER', CURRENT_TIMESTAMP),
    (1, 4, 'MEMBER', CURRENT_TIMESTAMP),
    (2, 1, 'OWNER', CURRENT_TIMESTAMP),
    (2, 2, 'MEMBER', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 4. Sample Projects
INSERT INTO flowtask_project (project_id, team_id, project_name, created_at)
VALUES
    (nextval('flowtask_project_seq'), 1, 'Web Application', CURRENT_TIMESTAMP),
    (nextval('flowtask_project_seq'), 1, 'Mobile App', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 5. Sample Columns (Kanban Board)
INSERT INTO flowtask_column (column_id, team_id, project_id, title, position)
VALUES
    (nextval('flowtask_column_seq'), 1, 1, 'To Do', 1),
    (nextval('flowtask_column_seq'), 1, 1, 'In Progress', 2),
    (nextval('flowtask_column_seq'), 1, 1, 'Review', 3),
    (nextval('flowtask_column_seq'), 1, 1, 'Done', 4)
ON CONFLICT DO NOTHING;

-- 6. Sample Tags
INSERT INTO flowtask_tag (tag_id, team_id, tag_name, color, created_at)
VALUES
    (nextval('flowtask_tag_seq'), 1, 'Bug', '#dc3545', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, 'Feature', '#198754', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, 'Enhancement', '#0d6efd', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, 'Documentation', '#6c757d', CURRENT_TIMESTAMP),
    (nextval('flowtask_tag_seq'), 1, 'Urgent', '#fd7e14', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 7. Sample Tasks
INSERT INTO flowtask_task (task_id, column_id, title, description, position, priority, workflow_status, assignee_no, due_date, created_at)
VALUES
    (nextval('flowtask_task_seq'), 1, 'Implement Login', 'JWT based login/logout feature', 1, 'HIGH', 'WAITING', 2, CURRENT_DATE + INTERVAL '7 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, 'Design Registration Page', 'Improve registration UI/UX', 2, 'MEDIUM', 'WAITING', 3, CURRENT_DATE + INTERVAL '5 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 1, 'Write API Documentation', 'Document APIs with Swagger', 3, 'LOW', 'WAITING', NULL, CURRENT_DATE + INTERVAL '14 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, 'Implement Drag and Drop', 'Kanban board DnD feature', 1, 'HIGH', 'IN_PROGRESS', 2, CURRENT_DATE + INTERVAL '3 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 2, 'Real-time Notifications', 'WebSocket based notifications', 2, 'MEDIUM', 'IN_PROGRESS', 4, CURRENT_DATE + INTERVAL '5 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 3, 'Code Review Request', 'Review Task CRUD API', 1, 'MEDIUM', 'COMPLETED', 3, CURRENT_DATE, CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, 'Project Initial Setup', 'Spring Boot + React project structure', 1, 'HIGH', 'COMPLETED', 1, CURRENT_DATE - INTERVAL '7 days', CURRENT_TIMESTAMP),
    (nextval('flowtask_task_seq'), 4, 'DB Schema Design', 'PostgreSQL table design completed', 2, 'HIGH', 'COMPLETED', 1, CURRENT_DATE - INTERVAL '5 days', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 8. Task-Tag Relations
INSERT INTO flowtask_task_tag (task_id, tag_id)
VALUES
    (1, 2),  -- Login - Feature
    (2, 3),  -- Registration - Enhancement
    (3, 4),  -- API Docs - Documentation
    (4, 2),  -- DnD - Feature
    (4, 5),  -- DnD - Urgent
    (5, 2),  -- Notifications - Feature
    (6, 3),  -- Code Review - Enhancement
    (7, 2),  -- Initial Setup - Feature
    (8, 4)   -- DB Schema - Documentation
ON CONFLICT DO NOTHING;

-- 9. Multiple Assignees Sample
INSERT INTO flowtask_task_assignee (task_id, member_no, assigned_at, assigned_by)
VALUES
    (4, 2, CURRENT_TIMESTAMP, 1),  -- DnD - John
    (4, 3, CURRENT_TIMESTAMP, 1),  -- DnD - Jane
    (5, 4, CURRENT_TIMESTAMP, 1),  -- Notifications - Bob
    (5, 2, CURRENT_TIMESTAMP, 1)   -- Notifications - John
ON CONFLICT DO NOTHING;

-- 10. Sample Comments
INSERT INTO flowtask_comment (comment_id, task_id, author_no, content, created_at, updated_at)
VALUES
    (nextval('flowtask_comment_seq'), 4, 1, 'I recommend using @hello-pangea/dnd for drag and drop.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (nextval('flowtask_comment_seq'), 4, 2, 'Got it! I will apply it.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (nextval('flowtask_comment_seq'), 5, 4, 'WebSocket connection implementation completed. Please review.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (nextval('flowtask_comment_seq'), 6, 1, 'LGTM! Ready to merge.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 11. Sample Chat Messages
INSERT INTO flowtask_chat_message (message_id, team_id, sender_no, content, sent_at)
VALUES
    (nextval('flowtask_chat_seq'), 1, 1, 'Hello! Welcome to Flowtask Dev Team chat.', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    (nextval('flowtask_chat_seq'), 1, 2, 'Hi everyone! I checked today tasks.', CURRENT_TIMESTAMP - INTERVAL '50 minutes'),
    (nextval('flowtask_chat_seq'), 1, 3, 'Starting work on the registration page.', CURRENT_TIMESTAMP - INTERVAL '45 minutes'),
    (nextval('flowtask_chat_seq'), 1, 4, 'Real-time notifications almost done!', CURRENT_TIMESTAMP - INTERVAL '10 minutes')
ON CONFLICT DO NOTHING;

-- Done
DO $$
BEGIN
    RAISE NOTICE 'Sample data inserted!';
    RAISE NOTICE 'Test accounts: admin / 1234, user1 / 1234, user2 / 1234, user3 / 1234';
END $$;
