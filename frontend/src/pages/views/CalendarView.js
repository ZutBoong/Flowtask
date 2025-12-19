import React, { useState, useEffect } from 'react';
import { tasklistByDateRange } from '../../api/boardApi';
import TaskModal from '../../components/TaskModal';
import './CalendarView.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 우선순위 색상
const PRIORITY_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#f59e0b',
    MEDIUM: '#3b82f6',
    LOW: '#6b7280'
};

function CalendarView({ team, tasks: propTasks, teamMembers, loginMember, filters, refreshData }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState(propTasks || []);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [viewMode, setViewMode] = useState('month');

    // props 변경 시 로컬 상태 동기화
    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    // 날짜 변경 시 데이터 로드
    useEffect(() => {
        if (team) {
            fetchTasks();
        }
    }, [team, currentDate, viewMode]);

    const fetchTasks = async () => {
        if (!team) return;

        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();
            const data = await tasklistByDateRange(
                team.teamId,
                formatDateForApi(startDate),
                formatDateForApi(endDate)
            );
            setTasks(data || []);
        } catch (error) {
            console.error('캘린더 데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateForApi = (date) => {
        return date.toISOString().split('T')[0];
    };

    const getDateRange = () => {
        if (viewMode === 'week') {
            const start = new Date(currentDate);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return { startDate: start, endDate: end };
        } else {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            end.setDate(end.getDate() + (6 - end.getDay()));
            return { startDate: start, endDate: end };
        }
    };

    const goToPrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const goToNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };


    const generateCalendarDays = () => {
        const days = [];
        const { startDate, endDate } = getDateRange();
        const current = new Date(startDate);

        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
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
                if (!filters.statuses.includes(task.status)) return false;
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

            // dueDateFilter는 캘린더에서는 적용하지 않음 (이미 날짜별로 표시)

            return true;
        });
    };

    const getTasksForDate = (date) => {
        const dateTasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === date.toDateString();
        });
        return applyFilters(dateTasks);
    };

    const formatMonthYear = () => {
        return currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long'
        });
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isCurrentMonth = (date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const calendarDays = generateCalendarDays();

    return (
        <div className="calendar-view">
            {/* 캘린더 헤더 */}
            <div className="calendar-header">
                <div className="calendar-nav">
                    <button className="nav-btn" onClick={goToPrevious}>&lt;</button>
                    <h2>{formatMonthYear()}</h2>
                    <button className="nav-btn" onClick={goToNext}>&gt;</button>
                </div>
                <div className="view-toggle">
                    <button
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => setViewMode('month')}
                    >
                        월간
                    </button>
                    <button
                        className={viewMode === 'week' ? 'active' : ''}
                        onClick={() => setViewMode('week')}
                    >
                        주간
                    </button>
                </div>
            </div>

            {/* 캘린더 그리드 */}
            {loading ? (
                <div className="calendar-loading">
                    <p>로딩 중...</p>
                </div>
            ) : (
                <div className={`calendar-grid ${viewMode}`}>
                    {/* 요일 헤더 */}
                    <div className="calendar-weekdays">
                        {WEEKDAYS.map(day => (
                            <div key={day} className="weekday">{day}</div>
                        ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div className="calendar-days">
                        {calendarDays.map((date, index) => {
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
                                                className={`task-item priority-${(task.priority || 'MEDIUM').toLowerCase()}`}
                                                onClick={() => setSelectedTask(task)}
                                                title={task.title}
                                            >
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
            )}

            {/* 태스크 상세 모달 */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    teamId={team?.teamId}
                    loginMember={loginMember}
                    onClose={() => setSelectedTask(null)}
                    onSave={() => {
                        fetchTasks();
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
}

export default CalendarView;
