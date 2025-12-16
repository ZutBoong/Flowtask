import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    columnlistByTeam, columnwrite, columnupdate, columndelete, columnposition,
    tasklistByTeam, taskwrite, taskupdate, taskdelete, taskposition
} from '../api/boardApi';
import { getTeamMembers } from '../api/teamApi';
import websocketService from '../api/websocketService';
import Sidebar from '../components/Sidebar';
import TaskModal from '../components/TaskModal';
import FilterBar from '../components/FilterBar';
import ChatPanel from '../components/ChatPanel';
import './Board.css';

// 우선순위 색상 맵
const PRIORITY_COLORS = {
    CRITICAL: '#dc3545',
    HIGH: '#fd7e14',
    MEDIUM: '#0d6efd',
    LOW: '#6c757d'
};

// 상태 라벨 맵
const STATUS_LABELS = {
    OPEN: '열림',
    IN_PROGRESS: '진행중',
    RESOLVED: '해결됨',
    CLOSED: '닫힘',
    CANNOT_REPRODUCE: '재현불가',
    DUPLICATE: '중복'
};

// 검증 상태 맵
const VERIFICATION_LABELS = {
    PENDING: { label: '검증 대기', color: '#ffc107' },
    APPROVED: { label: '승인됨', color: '#198754' },
    REJECTED: { label: '반려됨', color: '#dc3545' }
};

function Board() {
    const navigate = useNavigate();
    const [columns, setColumns] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [newTaskTitle, setNewTaskTitle] = useState({});
    const [editingColumn, setEditingColumn] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginMember, setLoginMember] = useState(null);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [wsConnected, setWsConnected] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);  // 모달용 선택된 태스크
    const [teamMembers, setTeamMembers] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);  // 채팅 패널 열림/닫힘
    const [filters, setFilters] = useState({
        searchQuery: '',
        priorities: [],
        statuses: [],
        tags: [],
        assigneeNo: null,
        dueDateFilter: ''
    });
    const [showTeamCode, setShowTeamCode] = useState(false);
    const [codeCopySuccess, setCodeCopySuccess] = useState(false);

    // 스크롤 관련
    const columnsContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

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

    // 화살표 클릭 시 스크롤
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

    // 스크롤 이벤트 리스너
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

    // 팀 코드 복사
    const handleCopyTeamCode = async () => {
        if (!currentTeam?.teamCode) return;
        try {
            await navigator.clipboard.writeText(currentTeam.teamCode);
            setCodeCopySuccess(true);
            setTimeout(() => setCodeCopySuccess(false), 2000);
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = currentTeam.teamCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCodeCopySuccess(true);
            setTimeout(() => setCodeCopySuccess(false), 2000);
        }
    };

    // WebSocket 이벤트 핸들러
    const handleBoardEvent = useCallback((event) => {
        console.log('Board event received:', event);

        switch (event.eventType) {
            case 'COLUMN_CREATED':
                setColumns(prev => {
                    const exists = prev.some(col => col.columnId === event.payload.columnId);
                    if (exists) return prev;
                    return [...prev, event.payload].sort((a, b) => a.position - b.position);
                });
                break;

            case 'COLUMN_UPDATED':
                setColumns(prev => prev.map(col =>
                    col.columnId === event.payload.columnId ? event.payload : col
                ));
                break;

            case 'COLUMN_DELETED':
                setColumns(prev => prev.filter(col => col.columnId !== event.payload));
                setTasks(prev => prev.filter(task => task.columnId !== event.payload));
                break;

            case 'COLUMN_MOVED':
                setColumns(prev => prev.map(col =>
                    col.columnId === event.payload.columnId ? event.payload : col
                ).sort((a, b) => a.position - b.position));
                break;

            case 'TASK_CREATED':
                setTasks(prev => {
                    const exists = prev.some(task => task.taskId === event.payload.taskId);
                    if (exists) return prev;
                    return [...prev, event.payload];
                });
                break;

            case 'TASK_UPDATED':
                setTasks(prev => prev.map(task =>
                    task.taskId === event.payload.taskId ? event.payload : task
                ));
                break;

            case 'TASK_DELETED':
                setTasks(prev => prev.filter(task => task.taskId !== event.payload));
                break;

            case 'TASK_MOVED':
                setTasks(prev => prev.map(task =>
                    task.taskId === event.payload.taskId ? event.payload : task
                ));
                break;

            default:
                console.warn('Unknown event type:', event.eventType);
        }
    }, []);

    // 로그인 정보 확인
    useEffect(() => {
        const token = localStorage.getItem('token');
        const member = localStorage.getItem('member');
        if (!token || !member) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        setLoginMember(JSON.parse(member));
    }, [navigate]);

    // WebSocket 연결
    useEffect(() => {
        websocketService.connect(
            () => {
                console.log('WebSocket connected in Board');
                setWsConnected(true);
            },
            (error) => console.error('WebSocket error:', error)
        );

        return () => {
            websocketService.disconnect();
        };
    }, []);

    // 팀 변경 시 WebSocket 구독
    useEffect(() => {
        if (currentTeam && wsConnected) {
            websocketService.subscribeToTeam(currentTeam.teamId, handleBoardEvent);

            return () => {
                websocketService.unsubscribeFromTeam(currentTeam.teamId);
            };
        }
    }, [currentTeam, wsConnected, handleBoardEvent]);

    // 팀 변경 시 데이터 로드
    useEffect(() => {
        if (currentTeam) {
            localStorage.setItem('currentTeam', JSON.stringify(currentTeam));
            fetchData();
        } else {
            setColumns([]);
            setTasks([]);
            setLoading(false);
        }
    }, [currentTeam]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [columnsData, tasksData, membersData] = await Promise.all([
                columnlistByTeam(currentTeam.teamId),
                tasklistByTeam(currentTeam.teamId),
                getTeamMembers(currentTeam.teamId)
            ]);
            setColumns(columnsData || []);
            setTasks(tasksData || []);
            setTeamMembers(membersData || []);
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        websocketService.disconnect();
        navigate('/');
    };

    // 필터 적용 함수
    const applyFilters = (taskList) => {
        return taskList.filter(task => {
            // 검색어 필터
            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                const matchTitle = task.title?.toLowerCase().includes(query);
                const matchDesc = task.description?.toLowerCase().includes(query);
                if (!matchTitle && !matchDesc) return false;
            }

            // 우선순위 필터
            if (filters.priorities?.length > 0) {
                if (!filters.priorities.includes(task.priority)) return false;
            }

            // 상태 필터
            if (filters.statuses?.length > 0) {
                if (!filters.statuses.includes(task.status)) return false;
            }

            // 태그 필터
            if (filters.tags?.length > 0) {
                const taskTagIds = (task.tags || []).map(t => t.tagId);
                if (!filters.tags.some(tagId => taskTagIds.includes(tagId))) return false;
            }

            // 담당자 필터
            if (filters.assigneeNo) {
                if (task.assigneeNo !== filters.assigneeNo) return false;
            }

            // 마감일 필터
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

    // 컬럼별 태스크 필터링
    const getTasksByColumn = (columnId) => {
        const columnTasks = tasks.filter(task => task.columnId === columnId);
        const filteredTasks = applyFilters(columnTasks);
        return filteredTasks.sort((a, b) => a.position - b.position);
    };

    // 드래그 앤 드롭 핸들러
    const onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // 컬럼 이동
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

        // 태스크 이동
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
        if (!newColumnTitle.trim() || !currentTeam) return;

        try {
            await columnwrite({
                title: newColumnTitle,
                teamId: currentTeam.teamId
            });
            setNewColumnTitle('');
            // WebSocket이 상태를 업데이트하므로 fetchData() 제거
        } catch (error) {
            console.error('컬럼 추가 실패:', error);
        }
    };

    // 컬럼 수정
    const handleUpdateColumn = async (columnId, newTitle) => {
        try {
            await columnupdate({ columnId, title: newTitle });
            setEditingColumn(null);
            // WebSocket이 상태를 업데이트
        } catch (error) {
            console.error('컬럼 수정 실패:', error);
        }
    };

    // 컬럼 삭제
    const handleDeleteColumn = async (columnId) => {
        if (!window.confirm('이 컬럼과 모든 태스크를 삭제하시겠습니까?')) return;

        try {
            await columndelete(columnId);
            // WebSocket이 상태를 업데이트
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
            // WebSocket이 상태를 업데이트
        } catch (error) {
            console.error('태스크 추가 실패:', error);
        }
    };

    // 태스크 수정
    const handleUpdateTask = async (taskId, newTitle) => {
        try {
            const task = tasks.find(t => t.taskId === taskId);
            await taskupdate({ taskId, title: newTitle, description: task?.description || '' });
            setEditingTask(null);
            // WebSocket이 상태를 업데이트
        } catch (error) {
            console.error('태스크 수정 실패:', error);
        }
    };

    // 태스크 삭제
    const handleDeleteTask = async (taskId) => {
        try {
            await taskdelete(taskId);
            // WebSocket이 상태를 업데이트
        } catch (error) {
            console.error('태스크 삭제 실패:', error);
        }
    };

    return (
        <div className="board-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={currentTeam}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`board-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${chatOpen ? 'chat-open' : ''}`}>
                {/* 헤더 */}
                <header className="board-page-header">
                    <div className="header-left">
                        {currentTeam && (
                            <>
                                <h1>{currentTeam.teamName}</h1>
                                <div className="team-code-section">
                                    <span className="team-code-badge">
                                        {showTeamCode ? currentTeam.teamCode : '••••••••'}
                                    </span>
                                    <button
                                        className="code-toggle-btn"
                                        onClick={() => setShowTeamCode(!showTeamCode)}
                                        title={showTeamCode ? '코드 숨기기' : '코드 보기'}
                                    >
                                        {showTeamCode ? '숨김' : '보기'}
                                    </button>
                                    <button
                                        className="code-copy-btn"
                                        onClick={handleCopyTeamCode}
                                        title="코드 복사"
                                    >
                                        {codeCopySuccess ? '복사됨!' : '복사'}
                                    </button>
                                </div>
                                {wsConnected && <span className="ws-status connected" title="실시간 연결됨">●</span>}
                            </>
                        )}
                    </div>
                    <div className="header-right">
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                {/* 메인 콘텐츠 */}
                <div className="board-content">
                    {!currentTeam ? (
                        <div className="no-team-selected">
                            <h2>팀을 선택하세요</h2>
                            <p>왼쪽 사이드바에서 팀을 선택하거나 새 팀을 생성하세요.</p>
                        </div>
                    ) : loading ? (
                        <div className="board-loading">
                            <p>로딩 중...</p>
                        </div>
                    ) : (
                        <div className="board">
                            <FilterBar
                                teamId={currentTeam?.teamId}
                                teamMembers={teamMembers}
                                filters={filters}
                                onFilterChange={setFilters}
                            />
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
                                                                        <h3 onClick={() => setEditingColumn(column.columnId)}>
                                                                            {column.title}
                                                                        </h3>
                                                                        <button
                                                                            className="delete-btn"
                                                                            onClick={() => handleDeleteColumn(column.columnId)}
                                                                        >
                                                                            ×
                                                                        </button>
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
                                                                                        className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${task.status === 'CLOSED' ? 'closed' : ''}`}
                                                                                        ref={provided.innerRef}
                                                                                        {...provided.draggableProps}
                                                                                        {...provided.dragHandleProps}
                                                                                        onClick={() => setSelectedTask(task)}
                                                                                    >
                                                                                        <div className="task-card-header">
                                                                                            {task.priority && (
                                                                                                <span
                                                                                                    className="priority-badge"
                                                                                                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                                                                                                >
                                                                                                    {task.priority}
                                                                                                </span>
                                                                                            )}
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
                                                                                        <div className="task-card-title">
                                                                                            {task.title}
                                                                                        </div>
                                                                                        <div className="task-card-meta">
                                                                                            {task.assigneeName && (
                                                                                                <span className="assignee">
                                                                                                    <span className="icon">👤</span>
                                                                                                    {task.assigneeName}
                                                                                                </span>
                                                                                            )}
                                                                                            {task.dueDate && (
                                                                                                <span className={`due-date ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                                                                                    <span className="icon">📅</span>
                                                                                                    {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {task.tags && task.tags.length > 0 && (
                                                                                            <div className="task-card-tags">
                                                                                                {task.tags.slice(0, 3).map(tag => (
                                                                                                    <span
                                                                                                        key={tag.tagId}
                                                                                                        className="task-tag"
                                                                                                        style={{ backgroundColor: tag.color }}
                                                                                                    >
                                                                                                        {tag.tagName}
                                                                                                    </span>
                                                                                                ))}
                                                                                                {task.tags.length > 3 && (
                                                                                                    <span className="task-tag-more">+{task.tags.length - 3}</span>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                        {task.status && task.status !== 'OPEN' && (
                                                                                            <div className={`task-card-status status-${task.status?.toLowerCase().replace('_', '-')}`}>
                                                                                                {STATUS_LABELS[task.status] || task.status}
                                                                                            </div>
                                                                                        )}
                                                                                        {task.verificationStatus && task.verificationStatus !== 'NONE' && VERIFICATION_LABELS[task.verificationStatus] && (
                                                                                            <div
                                                                                                className="task-card-verification"
                                                                                                style={{ backgroundColor: VERIFICATION_LABELS[task.verificationStatus].color }}
                                                                                            >
                                                                                                {VERIFICATION_LABELS[task.verificationStatus].label}
                                                                                            </div>
                                                                                        )}
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
                        </div>
                    )}
                </div>

                {/* 채팅 패널 */}
                {currentTeam && chatOpen && (
                    <div className="chat-panel-wrapper">
                        <ChatPanel
                            teamId={currentTeam.teamId}
                            loginMember={loginMember}
                            isOpen={chatOpen}
                            onClose={() => setChatOpen(false)}
                            stompClient={websocketService.getClient()}
                        />
                    </div>
                )}
            </div>

            {/* 채팅 토글 버튼 */}
            {currentTeam && (
                <button
                    className={`chat-toggle-btn ${chatOpen ? 'active' : ''}`}
                    onClick={() => setChatOpen(!chatOpen)}
                    title={chatOpen ? '채팅 닫기' : '팀 채팅'}
                >
                    {chatOpen ? '×' : '💬'}
                </button>
            )}

            {/* 이슈 상세 모달 */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    teamId={currentTeam?.teamId}
                    loginMember={loginMember}
                    onClose={() => setSelectedTask(null)}
                    onSave={() => {
                        // WebSocket이 업데이트를 처리하므로 별도 리프레시 불필요
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
}

export default Board;
