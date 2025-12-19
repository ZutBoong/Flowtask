import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    columnlistByTeam, columnwrite, columnupdate, columndelete, columnposition,
    tasklistByTeam, taskwrite, taskupdate, taskdelete, taskposition,
    updateTaskAssignees
} from '../api/boardApi';
import { getTeamMembers } from '../api/teamApi';
import { archiveColumn } from '../api/columnApi';
import { updateTaskTags } from '../api/tagApi';
import { addTaskFavorite, removeTaskFavorite, checkTaskFavorite, getTaskFavorites } from '../api/boardApi';
import TagInput from '../components/TagInput';
import websocketService from '../api/websocketService';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TaskModal from '../components/TaskModal';
import TaskCreateModal from '../components/TaskCreateModal';
import FilterBar from '../components/FilterBar';
import ChatPanel from '../components/ChatPanel';
import './Board.css';

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
    const [expandedTaskId, setExpandedTaskId] = useState(null);  // 인라인 확장된 태스크
    const [expandedTaskForm, setExpandedTaskForm] = useState({});  // 확장된 태스크 폼 데이터
    const [teamMembers, setTeamMembers] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);  // 채팅 패널 열림/닫힘
    const [createTaskModalColumnId, setCreateTaskModalColumnId] = useState(null);  // 태스크 생성 모달 열린 컬럼 ID
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

    // 컬럼 기능 관련 상태
    const [columnMenuOpen, setColumnMenuOpen] = useState(null);  // 열린 컬럼 메뉴의 columnId
    const [archiveModalColumn, setArchiveModalColumn] = useState(null);  // 아카이브 모달이 열린 컬럼
    const [archiveNote, setArchiveNote] = useState('');

    // 태스크 즐겨찾기 관련 상태
    const [taskFavorites, setTaskFavorites] = useState({});  // { taskId: boolean }

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

    // 로그인 정보 확인 및 저장된 팀 불러오기
    useEffect(() => {
        const token = localStorage.getItem('token');
        const member = localStorage.getItem('member');
        if (!token || !member) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        setLoginMember(JSON.parse(member));

        // 저장된 현재 팀 불러오기
        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
            setCurrentTeam(JSON.parse(storedTeam));
        }
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
            // 태스크 즐겨찾기 로드
            if (loginMember) {
                loadTaskFavorites();
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
    };

    // 태스크 즐겨찾기 로드
    const loadTaskFavorites = async () => {
        if (!loginMember) return;

        try {
            const favorites = await getTaskFavorites(loginMember.no);
            const favoritesMap = {};
            favorites.forEach(task => {
                favoritesMap[task.taskId] = true;
            });
            setTaskFavorites(favoritesMap);
        } catch (error) {
            console.error('즐겨찾기 로드 실패:', error);
        }
    };

    // 태스크 즐겨찾기 토글
    const handleToggleTaskFavorite = async (taskId, e) => {
        e.stopPropagation();
        if (!loginMember) return;

        try {
            const isFavorited = taskFavorites[taskId];
            if (isFavorited) {
                await removeTaskFavorite(taskId, loginMember.no);
            } else {
                await addTaskFavorite(taskId, loginMember.no);
            }

            setTaskFavorites(prev => ({
                ...prev,
                [taskId]: !isFavorited
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

            // 상태 필터
            if (filters.statuses?.length > 0) {
                if (!filters.statuses.includes(task.status)) return false;
            }

            // 태그 필터
            if (filters.tags?.length > 0) {
                const taskTagIds = (task.tags || []).map(t => t.tagId);
                if (!filters.tags.some(tagId => taskTagIds.includes(tagId))) return false;
            }

            // 담당자 필터 (복수 담당자 지원)
            if (filters.assigneeNo) {
                const hasAssignee = task.assignees?.some(a => a.memberNo === filters.assigneeNo)
                    || task.assigneeNo === filters.assigneeNo;
                if (!hasAssignee) return false;
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
            // 컬럼 목록 새로 가져오기
            const columnsData = await columnlistByTeam(currentTeam.teamId);
            setColumns(columnsData || []);
        } catch (error) {
            console.error('컬럼 추가 실패:', error);
        }
    };

    // 컬럼 수정
    const handleUpdateColumn = async (columnId, newTitle) => {
        try {
            await columnupdate({ columnId, title: newTitle });
            // 즉시 로컬 상태 업데이트
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
            // 즉시 로컬 상태 업데이트
            setColumns(prev => prev.filter(col => col.columnId !== columnId));
            setTasks(prev => prev.filter(task => task.columnId !== columnId));
        } catch (error) {
            console.error('컬럼 삭제 실패:', error);
        }
    };

    // 태스크 추가 (모달에서)
    const handleCreateTask = async (taskData) => {
        try {
            // 기본 태스크 생성
            await taskwrite({
                columnId: taskData.columnId,
                title: taskData.title,
                description: taskData.description,
                status: taskData.status,
                priority: taskData.priority,
                dueDate: taskData.dueDate,
                assigneeNo: taskData.assignees?.length > 0 ? taskData.assignees[0] : null
            });

            // 태스크 목록 새로 가져오기
            const tasksData = await tasklistByTeam(currentTeam.teamId);
            setTasks(tasksData || []);

            // 생성된 태스크 찾기 (가장 최근에 생성된 태스크)
            const newTask = tasksData.reduce((latest, task) => {
                if (task.columnId === taskData.columnId) {
                    if (!latest || task.taskId > latest.taskId) {
                        return task;
                    }
                }
                return latest;
            }, null);

            if (newTask) {
                // 태그 저장
                if (taskData.tags?.length > 0) {
                    const tagIds = taskData.tags.map(t => t.tagId);
                    await updateTaskTags(newTask.taskId, tagIds);
                }

                // 담당자 저장 (복수)
                if (taskData.assignees?.length > 0) {
                    await updateTaskAssignees(newTask.taskId, taskData.assignees, loginMember?.no);
                }

                // 최종 업데이트된 태스크 목록 가져오기
                const finalTasksData = await tasklistByTeam(currentTeam.teamId);
                setTasks(finalTasksData || []);
            }
        } catch (error) {
            console.error('태스크 추가 실패:', error);
            alert('태스크 생성에 실패했습니다.');
        }
    };

    // 태스크 수정
    const handleUpdateTask = async (taskId, newTitle) => {
        try {
            const task = tasks.find(t => t.taskId === taskId);
            await taskupdate({ taskId, title: newTitle, description: task?.description || '' });
            // 즉시 로컬 상태 업데이트
            setTasks(prev => prev.map(t =>
                t.taskId === taskId ? { ...t, title: newTitle } : t
            ));
            setEditingTask(null);
        } catch (error) {
            console.error('태스크 수정 실패:', error);
        }
    };

    // 태스크 삭제
    const handleDeleteTask = async (taskId) => {
        try {
            await taskdelete(taskId);
            // 즉시 로컬 상태 업데이트
            setTasks(prev => prev.filter(t => t.taskId !== taskId));
        } catch (error) {
            console.error('태스크 삭제 실패:', error);
        }
    };

    // 태스크 확장 토글
    const handleToggleExpand = (task) => {
        if (expandedTaskId === task.taskId) {
            setExpandedTaskId(null);
            setExpandedTaskForm({});
        } else {
            setExpandedTaskId(task.taskId);
            setExpandedTaskForm({
                taskId: task.taskId,
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'OPEN',
                dueDate: task.dueDate || '',
                tags: task.tags || [],
                assignees: task.assignees?.map(a => a.memberNo) || (task.assigneeNo ? [task.assigneeNo] : [])
            });
        }
    };

    // 확장된 태스크 폼 변경
    const handleExpandedFormChange = (field, value) => {
        setExpandedTaskForm(prev => ({ ...prev, [field]: value }));
    };

    // 확장된 태스크 저장
    const handleSaveExpandedTask = async () => {
        if (!expandedTaskForm.title?.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }

        try {
            const taskData = {
                taskId: expandedTaskForm.taskId,
                title: expandedTaskForm.title,
                description: expandedTaskForm.description,
                status: expandedTaskForm.status,
                dueDate: expandedTaskForm.dueDate || null,
                assigneeNo: expandedTaskForm.assignees?.length > 0 ? expandedTaskForm.assignees[0] : null
            };

            await taskupdate(taskData);

            // 태그 저장
            if (expandedTaskForm.taskId) {
                const tagIds = expandedTaskForm.tags.map(t => t.tagId);
                await updateTaskTags(expandedTaskForm.taskId, tagIds);

                // 담당자 저장
                if (expandedTaskForm.assignees) {
                    await updateTaskAssignees(expandedTaskForm.taskId, expandedTaskForm.assignees, loginMember?.no);
                }
            }

            // 로컬 상태 업데이트
            setTasks(prev => prev.map(t => {
                if (t.taskId === expandedTaskForm.taskId) {
                    const assignee = teamMembers.find(m => m.memberNo === taskData.assigneeNo);
                    return {
                        ...t,
                        ...taskData,
                        tags: expandedTaskForm.tags,
                        assigneeName: assignee?.memberName || null,
                        assignees: expandedTaskForm.assignees.map(no => {
                            const member = teamMembers.find(m => m.memberNo === no);
                            return { memberNo: no, memberName: member?.memberName || '' };
                        })
                    };
                }
                return t;
            }));

            setExpandedTaskId(null);
            setExpandedTaskForm({});
        } catch (error) {
            console.error('태스크 저장 실패:', error);
            alert('저장에 실패했습니다.');
        }
    };

    // 마감일 포맷팅
    const formatDateTimeForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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
                <Header
                    title="Flowtask"
                    loginMember={loginMember}
                    onLogout={() => websocketService.disconnect()}
                />

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
                                                                        <div className="column-title-row">
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
                                                                                            📦 아카이브
                                                                                        </button>
                                                                                        <button
                                                                                            className="menu-delete-btn"
                                                                                            onClick={() => {
                                                                                                handleDeleteColumn(column.columnId);
                                                                                                setColumnMenuOpen(null);
                                                                                            }}
                                                                                        >
                                                                                            🗑️ 삭제
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
                                                                                        className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${task.status === 'CLOSED' ? 'closed' : ''} ${expandedTaskId === task.taskId ? 'expanded' : ''}`}
                                                                                        ref={provided.innerRef}
                                                                                        {...provided.draggableProps}
                                                                                        {...provided.dragHandleProps}
                                                                                        onClick={() => !expandedTaskId && handleToggleExpand(task)}
                                                                                    >
                                                                                        {expandedTaskId === task.taskId ? (
                                                                                            /* 확장된 태스크 뷰 */
                                                                                            <div className="task-expanded" onClick={(e) => e.stopPropagation()}>
                                                                                                <div className="task-expanded-header">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        className="task-expanded-title"
                                                                                                        value={expandedTaskForm.title}
                                                                                                        onChange={(e) => handleExpandedFormChange('title', e.target.value)}
                                                                                                        placeholder="제목"
                                                                                                    />
                                                                                                    <button
                                                                                                        className="task-expanded-close"
                                                                                                        onClick={() => { setExpandedTaskId(null); setExpandedTaskForm({}); }}
                                                                                                    >
                                                                                                        ×
                                                                                                    </button>
                                                                                                </div>

                                                                                                <div className="task-expanded-body">
                                                                                                    <div className="task-expanded-field">
                                                                                                        <label>설명</label>
                                                                                                        <textarea
                                                                                                            value={expandedTaskForm.description || ''}
                                                                                                            onChange={(e) => handleExpandedFormChange('description', e.target.value)}
                                                                                                            placeholder="설명을 입력하세요..."
                                                                                                            rows={3}
                                                                                                        />
                                                                                                    </div>

                                                                                                    <div className="task-expanded-row">
                                                                                                        <div className="task-expanded-field">
                                                                                                            <label>상태</label>
                                                                                                            <select
                                                                                                                value={expandedTaskForm.status}
                                                                                                                onChange={(e) => handleExpandedFormChange('status', e.target.value)}
                                                                                                            >
                                                                                                                <option value="OPEN">열림</option>
                                                                                                                <option value="IN_PROGRESS">진행중</option>
                                                                                                                <option value="RESOLVED">해결됨</option>
                                                                                                                <option value="CLOSED">닫힘</option>
                                                                                                                <option value="CANNOT_REPRODUCE">재현불가</option>
                                                                                                                <option value="DUPLICATE">중복</option>
                                                                                                            </select>
                                                                                                        </div>

                                                                                                        <div className="task-expanded-field">
                                                                                                            <label>마감일</label>
                                                                                                            <input
                                                                                                                type="datetime-local"
                                                                                                                value={formatDateTimeForInput(expandedTaskForm.dueDate)}
                                                                                                                onChange={(e) => handleExpandedFormChange('dueDate', e.target.value)}
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="task-expanded-field">
                                                                                                        <label>담당자</label>
                                                                                                        <div className="task-expanded-assignees">
                                                                                                            {teamMembers.map(member => (
                                                                                                                <label key={member.memberNo} className="assignee-option">
                                                                                                                    <input
                                                                                                                        type="checkbox"
                                                                                                                        checked={expandedTaskForm.assignees?.includes(member.memberNo) || false}
                                                                                                                        onChange={(e) => {
                                                                                                                            const current = expandedTaskForm.assignees || [];
                                                                                                                            if (e.target.checked) {
                                                                                                                                handleExpandedFormChange('assignees', [...current, member.memberNo]);
                                                                                                                            } else {
                                                                                                                                handleExpandedFormChange('assignees', current.filter(no => no !== member.memberNo));
                                                                                                                            }
                                                                                                                        }}
                                                                                                                    />
                                                                                                                    <span>{member.memberName}</span>
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="task-expanded-field">
                                                                                                        <label>태그</label>
                                                                                                        <TagInput
                                                                                                            teamId={currentTeam?.teamId}
                                                                                                            selectedTags={expandedTaskForm.tags || []}
                                                                                                            onChange={(tags) => handleExpandedFormChange('tags', tags)}
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="task-expanded-footer">
                                                                                                    <button
                                                                                                        className="btn-cancel"
                                                                                                        onClick={() => { setExpandedTaskId(null); setExpandedTaskForm({}); }}
                                                                                                    >
                                                                                                        취소
                                                                                                    </button>
                                                                                                    <button
                                                                                                        className="btn-save"
                                                                                                        onClick={handleSaveExpandedTask}
                                                                                                    >
                                                                                                        저장
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            /* 기본 태스크 카드 뷰 */
                                                                                            <>
                                                                                                <div className="task-card-top">
                                                                                                    <div className="task-card-title">
                                                                                                        {task.title}
                                                                                                    </div>
                                                                                                    <div className="task-card-actions">
                                                                                                        <button
                                                                                                            className={`task-favorite-btn ${taskFavorites[task.taskId] ? 'active' : ''}`}
                                                                                                            onClick={(e) => handleToggleTaskFavorite(task.taskId, e)}
                                                                                                            title={taskFavorites[task.taskId] ? '즐겨찾기 해제' : '즐겨찾기'}
                                                                                                        >
                                                                                                            {taskFavorites[task.taskId] ? '★' : '☆'}
                                                                                                        </button>
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
                                                                                                </div>
                                                                                                {(task.dueDate || (task.status && task.status !== 'OPEN')) && (
                                                                                                    <div className="task-card-meta">
                                                                                                        {task.dueDate && (
                                                                                                            <span className={`due-date ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                                                                                                {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {task.status && task.status !== 'OPEN' && (
                                                                                                            <span className={`task-card-status status-${task.status?.toLowerCase().replace('_', '-')}`}>
                                                                                                                {STATUS_LABELS[task.status] || task.status}
                                                                                                            </span>
                                                                                                        )}
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
                                                                                            </>
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
                                                                <button
                                                                    className="add-task-btn"
                                                                    onClick={() => setCreateTaskModalColumnId(column.columnId)}
                                                                >
                                                                    + 새 태스크 추가
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
                    onSave={(updatedTaskData) => {
                        // 즉시 로컬 상태 업데이트
                        setTasks(prev => prev.map(task => {
                            if (task.taskId === updatedTaskData.taskId) {
                                // assigneeName 찾기
                                const assignee = teamMembers.find(m => m.memberNo === updatedTaskData.assigneeNo);
                                return {
                                    ...task,
                                    ...updatedTaskData,
                                    assigneeName: assignee?.memberName || null
                                };
                            }
                            return task;
                        }));
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
                                아카이브된 컬럼은 마이페이지에서 확인할 수 있습니다.
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

            {/* 태스크 생성 모달 */}
            {createTaskModalColumnId && (
                <TaskCreateModal
                    columnId={createTaskModalColumnId}
                    teamId={currentTeam?.teamId}
                    teamMembers={teamMembers}
                    onClose={() => setCreateTaskModalColumnId(null)}
                    onCreate={handleCreateTask}
                />
            )}
        </div>
    );
}

export default Board;
