import React, { useState, useEffect, useRef } from 'react';
import { updateTaskDates } from '../../api/boardApi';
import TaskModal from '../../components/TaskModal';
import './TimelineView.css';

// 상태 색상
const STATUS_COLORS = {
    OPEN: '#ff9800',
    IN_PROGRESS: '#2196f3',
    RESOLVED: '#4caf50',
    CLOSED: '#9c27b0'
};

function TimelineView({
    team,
    tasks: propTasks,
    sections: propSections,
    teamMembers,
    loginMember,
    filters,
    updateTask,
    refreshData
}) {
    const [tasks, setTasks] = useState(propTasks || []);
    const [sections, setSections] = useState(propSections || []);
    const [viewStartDate, setViewStartDate] = useState(getStartOfWeek(new Date()));
    const [viewRange, setViewRange] = useState(28); // 기본 4주
    const [selectedTask, setSelectedTask] = useState(null);
    const [draggingTask, setDraggingTask] = useState(null);
    const [dragMode, setDragMode] = useState(null); // 'move', 'resize-left', 'resize-right'

    const timelineRef = useRef(null);

    // props 동기화
    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    useEffect(() => {
        setSections(propSections || []);
    }, [propSections]);

    // 주의 시작일 가져오기 (일요일)
    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // 날짜 배열 생성
    const getDates = () => {
        const dates = [];
        const start = new Date(viewStartDate);
        for (let i = 0; i < viewRange; i++) {
            dates.push(new Date(start));
            start.setDate(start.getDate() + 1);
        }
        return dates;
    };

    const dates = getDates();

    // 날짜를 인덱스로 변환
    const dateToIndex = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const diff = Math.floor((d - viewStartDate) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // 네비게이션
    const goToPrevious = () => {
        const newStart = new Date(viewStartDate);
        newStart.setDate(newStart.getDate() - 7);
        setViewStartDate(newStart);
    };

    const goToNext = () => {
        const newStart = new Date(viewStartDate);
        newStart.setDate(newStart.getDate() + 7);
        setViewStartDate(newStart);
    };

    const goToToday = () => {
        setViewStartDate(getStartOfWeek(new Date()));
    };

    // 태스크 바 위치/너비 계산
    const getTaskBarStyle = (task) => {
        const startIdx = dateToIndex(task.startDate || task.dueDate);
        const endIdx = dateToIndex(task.dueDate || task.startDate);

        if (startIdx === null && endIdx === null) return null;

        const effectiveStart = Math.max(0, startIdx ?? endIdx);
        const effectiveEnd = Math.min(viewRange - 1, endIdx ?? startIdx);

        if (effectiveEnd < 0 || effectiveStart >= viewRange) return null;

        const left = (effectiveStart / viewRange) * 100;
        const width = ((effectiveEnd - effectiveStart + 1) / viewRange) * 100;

        return {
            left: `${left}%`,
            width: `${Math.max(width, 2)}%`,
            backgroundColor: STATUS_COLORS[task.status] || STATUS_COLORS.OPEN
        };
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

    // 섹션별 태스크
    const getTasksBySection = (sectionId) => {
        let sectionTasks;
        if (sectionId === 'unassigned') {
            sectionTasks = tasks.filter(t => !t.sectionId);
        } else {
            sectionTasks = tasks.filter(t => t.sectionId === sectionId);
        }
        return applyFilters(sectionTasks);
    };


    // 드래그 시작
    const handleDragStart = (e, task, mode) => {
        e.stopPropagation();
        setDraggingTask(task);
        setDragMode(mode);
    };

    // 드래그 중
    const handleDrag = (e) => {
        if (!draggingTask || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dayWidth = rect.width / viewRange;
        const dayIndex = Math.floor(x / dayWidth);
        const newDate = new Date(viewStartDate);
        newDate.setDate(newDate.getDate() + dayIndex);

        // 로컬 상태 업데이트
        setTasks(prev => prev.map(t => {
            if (t.taskId !== draggingTask.taskId) return t;

            if (dragMode === 'move') {
                const duration = t.dueDate && t.startDate
                    ? Math.round((new Date(t.dueDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24))
                    : 0;
                const newEnd = new Date(newDate);
                newEnd.setDate(newEnd.getDate() + duration);
                return { ...t, startDate: newDate.toISOString(), dueDate: newEnd.toISOString() };
            } else if (dragMode === 'resize-left') {
                return { ...t, startDate: newDate.toISOString() };
            } else if (dragMode === 'resize-right') {
                return { ...t, dueDate: newDate.toISOString() };
            }
            return t;
        }));
    };

    // 드래그 종료
    const handleDragEnd = async () => {
        if (!draggingTask) return;

        const updatedTask = tasks.find(t => t.taskId === draggingTask.taskId);
        if (updatedTask) {
            try {
                await updateTaskDates(
                    updatedTask.taskId,
                    updatedTask.startDate,
                    updatedTask.dueDate
                );
                if (updateTask) updateTask(updatedTask);
            } catch (error) {
                console.error('날짜 업데이트 실패:', error);
                // 실패 시 원래 값으로 복원
                if (refreshData) refreshData();
            }
        }

        setDraggingTask(null);
        setDragMode(null);
    };

    // 오늘 표시선 위치
    const getTodayPosition = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const idx = dateToIndex(today);
        if (idx === null || idx < 0 || idx >= viewRange) return null;
        return `${(idx / viewRange) * 100}%`;
    };

    const todayPosition = getTodayPosition();

    // 월 헤더 생성
    const getMonthHeaders = () => {
        const months = [];
        let currentMonth = null;
        let startIdx = 0;

        dates.forEach((date, idx) => {
            const month = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
            if (month !== currentMonth) {
                if (currentMonth !== null) {
                    months.push({ month: currentMonth, startIdx, width: idx - startIdx });
                }
                currentMonth = month;
                startIdx = idx;
            }
        });
        months.push({ month: currentMonth, startIdx, width: dates.length - startIdx });

        return months;
    };

    // 섹션 렌더링
    const renderSection = (sectionId, sectionName, isUnassigned = false) => {
        const sectionTasks = getTasksBySection(sectionId);

        return (
            <div key={sectionId} className="timeline-section">
                <div className="timeline-section-header">
                    <span className="section-name">{sectionName}</span>
                    <span className="task-count">{sectionTasks.length}</span>
                </div>
                <div className="timeline-section-content">
                    {sectionTasks.map(task => {
                        const barStyle = getTaskBarStyle(task);

                        return (
                            <div key={task.taskId} className="timeline-row">
                                <div className="timeline-row-label">
                                    <span
                                        className="task-name"
                                        onClick={() => setSelectedTask(task)}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </span>
                                </div>
                                <div className="timeline-row-bars">
                                    {barStyle && (
                                        <div
                                            className={`task-bar ${draggingTask?.taskId === task.taskId ? 'dragging' : ''}`}
                                            style={barStyle}
                                            onMouseDown={(e) => handleDragStart(e, task, 'move')}
                                        >
                                            <div
                                                className="resize-handle left"
                                                onMouseDown={(e) => handleDragStart(e, task, 'resize-left')}
                                            />
                                            <span className="bar-label">{task.title}</span>
                                            <div
                                                className="resize-handle right"
                                                onMouseDown={(e) => handleDragStart(e, task, 'resize-right')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {sectionTasks.length === 0 && (
                        <div className="timeline-row empty">
                            <div className="timeline-row-label">
                                <span className="empty-text">태스크 없음</span>
                            </div>
                            <div className="timeline-row-bars"></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className="timeline-view"
            onMouseMove={draggingTask ? handleDrag : undefined}
            onMouseUp={draggingTask ? handleDragEnd : undefined}
            onMouseLeave={draggingTask ? handleDragEnd : undefined}
        >
            {/* 타임라인 헤더 */}
            <div className="timeline-header">
                <div className="timeline-nav">
                    <button className="nav-btn" onClick={goToPrevious}>&lt;</button>
                    <button className="today-btn" onClick={goToToday}>오늘</button>
                    <button className="nav-btn" onClick={goToNext}>&gt;</button>
                </div>
                <div className="view-range-selector">
                    <button
                        className={viewRange === 14 ? 'active' : ''}
                        onClick={() => setViewRange(14)}
                    >
                        2주
                    </button>
                    <button
                        className={viewRange === 28 ? 'active' : ''}
                        onClick={() => setViewRange(28)}
                    >
                        4주
                    </button>
                    <button
                        className={viewRange === 56 ? 'active' : ''}
                        onClick={() => setViewRange(56)}
                    >
                        8주
                    </button>
                </div>
            </div>

            {/* 타임라인 본체 */}
            <div className="timeline-body" ref={timelineRef}>
                {/* 날짜 헤더 */}
                <div className="timeline-dates">
                    <div className="timeline-label-column"></div>
                    <div className="timeline-date-area">
                        {/* 월 헤더 */}
                        <div className="month-headers">
                            {getMonthHeaders().map((item, idx) => (
                                <div
                                    key={idx}
                                    className="month-header"
                                    style={{
                                        left: `${(item.startIdx / viewRange) * 100}%`,
                                        width: `${(item.width / viewRange) * 100}%`
                                    }}
                                >
                                    {item.month}
                                </div>
                            ))}
                        </div>
                        {/* 일 헤더 */}
                        <div className="day-headers">
                            {dates.map((date, idx) => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <div
                                        key={idx}
                                        className={`day-header ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                                        style={{ width: `${100 / viewRange}%` }}
                                    >
                                        <span className="day-name">{['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}</span>
                                        <span className="day-num">{date.getDate()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 타임라인 콘텐츠 */}
                <div className="timeline-content">
                    {/* 오늘 표시선 */}
                    {todayPosition && (
                        <div className="today-line" style={{ left: todayPosition }}></div>
                    )}

                    {/* 그리드 라인 */}
                    <div className="grid-lines">
                        {dates.map((date, idx) => {
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                                <div
                                    key={idx}
                                    className={`grid-line ${isWeekend ? 'weekend' : ''}`}
                                    style={{ left: `${(idx / viewRange) * 100}%`, width: `${100 / viewRange}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* 섹션들 */}
                    {sections.map(section => renderSection(section.sectionId, section.sectionName))}
                    {renderSection('unassigned', '미지정', true)}
                </div>
            </div>

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
    );
}

export default TimelineView;
