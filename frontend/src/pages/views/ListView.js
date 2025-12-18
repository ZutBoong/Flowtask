import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { taskwrite, taskupdate, taskdelete, taskposition, columnposition } from '../../api/boardApi';
import TaskModal from '../../components/TaskModal';
import './ListView.css';

// 워크플로우 상태
const WORKFLOW_STATUSES = {
    WAITING: { label: '대기', color: '#94a3b8' },
    IN_PROGRESS: { label: '진행', color: '#3b82f6' },
    REVIEW: { label: '검토', color: '#f59e0b' },
    DONE: { label: '완료', color: '#10b981' },
    REJECTED: { label: '반려', color: '#ef4444' }
};

// 우선순위 라벨
const PRIORITY_LABELS = {
    CRITICAL: '긴급',
    HIGH: '높음',
    MEDIUM: '보통',
    LOW: '낮음'
};

// 우선순위 색상
const PRIORITY_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#f59e0b',
    MEDIUM: '#3b82f6',
    LOW: '#6b7280'
};

function ListView({
    team,
    tasks: propTasks,
    columns: propColumns,
    teamMembers,
    loginMember,
    filters,
    addTask,
    updateTask,
    removeTask,
    refreshData
}) {
    const [tasks, setTasks] = useState(propTasks || []);
    const [columns, setColumns] = useState(propColumns || []);
    const [expandedColumns, setExpandedColumns] = useState({});
    const [newTaskTitle, setNewTaskTitle] = useState({});
    const [selectedTask, setSelectedTask] = useState(null);
    const [addingColumnTask, setAddingColumnTask] = useState(null);

    // props 동기화
    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    useEffect(() => {
        setColumns(propColumns || []);
        // 기본적으로 모든 칼럼 펼침
        const expanded = {};
        (propColumns || []).forEach(c => {
            expanded[c.columnId] = true;
        });
        setExpandedColumns(expanded);
    }, [propColumns]);

    // 칼럼 토글
    const toggleColumn = (columnId) => {
        setExpandedColumns(prev => ({
            ...prev,
            [columnId]: !prev[columnId]
        }));
    };

    // 필터 적용
    const applyFilters = (taskList) => {
        if (!filters) return taskList;

        return taskList.filter(task => {
            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                const matchTitle = task.title?.toLowerCase().includes(query);
                const matchDesc = task.description?.toLowerCase().includes(query);
                if (!matchTitle && !matchDesc) return false;
            }

            if (filters.statuses?.length > 0) {
                if (!filters.statuses.includes(task.workflowStatus)) return false;
            }

            if (filters.tags?.length > 0) {
                const taskTagIds = (task.tags || []).map(t => t.tagId);
                if (!filters.tags.some(tagId => taskTagIds.includes(tagId))) return false;
            }

            if (filters.assigneeNo) {
                const hasAssignee = task.assignees?.some(a => a.memberNo === filters.assigneeNo)
                    || task.assigneeNo === filters.assigneeNo;
                if (!hasAssignee) return false;
            }

            if (filters.dueDateFilter) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const taskDue = task.dueDate ? new Date(task.dueDate) : null;

                switch (filters.dueDateFilter) {
                    case 'overdue':
                        if (!taskDue || taskDue >= today) return false;
                        break;
                    case 'today':
                        if (!taskDue) return false;
                        const todayEnd = new Date(today);
                        todayEnd.setDate(todayEnd.getDate() + 1);
                        if (taskDue < today || taskDue >= todayEnd) return false;
                        break;
                    case 'week':
                        if (!taskDue) return false;
                        const weekEnd = new Date(today);
                        weekEnd.setDate(weekEnd.getDate() + 7);
                        if (taskDue < today || taskDue > weekEnd) return false;
                        break;
                    case 'nodate':
                        if (taskDue) return false;
                        break;
                    default:
                        break;
                }
            }

            return true;
        });
    };

    // 칼럼별 태스크 가져오기
    const getTasksByColumn = (columnId) => {
        const columnTasks = tasks.filter(t => t.columnId === columnId);
        return applyFilters(columnTasks);
    };

    // 태스크 추가
    const handleAddTask = async (columnId) => {
        const title = newTaskTitle[columnId];
        if (!title?.trim()) return;

        try {
            await taskwrite({
                columnId,
                title: title.trim()
            });
            setNewTaskTitle(prev => ({ ...prev, [columnId]: '' }));
            setAddingColumnTask(null);
            if (refreshData) refreshData();
        } catch (error) {
            console.error('태스크 추가 실패:', error);
            alert('태스크 추가에 실패했습니다.');
        }
    };

    // 태스크 완료 여부 확인 (워크플로우 상태 기반)
    const isTaskDone = (task) => {
        return task.workflowStatus === 'DONE';
    };

    // 태스크 삭제
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('이 태스크를 삭제하시겠습니까?')) return;

        try {
            await taskdelete(taskId);
            setTasks(prev => prev.filter(t => t.taskId !== taskId));
            if (removeTask) removeTask(taskId);
        } catch (error) {
            console.error('태스크 삭제 실패:', error);
        }
    };

    // 드래그 앤 드롭 핸들러
    const onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // 컬럼 드래그
        if (type === 'column') {
            const newColumns = Array.from(columns);
            const [removed] = newColumns.splice(source.index, 1);
            newColumns.splice(destination.index, 0, removed);

            const updatedColumns = newColumns.map((col, idx) => ({
                ...col,
                position: idx + 1
            }));

            setColumns(updatedColumns);

            try {
                for (const col of updatedColumns) {
                    await columnposition({ columnId: col.columnId, position: col.position });
                }
            } catch (error) {
                console.error('컬럼 위치 저장 실패:', error);
                if (refreshData) refreshData();
            }
            return;
        }

        // 태스크 드래그
        if (type === 'task') {
            const taskId = parseInt(draggableId.replace('task-', ''));
            const destColumnId = parseInt(destination.droppableId.replace('column-', ''));

            const newTasks = [...tasks];
            const taskIndex = newTasks.findIndex(t => t.taskId === taskId);
            const [movedTask] = newTasks.splice(taskIndex, 1);

            movedTask.columnId = destColumnId;

            // 대상 컬럼의 태스크들 (필터링 전)
            const destColumnTasks = newTasks.filter(t => t.columnId === destColumnId);
            destColumnTasks.splice(destination.index, 0, movedTask);

            // position 재계산
            destColumnTasks.forEach((t, idx) => {
                t.position = idx + 1;
            });

            const otherTasks = newTasks.filter(t => t.columnId !== destColumnId);
            setTasks([...otherTasks, ...destColumnTasks]);

            try {
                for (const t of destColumnTasks) {
                    await taskposition({ taskId: t.taskId, columnId: t.columnId, position: t.position });
                }
            } catch (error) {
                console.error('태스크 위치 저장 실패:', error);
                if (refreshData) refreshData();
            }
        }
    };

    // 담당자 이름 가져오기
    const getAssigneeName = (task) => {
        if (task.assignees?.length > 0) {
            return task.assignees.map(a => a.memberName).join(', ');
        }
        if (task.assigneeNo) {
            const member = teamMembers.find(m => m.memberNo === task.assigneeNo);
            return member?.memberName || '-';
        }
        return '-';
    };

    // 마감일 포맷
    const formatDueDate = (dueDate) => {
        if (!dueDate) return '-';
        const date = new Date(dueDate);
        const today = new Date();
        const isOverdue = date < today && date.toDateString() !== today.toDateString();

        return (
            <span className={isOverdue ? 'overdue' : ''}>
                {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
        );
    };

    // 칼럼 렌더링
    const renderColumn = (column, index) => {
        const columnTasks = getTasksByColumn(column.columnId);
        const isExpanded = expandedColumns[column.columnId];

        return (
            <Draggable
                key={`column-${column.columnId}`}
                draggableId={`column-${column.columnId}`}
                index={index}
            >
                {(provided, snapshot) => (
                    <div
                        className={`list-column ${snapshot.isDragging ? 'dragging' : ''}`}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                    >
                        <div className="column-header">
                            <span className="column-drag-handle" {...provided.dragHandleProps}>⋮⋮</span>
                            <span
                                className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleColumn(column.columnId)}
                            >
                                ▶
                            </span>
                            <span className="column-name" onClick={() => toggleColumn(column.columnId)}>{column.title}</span>
                            <span className="task-count">{columnTasks.length}</span>
                        </div>

                        {isExpanded && (
                            <div className="column-content">
                                <table className="task-table">
                                    <thead>
                                        <tr>
                                            <th className="col-drag"></th>
                                            <th className="col-check"></th>
                                            <th className="col-title">제목</th>
                                            <th className="col-assignee">담당자</th>
                                            <th className="col-due">마감일</th>
                                            <th className="col-status">상태</th>
                                            <th className="col-priority">우선순위</th>
                                            <th className="col-actions"></th>
                                        </tr>
                                    </thead>
                                    <Droppable droppableId={`column-${column.columnId}`} type="task">
                                        {(taskProvided, taskSnapshot) => (
                                            <tbody
                                                ref={taskProvided.innerRef}
                                                {...taskProvided.droppableProps}
                                                className={taskSnapshot.isDraggingOver ? 'dragging-over' : ''}
                                            >
                                                {columnTasks.map((task, taskIndex) => (
                                                    <Draggable
                                                        key={`task-${task.taskId}`}
                                                        draggableId={`task-${task.taskId}`}
                                                        index={taskIndex}
                                                    >
                                                        {(taskDragProvided, taskDragSnapshot) => (
                                                            <tr
                                                                ref={taskDragProvided.innerRef}
                                                                {...taskDragProvided.draggableProps}
                                                                className={`${isTaskDone(task) ? 'completed' : ''} ${taskDragSnapshot.isDragging ? 'dragging' : ''}`}
                                                            >
                                                                <td className="col-drag" {...taskDragProvided.dragHandleProps}>
                                                                    <span className="drag-handle">⋮⋮</span>
                                                                </td>
                                                                <td className="col-check">
                                                                    <span className={`status-indicator ${isTaskDone(task) ? 'done' : ''}`}>
                                                                        {isTaskDone(task) ? '✓' : '○'}
                                                                    </span>
                                                                </td>
                                                                <td className="col-title">
                                                                    <span
                                                                        className="task-title-link"
                                                                        onClick={() => setSelectedTask(task)}
                                                                    >
                                                                        {task.title}
                                                                    </span>
                                                                </td>
                                                                <td className="col-assignee">{getAssigneeName(task)}</td>
                                                                <td className="col-due">{formatDueDate(task.dueDate)}</td>
                                                                <td className="col-status">
                                                                    <span
                                                                        className="status-badge"
                                                                        style={{ backgroundColor: WORKFLOW_STATUSES[task.workflowStatus]?.color || '#94a3b8' }}
                                                                    >
                                                                        {WORKFLOW_STATUSES[task.workflowStatus]?.label || '대기'}
                                                                    </span>
                                                                </td>
                                                                <td className="col-priority">
                                                                    {task.priority && (
                                                                        <span
                                                                            className="priority-badge"
                                                                            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM }}
                                                                        >
                                                                            {PRIORITY_LABELS[task.priority] || '보통'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="col-actions">
                                                                    <button
                                                                        className="row-delete-btn"
                                                                        onClick={() => handleDeleteTask(task.taskId)}
                                                                        title="삭제"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {taskProvided.placeholder}
                                            </tbody>
                                        )}
                                    </Droppable>
                                </table>

                                {/* 태스크 추가 */}
                                {addingColumnTask === column.columnId ? (
                                    <div className="add-task-inline">
                                        <input
                                            type="text"
                                            placeholder="태스크 제목 입력..."
                                            value={newTaskTitle[column.columnId] || ''}
                                            onChange={(e) => setNewTaskTitle(prev => ({
                                                ...prev,
                                                [column.columnId]: e.target.value
                                            }))}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') handleAddTask(column.columnId);
                                            }}
                                            autoFocus
                                        />
                                        <button onClick={() => handleAddTask(column.columnId)}>추가</button>
                                        <button onClick={() => setAddingColumnTask(null)}>취소</button>
                                    </div>
                                ) : (
                                    <button
                                        className="add-task-btn"
                                        onClick={() => setAddingColumnTask(column.columnId)}
                                    >
                                        + 작업 추가
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Draggable>
        );
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="list-view">
                {/* 칼럼들 */}
                <Droppable droppableId="columns" type="column">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`columns-droppable ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        >
                            {columns.map((column, index) => renderColumn(column, index))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                {/* 칼럼이 없을 경우 */}
                {columns.length === 0 && (
                    <div className="no-columns">
                        <p>보드에서 칼럼을 먼저 생성해주세요.</p>
                    </div>
                )}

                {/* 태스크 상세 모달 */}
                {selectedTask && (
                    <TaskModal
                        task={selectedTask}
                        teamId={team?.teamId}
                        loginMember={loginMember}
                        onClose={() => setSelectedTask(null)}
                        onSave={() => {
                            if (refreshData) refreshData();
                            setSelectedTask(null);
                        }}
                    />
                )}
            </div>
        </DragDropContext>
    );
}

export default ListView;
