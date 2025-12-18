-- =============================================
-- Flowtask - Workflow System Migration
-- Run this to add workflow columns to existing database
-- =============================================

-- 1. Add workflow columns to flowtask_task
ALTER TABLE flowtask_task ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(20) DEFAULT 'WAITING';
ALTER TABLE flowtask_task ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE flowtask_task ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE flowtask_task ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL;

-- 2. Add workflow columns to flowtask_task_assignee
ALTER TABLE flowtask_task_assignee ADD COLUMN IF NOT EXISTS accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE flowtask_task_assignee ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE flowtask_task_assignee ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE flowtask_task_assignee ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Create flowtask_task_verifier table if not exists
CREATE TABLE IF NOT EXISTS flowtask_task_verifier (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_verifier_task ON flowtask_task_verifier(task_id);
CREATE INDEX IF NOT EXISTS idx_task_verifier_member ON flowtask_task_verifier(member_no);

-- 4. Add index for workflow_status
CREATE INDEX IF NOT EXISTS idx_task_workflow_status ON flowtask_task(workflow_status);

-- 5. Migrate existing status values to workflow_status (if status column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flowtask_task' AND column_name = 'status') THEN
        UPDATE flowtask_task SET workflow_status = 'WAITING' WHERE status IN ('OPEN', 'CANNOT_REPRODUCE', 'DUPLICATE') AND workflow_status IS NULL;
        UPDATE flowtask_task SET workflow_status = 'IN_PROGRESS' WHERE status = 'IN_PROGRESS' AND workflow_status IS NULL;
        UPDATE flowtask_task SET workflow_status = 'DONE' WHERE status IN ('RESOLVED', 'CLOSED') AND workflow_status IS NULL;
    END IF;
END $$;

-- 6. Set default workflow_status for any remaining null values
UPDATE flowtask_task SET workflow_status = 'WAITING' WHERE workflow_status IS NULL;

-- Migration complete!
SELECT 'Workflow migration completed successfully!' as message;
