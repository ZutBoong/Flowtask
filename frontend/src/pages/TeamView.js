import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { columnlistByTeam, tasklistByTeam } from '../api/boardApi';
import { getTeam, getTeamMembers } from '../api/teamApi';
import websocketService from '../api/websocketService';
import Sidebar from '../components/Sidebar';
import OverviewView from './views/OverviewView';
import ListView from './views/ListView';
import BoardView from './views/BoardView';
import TimelineView from './views/TimelineView';
import CalendarView from './views/CalendarView';
import ChatView from './views/ChatView';
import FilesView from './views/FilesView';
import './TeamView.css';

// 탭 정의
const TABS = [
    { id: 'overview', label: '개요', icon: '📋' },
    { id: 'list', label: '목록', icon: '☰' },
    { id: 'board', label: '보드', icon: '▦' },
    { id: 'timeline', label: '타임라인', icon: '📊' },
    { id: 'calendar', label: '캘린더', icon: '📅' },
    { id: 'chat', label: '채팅', icon: '💬' },
    { id: 'files', label: '파일', icon: '📁' }
];

function TeamView() {
    const navigate = useNavigate();
    const { teamId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // 현재 활성 탭 (URL 파라미터에서 가져오거나 기본값 'overview')
    const activeTab = searchParams.get('view') || 'overview';

    // 상태 관리
    const [team, setTeam] = useState(null);
    const [columns, setColumns] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loginMember, setLoginMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [memberSidebarOpen, setMemberSidebarOpen] = useState(true);
    const [wsConnected, setWsConnected] = useState(false);
    const [onlineMembers, setOnlineMembers] = useState([]);
    const [filters, setFilters] = useState({
        searchQuery: '',
        priorities: [],
        statuses: [],
        assigneeNo: null,
        dueDateFilter: ''
    });

    // 탭 변경 핸들러
    const handleTabChange = (tabId) => {
        setSearchParams({ view: tabId });
    };

    // 로그아웃 핸들러
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        websocketService.disconnect();
        navigate('/login');
    };

    // WebSocket 이벤트 핸들러 (모든 뷰가 공유)
    const handleBoardEvent = useCallback((event) => {
        console.log('TeamView event received:', event);

        switch (event.eventType) {
            // Column 이벤트
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

            // Task 이벤트
            case 'TASK_CREATED':
                setTasks(prev => {
                    const exists = prev.some(task => task.taskId === event.payload.taskId);
                    if (exists) return prev;
                    return [...prev, event.payload];
                });
                break;

            case 'TASK_UPDATED':
            case 'TASK_DATES_CHANGED':
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

            // Team 이벤트
            case 'TEAM_UPDATED':
                if (event.payload.teamId === parseInt(teamId)) {
                    setTeam(prev => ({ ...prev, ...event.payload }));
                }
                break;

            // Presence 이벤트
            case 'PRESENCE_UPDATE':
                setOnlineMembers(Array.isArray(event.payload) ? event.payload : []);
                break;

            default:
                console.log('Unhandled event type:', event.eventType);
        }
    }, [teamId]);

    // 로그인 확인
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
                console.log('WebSocket connected in TeamView');
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
        if (teamId && wsConnected && loginMember) {
            const tid = parseInt(teamId);
            websocketService.subscribeToTeam(tid, handleBoardEvent);
            // 온라인 상태 알림
            websocketService.joinTeamPresence(tid, loginMember.no);

            return () => {
                websocketService.leaveTeamPresence(tid);
                websocketService.unsubscribeFromTeam(tid);
                setOnlineMembers([]);
            };
        }
    }, [teamId, wsConnected, loginMember, handleBoardEvent]);

    // 데이터 로드
    useEffect(() => {
        if (teamId && loginMember) {
            fetchData();
        }
    }, [teamId, loginMember]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamData, columnsData, tasksData, membersData] = await Promise.all([
                getTeam(teamId),
                columnlistByTeam(teamId),
                tasklistByTeam(teamId),
                getTeamMembers(teamId)
            ]);

            setTeam(teamData);
            setColumns(Array.isArray(columnsData) ? columnsData : []);
            setTasks(Array.isArray(tasksData) ? tasksData : []);
            setTeamMembers(Array.isArray(membersData) ? membersData : []);

            // localStorage에 현재 팀 저장
            if (teamData) {
                localStorage.setItem('currentTeam', JSON.stringify(teamData));
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            if (error.response?.status === 404) {
                alert('팀을 찾을 수 없습니다.');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    // Tasks 업데이트 헬퍼 (자식 컴포넌트에서 사용)
    const updateTask = useCallback((updatedTask) => {
        setTasks(prev => prev.map(task =>
            task.taskId === updatedTask.taskId ? { ...task, ...updatedTask } : task
        ));
    }, []);

    const addTask = useCallback((newTask) => {
        setTasks(prev => [...prev, newTask]);
    }, []);

    const removeTask = useCallback((taskId) => {
        setTasks(prev => prev.filter(task => task.taskId !== taskId));
    }, []);

    // Columns 업데이트 헬퍼
    const updateColumn = useCallback((updatedColumn) => {
        setColumns(prev => prev.map(col =>
            col.columnId === updatedColumn.columnId ? { ...col, ...updatedColumn } : col
        ));
    }, []);

    const addColumn = useCallback((newColumn) => {
        setColumns(prev => [...prev, newColumn].sort((a, b) => a.position - b.position));
    }, []);

    const removeColumn = useCallback((columnId) => {
        setColumns(prev => prev.filter(col => col.columnId !== columnId));
        setTasks(prev => prev.filter(task => task.columnId !== columnId));
    }, []);

    // Team 업데이트 헬퍼
    const updateTeam = useCallback((updatedTeam) => {
        setTeam(prev => ({ ...prev, ...updatedTeam }));
        localStorage.setItem('currentTeam', JSON.stringify({ ...team, ...updatedTeam }));
    }, [team]);

    // 사이드바에서 팀 선택 시
    const handleSelectTeam = (selectedTeam) => {
        navigate(`/team/${selectedTeam.teamId}?view=${activeTab}`);
    };

    // 리더 여부 확인
    const isLeader = team?.leaderNo === loginMember?.no;

    // 공통 props (자식 뷰에 전달)
    const viewProps = {
        team,
        columns,
        tasks,
        teamMembers,
        loginMember,
        isLeader,
        wsConnected,
        filters,
        // 업데이트 헬퍼
        updateTask,
        addTask,
        removeTask,
        updateColumn,
        addColumn,
        removeColumn,
        updateTeam,
        // 데이터 리로드
        refreshData: fetchData,
        // 현재 탭
        activeTab
    };

    // 현재 탭에 해당하는 뷰 렌더링
    const renderActiveView = () => {
        if (loading) {
            return (
                <div className="team-loading">
                    <div className="loading-spinner"></div>
                    <p>로딩 중...</p>
                </div>
            );
        }

        if (!team) {
            return (
                <div className="team-not-found">
                    <h2>팀을 찾을 수 없습니다</h2>
                    <p>팀이 삭제되었거나 접근 권한이 없습니다.</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return <OverviewView {...viewProps} />;
            case 'list':
                return <ListView {...viewProps} />;
            case 'board':
                return <BoardView {...viewProps} />;
            case 'timeline':
                return <TimelineView {...viewProps} />;
            case 'calendar':
                return <CalendarView {...viewProps} />;
            case 'chat':
                return <ChatView {...viewProps} />;
            case 'files':
                return <FilesView {...viewProps} />;
            default:
                return <OverviewView {...viewProps} />;
        }
    };

    return (
        <div className="team-view-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={team}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`team-view-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* 통합 헤더: 팀명, 탭, 검색, 로그아웃 */}
                <header className="team-header">
                    <div className="team-header-left">
                        <h1 className="team-name">{team?.teamName || 'Synodos'}</h1>
                        {team && (
                            <div className="header-tabs">
                                {TABS.map(tab => {
                                    if (tab.id === 'admin' && !isLeader) return null;
                                    return (
                                        <button
                                            key={tab.id}
                                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                            onClick={() => handleTabChange(tab.id)}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="team-header-right">
                        {team && ['list', 'board', 'timeline', 'calendar', 'files'].includes(activeTab) && (
                            <div className="header-search">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="검색..."
                                    value={filters.searchQuery || ''}
                                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                                />
                            </div>
                        )}
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                {/* 메인 영역: 뷰 + 멤버 사이드바 */}
                <div className="team-view-main">
                    {/* 뷰 컨텐츠 */}
                    <div className="team-view-content">
                        {renderActiveView()}
                    </div>

                    {/* 멤버 사이드바 */}
                    {team && (
                        <aside className={`member-sidebar ${memberSidebarOpen ? 'open' : 'collapsed'}`}>
                            <div className="member-sidebar-header">
                                <button
                                    className="member-sidebar-toggle"
                                    onClick={() => setMemberSidebarOpen(!memberSidebarOpen)}
                                    title={memberSidebarOpen ? '멤버 패널 접기' : '멤버 패널 펼치기'}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {memberSidebarOpen ? (
                                            <polyline points="15 18 9 12 15 6" />
                                        ) : (
                                            <polyline points="9 18 15 12 9 6" />
                                        )}
                                    </svg>
                                </button>
                                {memberSidebarOpen && (
                                    <>
                                        <span>멤버</span>
                                        <span className="member-count">{teamMembers.length}</span>
                                    </>
                                )}
                            </div>
                            {memberSidebarOpen ? (
                            <div className="member-list">
                                {/* 온라인 멤버 */}
                                {teamMembers.filter(m => onlineMembers.includes(m.memberNo)).length > 0 && (
                                    <div className="member-section">
                                        <div className="member-section-title">
                                            <span className="online-indicator"></span>
                                            온라인 — {teamMembers.filter(m => onlineMembers.includes(m.memberNo)).length}
                                        </div>
                                        {teamMembers
                                            .filter(m => onlineMembers.includes(m.memberNo))
                                            .sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0))
                                            .map(member => (
                                            <div key={member.memberNo} className={`member-item ${member.role === 'LEADER' ? 'leader' : ''}`}>
                                                <div className="member-avatar">
                                                    {member.memberName?.charAt(0) || 'U'}
                                                    <span className="status-dot online"></span>
                                                </div>
                                                <div className="member-info">
                                                    <span className="member-name">
                                                        {member.memberName}
                                                        {member.role === 'LEADER' && <span className="member-role">팀장</span>}
                                                    </span>
                                                    <span className="member-userid">{member.memberUserid}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* 오프라인 멤버 */}
                                {teamMembers.filter(m => !onlineMembers.includes(m.memberNo)).length > 0 && (
                                    <div className="member-section">
                                        <div className="member-section-title">
                                            오프라인 — {teamMembers.filter(m => !onlineMembers.includes(m.memberNo)).length}
                                        </div>
                                        {teamMembers
                                            .filter(m => !onlineMembers.includes(m.memberNo))
                                            .sort((a, b) => (a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0))
                                            .map(member => (
                                            <div key={member.memberNo} className={`member-item offline ${member.role === 'LEADER' ? 'leader' : ''}`}>
                                                <div className="member-avatar">
                                                    {member.memberName?.charAt(0) || 'U'}
                                                    <span className="status-dot"></span>
                                                </div>
                                                <div className="member-info">
                                                    <span className="member-name">
                                                        {member.memberName}
                                                        {member.role === 'LEADER' && <span className="member-role">팀장</span>}
                                                    </span>
                                                    <span className="member-userid">{member.memberUserid}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            ) : (
                            <div className="member-list-collapsed">
                                {teamMembers
                                    .sort((a, b) => {
                                        // 온라인 먼저, 그 다음 리더 먼저
                                        const aOnline = onlineMembers.includes(a.memberNo) ? 1 : 0;
                                        const bOnline = onlineMembers.includes(b.memberNo) ? 1 : 0;
                                        if (aOnline !== bOnline) return bOnline - aOnline;
                                        return a.role === 'LEADER' ? -1 : b.role === 'LEADER' ? 1 : 0;
                                    })
                                    .map(member => (
                                    <div
                                        key={member.memberNo}
                                        className={`member-avatar-collapsed ${member.role === 'LEADER' ? 'leader' : ''}`}
                                        title={`${member.memberName} (${member.memberUserid})`}
                                    >
                                        {member.memberName?.charAt(0) || 'U'}
                                        <span className={`status-dot ${onlineMembers.includes(member.memberNo) ? 'online' : ''}`}></span>
                                    </div>
                                ))}
                            </div>
                            )}
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TeamView;
