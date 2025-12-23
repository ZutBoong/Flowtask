import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams } from '../api/teamApi';
import { tasklistByAssignee, getTaskArchives } from '../api/boardApi';
import Sidebar from '../components/Sidebar';
import './MyActivity.css';

// 표시할 최대 아이템 개수
const MAX_DISPLAY_ITEMS = 5;

function MyActivity() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [taskArchives, setTaskArchives] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loginMember, setLoginMember] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showTeamsModal, setShowTeamsModal] = useState(false);
    const [showArchivesModal, setShowArchivesModal] = useState(false);

    useEffect(() => {
        const storedMember = localStorage.getItem('member');
        if (!storedMember) {
            navigate('/login');
            return;
        }

        const memberData = JSON.parse(storedMember);
        console.log("저장된 member: ", memberData);
        setLoginMember(memberData);
        fetchData(Number(memberData.no || memberData.memberNo));

        // 저장된 현재 팀 불러오기
        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
            setCurrentTeam(JSON.parse(storedTeam));
        }
    }, [navigate]);

    const fetchData = async (memberNo) => {
        try {
            setLoading(true);
            const [teamsRes, taskArchivesRes, tasksRes] = await Promise.all([
                getMyTeams(memberNo),
                getTaskArchives(memberNo).catch(() => []),
                tasklistByAssignee(memberNo).catch(() => [])
            ]);

            setTeams(teamsRes || []);
            setTaskArchives(taskArchivesRes || []);
            setMyTasks(tasksRes || []);
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', JSON.stringify(team));
    };

    // 캘린더 관련 함수
    const generateCalendarDays = () => {
        const days = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // 첫날과 마지막날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 시작 날짜 (이전 달 날짜 포함)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        // 종료 날짜 (다음 달 날짜 포함)
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        // 날짜 생성
        const current = new Date(startDate);
        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    const getTasksForDate = (date) => {
        return myTasks.filter(task => {
            if (!task.dueDate) return false;
            return new Date(task.dueDate).toDateString() === date.toDateString();
        });
    };

    const isToday = (date) => {
        return date.toDateString() === new Date().toDateString();
    };

    const isCurrentMonth = (date) => {
        return date.getMonth() === currentMonth.getMonth();
    };

    const formatMonthYear = () => {
        return currentMonth.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long'
        });
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };


    return (
        <div className="myactivity-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={currentTeam}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`myactivity-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* 통합 헤더 */}
                <header className="team-header">
                    <div className="team-header-left">
                        <h1 className="team-name">내 활동</h1>
                    </div>
                    <div className="team-header-right">
                        <button className="logout-btn" onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('member');
                            localStorage.removeItem('currentTeam');
                            navigate('/login');
                        }}>로그아웃</button>
                    </div>
                </header>

                {/* 메인 콘텐츠 */}
                <div className="myactivity-content">
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>로딩 중...</p>
                        </div>
                    ) : (
                        <div className="activity-view">
                            {/* 상단: 캘린더 (전체 너비) */}
                            <div className="activity-top-section">
                                <div className="activity-section calendar-section">
                                    <div className="calendar-header">
                                        <div className="calendar-nav">
                                            <button className="nav-btn" onClick={prevMonth}>&lt;</button>
                                            <h2>{formatMonthYear()}</h2>
                                            <button className="nav-btn" onClick={nextMonth}>&gt;</button>
                                        </div>
                                    </div>
                                    <div className="calendar-grid">
                                        <div className="calendar-weekdays">
                                            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                                                <div key={day} className="weekday">{day}</div>
                                            ))}
                                        </div>
                                        <div className="calendar-days">
                                            {generateCalendarDays().map((date, index) => {
                                                const dayTasks = getTasksForDate(date);
                                                const isCurrentMonthDay = isCurrentMonth(date);

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`calendar-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonthDay ? 'other-month' : ''}`}
                                                    >
                                                        <div className="day-header">
                                                            <span className="day-number">{date.getDate()}</span>
                                                        </div>
                                                        <div className="day-tasks">
                                                            {dayTasks.slice(0, 3).map(task => (
                                                                <div
                                                                    key={task.taskId}
                                                                    className="task-item"
                                                                    title={task.title}
                                                                >
                                                                    {task.priority === 'URGENT' && (
                                                                        <i className="fa-solid fa-triangle-exclamation urgent-icon"></i>
                                                                    )}
                                                                    {task.title}
                                                                </div>
                                                            ))}
                                                            {dayTasks.length > 3 && (
                                                                <div className="more-tasks">
                                                                    +{dayTasks.length - 3}개 더
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 하단: 좌측(참여 팀), 우측(아카이브) */}
                            <div className="activity-bottom-row">
                                {/* 참여 중인 팀 목록 */}
                                <div className="activity-section teams-section">
                                    <div className="section-header">
                                        <h2>참여 중인 팀</h2>
                                        <span className="count-badge">{teams.length}</span>
                                    </div>
                                    <div className="teams-list">
                                        {teams.length > 0 ? (
                                            teams.slice(0, MAX_DISPLAY_ITEMS).map(t => (
                                                <div
                                                    key={t.teamId}
                                                    className={`team-item ${t.teamId === currentTeam?.teamId ? 'active' : ''}`}
                                                    onClick={() => {
                                                        handleSelectTeam(t);
                                                        navigate(`/team/${t.teamId}?view=overview`);
                                                    }}
                                                >
                                                    <div className="team-icon">
                                                        {t.teamName?.charAt(0) || 'T'}
                                                    </div>
                                                    <div className="team-details">
                                                        <span className="team-name">{t.teamName}</span>
                                                        {t.leaderNo === (loginMember?.no || loginMember?.memberNo) && (
                                                            <span className="team-badge">리더</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="no-data">참여 중인 팀이 없습니다.</p>
                                        )}
                                    </div>
                                    {teams.length > MAX_DISPLAY_ITEMS && (
                                        <button
                                            className="show-more-btn"
                                            onClick={() => setShowTeamsModal(true)}
                                        >
                                            +{teams.length - MAX_DISPLAY_ITEMS}개 더보기
                                        </button>
                                    )}
                                </div>

                                {/* 아카이브된 태스크 */}
                                <div className="activity-section archives-section">
                                    <div className="section-header">
                                        <h2>아카이브</h2>
                                        <span className="count-badge">{taskArchives.length}</span>
                                    </div>
                                    <div className="archives-list">
                                        {taskArchives.length > 0 ? (
                                            taskArchives.slice(0, MAX_DISPLAY_ITEMS).map(archive => {
                                                const task = JSON.parse(archive.taskSnapshot || '{}');
                                                return (
                                                    <div key={`task-${archive.archiveId}`} className="archive-item task-archive">
                                                        <div className="archive-header">
                                                            <span className="archive-title">📝 {task.title || '제목 없음'}</span>
                                                            <span className="archive-date">
                                                                {new Date(archive.archivedAt).toLocaleDateString('ko-KR', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                        {task.description && (
                                                            <p className="archive-description">{task.description.substring(0, 50)}{task.description.length > 50 ? '...' : ''}</p>
                                                        )}
                                                        {archive.archiveNote && (
                                                            <p className="archive-note">{archive.archiveNote}</p>
                                                        )}
                                                        <div className="archive-meta">
                                                            {archive.teamName && (
                                                                <span className="archive-team">{archive.teamName}</span>
                                                            )}
                                                            {archive.columnTitle && (
                                                                <span className="archive-column">{archive.columnTitle}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="no-data">아카이브된 항목이 없습니다.</p>
                                        )}
                                    </div>
                                    {taskArchives.length > MAX_DISPLAY_ITEMS && (
                                        <button
                                            className="show-more-btn"
                                            onClick={() => setShowArchivesModal(true)}
                                        >
                                            +{taskArchives.length - MAX_DISPLAY_ITEMS}개 더보기
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 참여 중인 팀 모달 */}
            {showTeamsModal && (
                <div className="activity-modal-overlay" onClick={() => setShowTeamsModal(false)}>
                    <div className="activity-modal" onClick={e => e.stopPropagation()}>
                        <div className="activity-modal-header">
                            <h3>참여 중인 팀</h3>
                            <span className="modal-count">{teams.length}개</span>
                            <button
                                className="activity-modal-close"
                                onClick={() => setShowTeamsModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="activity-modal-body">
                            {teams.map(t => (
                                <div
                                    key={t.teamId}
                                    className={`team-item ${t.teamId === currentTeam?.teamId ? 'active' : ''}`}
                                    onClick={() => {
                                        handleSelectTeam(t);
                                        setShowTeamsModal(false);
                                        navigate(`/team/${t.teamId}?view=overview`);
                                    }}
                                >
                                    <div className="team-icon">
                                        {t.teamName?.charAt(0) || 'T'}
                                    </div>
                                    <div className="team-details">
                                        <span className="team-name">{t.teamName}</span>
                                        {t.leaderNo === loginMember?.no && (
                                            <span className="team-badge">리더</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 아카이브 모달 */}
            {showArchivesModal && (
                <div className="activity-modal-overlay" onClick={() => setShowArchivesModal(false)}>
                    <div className="activity-modal" onClick={e => e.stopPropagation()}>
                        <div className="activity-modal-header">
                            <h3>아카이브</h3>
                            <span className="modal-count">{taskArchives.length}개</span>
                            <button
                                className="activity-modal-close"
                                onClick={() => setShowArchivesModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="activity-modal-body">
                            {taskArchives.map(archive => {
                                const task = JSON.parse(archive.taskSnapshot || '{}');
                                return (
                                    <div key={`task-${archive.archiveId}`} className="archive-item task-archive">
                                        <div className="archive-header">
                                            <span className="archive-title">📝 {task.title || '제목 없음'}</span>
                                            <span className="archive-date">
                                                {new Date(archive.archivedAt).toLocaleDateString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        {task.description && (
                                            <p className="archive-description">{task.description.substring(0, 50)}{task.description.length > 50 ? '...' : ''}</p>
                                        )}
                                        {archive.archiveNote && (
                                            <p className="archive-note">{archive.archiveNote}</p>
                                        )}
                                        <div className="archive-meta">
                                            {archive.teamName && (
                                                <span className="archive-team">{archive.teamName}</span>
                                            )}
                                            {archive.columnTitle && (
                                                <span className="archive-column">{archive.columnTitle}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyActivity;