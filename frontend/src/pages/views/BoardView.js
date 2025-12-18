import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    columnwrite, columnupdate, columndelete, columnposition,
    taskwrite, taskdelete, taskposition,
    tasklistByTeam, columnlistByTeam
} from '../../api/boardApi';
import {
    toggleColumnFavorite, checkColumnFavorite,
    archiveColumn
} from '../../api/columnApi';
import TaskModal from '../../components/TaskModal';
import './BoardView.css';

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
    CRITICAL: { label: '긴급', color: '#dc2626' },
    HIGH: { label: '높음', color: '#f59e0b' },
    MEDIUM: { label: '보통', color: '#3b82f6' },
    LOW: { label: '낮음', color: '#6b7280' }
};

function BoardView({
    team,
    columns: propColumns,
    tasks: propTasks,
    teamMembers,
    loginMember,
    filters,
    updateTask,
    addTask,
    removeTask,
    updateColumn,
    addColumn,
    removeColumn,
    refreshData
}) {
    // 로컬 상태 (드래그 등 즉각적인 UI 반응용)
    const [columns, setColumns] = useState(propColumns || []);
    const [tasks, setTasks] = useState(propTasks || []);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [newTaskTitle, setNewTaskTitle] = useState({});
    const [editingColumn, setEditingColumn] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);

    // 컬럼 기능 관련 상태
    const [columnFavorites, setColumnFavoritesState] = useState({});
    const [columnMenuOpen, setColumnMenuOpen] = useState(null);
    const [archiveModalColumn, setArchiveModalColumn] = useState(null);
    const [archiveNote, setArchiveNote] = useState('');

    // 스크롤 관련
    const columnsContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // props 변경 시 로컬 상태 동기화
    useEffect(() => {
        setColumns(propColumns || []);
    }, [propColumns]);

    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    // 컬럼 즐겨찾기 로드
    useEffect(() => {
        if (columns.length > 0 && loginMember) {
            loadColumnFavorites(columns);
        }
    }, [columns, loginMember]);

    const loadColumnFavorites = async (columnList) => {
        if (!loginMember) return;

        const favoritesMap = {};

        await Promise.all(columnList.map(async (column) => {
            try {
                const favoriteResult = await checkColumnFavorite(column.columnId, loginMember.no);
                favoritesMap[column.columnId] = favoriteResult?.isFavorite || false;
            } catch (e) {
                favoritesMap[column.columnId] = false;
            }
        }));

        setColumnFavoritesState(favoritesMap);
    };

    // 스크롤 상태 체크
    const checkScrollState = useCallback(() => {
        const container = columnsContainerRef.current;
        if (container) {
            setCanScrollLeft(container.scrollLeft > 0);
            setCanScrollRight(
                container.scrollLeft < container.scrollWidth - container.clientWidth - 1
            );
        }
    }, []);

    useEffect(() => {
        const container = columnsContainerRef.current;
        if (container) {
            checkScrollState();
            container.addEventListener('scroll', checkScrollState);
            window.addEventListener('resize', checkScrollState);
            return () => {
                container.removeEventListener('scroll', checkScrollState);
                window.removeEventListener('resize', checkScrollState);
            };
        }
    }, [checkScrollState, columns]);

    const handleScroll = (direction) => {
        const container = columnsContainerRef.current;
        if (container) {
            const scrollAmount = 300;
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // 컬럼 즐겨찾기 토글
    const handleToggleFavorite = async (columnId) => {
        if (!loginMember) return;
        try {
            const result = await toggleColumnFavorite(columnId, loginMember.no);
            setColumnFavoritesState(prev => ({
                ...prev,
                [columnId]: result.isFavorite
            }));
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
        }
    };

    // 컬럼 아카이브
    const handleArchiveColumn = async (columnId) => {
        if (!loginMember) return;
        try {
            await archiveColumn(columnId, loginMember.no, archiveNote);
            alert('컬럼이 아카이브되었습니다.');
            setArchiveModalColumn(null);
            setArchiveNote('');
        } catch (error) {
            console.error('아카이브 실패:', error);
            alert('아카이브에 실패했습니다.');
        }
    };

    // 필터 적용
    const applyFilters = (taskList) => {
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

    const getTasksByColumn = (columnId) => {
        const columnTasks = tasks.filter(task => task.columnId === columnId);
        const filteredTasks = applyFilters(columnTasks);
        return filteredTasks.sort((a, b) => a.position - b.position);
    };

    // 드래그 앤 드롭
    const onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

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
            }
            return;
        }

        if (type === 'task') {
            const taskId = parseInt(draggableId.replace('task-', ''));
            const destColumnId = parseInt(destination.droppableId.replace('column-', ''));

            const newTasks = [...tasks];
            const taskIndex = newTasks.findIndex(t => t.taskId === taskId);
            const [movedTask] = newTasks.splice(taskIndex, 1);

            movedTask.columnId = destColumnId;

            const destColumnTasks = newTasks.filter(t => t.columnId === destColumnId);
            destColumnTasks.splice(destination.index, 0, movedTask);

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
            }
        }
    };

    // 컬럼 추가
    const handleAddColumn = async () => {
        if (!newColumnTitle.trim() || !team) return;

        try {
            await columnwrite({
                title: newColumnTitle,
                teamId: team.teamId
            });
            setNewColumnTitle('');
            const columnsData = await columnlistByTeam(team.teamId);
            setColumns(columnsData || []);
        } catch (error) {
            console.error('컬럼 추가 실패:', error);
        }
    };

    // 컬럼 수정
    const handleUpdateColumn = async (columnId, newTitle) => {
        try {
            await columnupdate({ columnId, title: newTitle });
            setColumns(prev => prev.map(col =>
                col.columnId === columnId ? { ...col, title: newTitle } : col
            ));
            setEditingColumn(null);
        } catch (error) {
            console.error('컬럼 수정 실패:', error);
        }
    };

    // 컬럼 삭제
    const handleDeleteColumn = async (columnId) => {
        if (!window.confirm('이 컬럼과 모든 태스크를 삭제하시겠습니까?')) return;

        try {
            await columndelete(columnId);
            setColumns(prev => prev.filter(col => col.columnId !== columnId));
            setTasks(prev => prev.filter(task => task.columnId !== columnId));
        } catch (error) {
            console.error('컬럼 삭제 실패:', error);
        }
    };

    // 태스크 추가
    const handleAddTask = async (columnId) => {
        const title = newTaskTitle[columnId];
        if (!title?.trim()) return;

        try {
            await taskwrite({ columnId, title });
            setNewTaskTitle({ ...newTaskTitle, [columnId]: '' });
            const tasksData = await tasklistByTeam(team.teamId);
            setTasks(tasksData || []);
        } catch (error) {
            console.error('태스크 추가 실패:', error);
        }
    };

    // 태스크 삭제
    const handleDeleteTask = async (taskId) => {
        try {
            await taskdelete(taskId);
            setTasks(prev => prev.filter(t => t.taskId !== taskId));
        } catch (error) {
            console.error('태스크 삭제 실패:', error);
        }
    };

    // 태스크 클릭 시 모달 열기
    const handleTaskClick = (task) => {
        setSelectedTask(task);
    };

    return (
        <div className="board-view">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="columns-wrapper">
                    {canScrollLeft && (
                        <>
                            <div className="scroll-fade scroll-fade-left" />
                            <button
                                className="scroll-arrow scroll-arrow-left"
                                onClick={() => handleScroll('left')}
                            >
                                ‹
                            </button>
                        </>
                    )}
                    {canScrollRight && (
                        <>
                            <div className="scroll-fade scroll-fade-right" />
                            <button
                                className="scroll-arrow scroll-arrow-right"
                                onClick={() => handleScroll('right')}
                            >
                                ›
                            </button>
                        </>
                    )}

                    <Droppable droppableId="board" direction="horizontal" type="column">
                        {(provided) => (
                            <div
                                className="columns-container"
                                ref={(node) => {
                                    provided.innerRef(node);
                                    columnsContainerRef.current = node;
                                }}
                                {...provided.droppableProps}
                            >
                                {columns.map((column, index) => (
                                    <Draggable
                                        key={`column-${column.columnId}`}
                                        draggableId={`column-${column.columnId}`}
                                        index={index}
                                    >
                                        {(provided) => (
                                            <div
                                                className="column"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                            >
                                                <div className="column-header" {...provided.dragHandleProps}>
                                                    {editingColumn === column.columnId ? (
                                                        <input
                                                            type="text"
                                                            defaultValue={column.title}
                                                            onBlur={(e) => handleUpdateColumn(column.columnId, e.target.value)}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateColumn(column.columnId, e.target.value);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <div className="column-title-row">
                                                                <button
                                                                    className={`favorite-btn ${columnFavorites[column.columnId] ? 'active' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleFavorite(column.columnId);
                                                                    }}
                                                                    title={columnFavorites[column.columnId] ? '즐겨찾기 해제' : '즐겨찾기'}
                                                                >
                                                                    {columnFavorites[column.columnId] ? '★' : '☆'}
                                                                </button>
                                                                <h3 onClick={() => setEditingColumn(column.columnId)}>
                                                                    {column.title}
                                                                </h3>
                                                                <div className="column-menu-wrapper">
                                                                    <button
                                                                        className="column-menu-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setColumnMenuOpen(columnMenuOpen === column.columnId ? null : column.columnId);
                                                                        }}
                                                                    >
                                                                        ⋮
                                                                    </button>
                                                                    {columnMenuOpen === column.columnId && (
                                                                        <div className="column-menu-dropdown">
                                                                            <button onClick={() => {
                                                                                setArchiveModalColumn(column.columnId);
                                                                                setColumnMenuOpen(null);
                                                                            }}>
                                                                                아카이브
                                                                            </button>
                                                                            <button
                                                                                className="menu-delete-btn"
                                                                                onClick={() => {
                                                                                    handleDeleteColumn(column.columnId);
                                                                                    setColumnMenuOpen(null);
                                                                                }}
                                                                            >
                                                                                삭제
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <Droppable droppableId={`column-${column.columnId}`} type="task">
                                                    {(provided, snapshot) => (
                                                        <div
                                                            className={`tasks-container ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                        >
                                                            {getTasksByColumn(column.columnId).map((task, taskIndex) => (
                                                                <Draggable
                                                                    key={`task-${task.taskId}`}
                                                                    draggableId={`task-${task.taskId}`}
                                                                    index={taskIndex}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${task.workflowStatus === 'DONE' ? 'done' : ''}`}
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            onClick={() => handleTaskClick(task)}
                                                                        >
                                                                            {task.priority && PRIORITY_LABELS[task.priority] && (
                                                                                <div className="task-card-priority">
                                                                                    <span
                                                                                        className="priority-badge"
                                                                                        style={{ backgroundColor: PRIORITY_LABELS[task.priority].color }}
                                                                                    >
                                                                                        {PRIORITY_LABELS[task.priority].label}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="task-card-top">
                                                                                <div className="task-card-title">
                                                                                    {task.title}
                                                                                </div>
                                                                                <button
                                                                                    className="delete-btn"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteTask(task.taskId);
                                                                                    }}
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                            <div className="task-card-meta">
                                                                                {task.dueDate && (
                                                                                    <span className={`due-date ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                                                                        {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                                                    </span>
                                                                                )}
                                                                                {task.workflowStatus && WORKFLOW_STATUSES[task.workflowStatus] && (
                                                                                    <span
                                                                                        className={`workflow-status-badge status-${task.workflowStatus?.toLowerCase().replace('_', '-')}`}
                                                                                        style={{ backgroundColor: WORKFLOW_STATUSES[task.workflowStatus].color }}
                                                                                    >
                                                                                        {WORKFLOW_STATUSES[task.workflowStatus].label}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>

                                                <div className="add-task">
                                                    <input
                                                        type="text"
                                                        placeholder="새 태스크 추가..."
                                                        value={newTaskTitle[column.columnId] || ''}
                                                        onChange={(e) => setNewTaskTitle({
                                                            ...newTaskTitle,
                                                            [column.columnId]: e.target.value
                                                        })}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleAddTask(column.columnId);
                                                            }
                                                        }}
                                                    />
                                                    <button onClick={() => handleAddTask(column.columnId)}>
                                                        + 추가
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                <div className="add-column">
                                    <input
                                        type="text"
                                        placeholder="새 컬럼 추가..."
                                        value={newColumnTitle}
                                        onChange={(e) => setNewColumnTitle(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddColumn();
                                            }
                                        }}
                                    />
                                    <button onClick={handleAddColumn}>+ 컬럼 추가</button>
                                </div>
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>

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

            {/* 컬럼 아카이브 모달 */}
            {archiveModalColumn && (
                <div className="modal-overlay" onClick={() => setArchiveModalColumn(null)}>
                    <div className="modal-content archive-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>컬럼 아카이브</h3>
                            <button className="close-btn" onClick={() => setArchiveModalColumn(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-description">
                                이 컬럼과 모든 태스크를 아카이브합니다.
                            </p>
                            <div className="archive-note-section">
                                <label>메모 (선택사항)</label>
                                <textarea
                                    value={archiveNote}
                                    onChange={(e) => setArchiveNote(e.target.value)}
                                    placeholder="이 컬럼을 아카이브하는 이유나 목적을 기록하세요..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => {
                                setArchiveModalColumn(null);
                                setArchiveNote('');
                            }}>취소</button>
                            <button
                                className="save-btn archive-btn"
                                onClick={() => handleArchiveColumn(archiveModalColumn)}
                            >
                                아카이브
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BoardView;
