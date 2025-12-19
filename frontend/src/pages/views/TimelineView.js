import React, { useState, useEffect, useRef } from 'react';
import TaskModal from '../../components/TaskModal';
import './TimelineView.css';

// 우선순위 색상
const PRIORITY_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#f59e0b',
    MEDIUM: '#3b82f6',
    LOW: '#6b7280'
};

function TimelineView({
    team,
    tasks: propTasks,
    columns: propColumns,
    teamMembers,
    loginMember,
    filters,
    updateTask,
    refreshData
}) {
    const [tasks, setTasks] = useState(propTasks || []);
    const [columns, setColumns] = useState(propColumns || []);
    const [viewMode, setViewMode] = useState('month'); // 'week', 'month', 'year'
    const [viewStartDate, setViewStartDate] = useState(() => {
        // 오늘이 중앙에 오도록 시작 날짜 계산
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - Math.floor(30 / 2)); // 기본 30일의 절반
        start.setHours(0, 0, 0, 0);
        return start;
    });
    const [selectedTask, setSelectedTask] = useState(null);
    const [isDraggingScroll, setIsDraggingScroll] = useState(false);
    const [scrollStartX, setScrollStartX] = useState(0);
    const [scrollStartLeft, setScrollStartLeft] = useState(0);
    const [sortBy, setSortBy] = useState('column'); // 'column', 'startDate', 'dueDate'

    const timelineRef = useRef(null);
    const dateAreaRef = useRef(null);
    const contentRef = useRef(null);

    // viewMode에 따른 범위 계산
    const getViewRange = () => {
        switch (viewMode) {
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 12; // 12개월
            default: return 30;
        }
    };

    const viewRange = getViewRange();

    // props 동기화
    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    useEffect(() => {
        setColumns(propColumns || []);
    }, [propColumns]);

    // 주의 시작일 가져오기 (일요일)
    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // 날짜/달 배열 생성
    const getDates = () => {
        const dates = [];
        const start = new Date(viewStartDate);

        if (viewMode === 'year') {
            // 12개월
            for (let i = 0; i < 12; i++) {
                const monthDate = new Date(start);
                monthDate.setMonth(start.getMonth() + i);
                dates.push(monthDate);
            }
        } else {
            // 날짜 단위
            for (let i = 0; i < viewRange; i++) {
                dates.push(new Date(start));
                start.setDate(start.getDate() + 1);
            }
        }
        return dates;
    };

    const dates = getDates();

    // 날짜를 인덱스로 변환
    const dateToIndex = (date) => {
        if (!date) return null;
        const d = new Date(date);

        if (viewMode === 'year') {
            // 월 차이 계산
            const startYear = viewStartDate.getFullYear();
            const startMonth = viewStartDate.getMonth();
            const dateYear = d.getFullYear();
            const dateMonth = d.getMonth();
            const diff = (dateYear - startYear) * 12 + (dateMonth - startMonth);
            return diff;
        } else {
            // 일 차이 계산
            const diff = Math.floor((d - viewStartDate) / (1000 * 60 * 60 * 24));
            return diff;
        }
    };

    // 네비게이션
    const goToPrevious = () => {
        const newStart = new Date(viewStartDate);
        if (viewMode === 'year') {
            newStart.setMonth(newStart.getMonth() - 6);
        } else if (viewMode === 'month') {
            newStart.setDate(newStart.getDate() - 15);
        } else {
            newStart.setDate(newStart.getDate() - 3);
        }
        setViewStartDate(newStart);
    };

    const goToNext = () => {
        const newStart = new Date(viewStartDate);
        if (viewMode === 'year') {
            newStart.setMonth(newStart.getMonth() + 6);
        } else if (viewMode === 'month') {
            newStart.setDate(newStart.getDate() + 15);
        } else {
            newStart.setDate(newStart.getDate() + 3);
        }
        setViewStartDate(newStart);
    };

    const goToToday = () => {
        // 오늘이 중앙에 오도록 시작 날짜 설정
        const today = new Date();
        const start = new Date(today);

        if (viewMode === 'year') {
            // 6개월 전
            start.setMonth(start.getMonth() - 6);
            start.setDate(1);
        } else if (viewMode === 'month') {
            // 15일 전
            start.setDate(start.getDate() - 15);
        } else {
            // 3일 전
            start.setDate(start.getDate() - 3);
        }
        start.setHours(0, 0, 0, 0);
        setViewStartDate(start);
    };

    // viewMode 변경 시 오늘이 중앙에 오도록 조정
    useEffect(() => {
        const today = new Date();
        const start = new Date(today);

        if (viewMode === 'year') {
            start.setMonth(start.getMonth() - 6);
            start.setDate(1);
        } else if (viewMode === 'month') {
            start.setDate(start.getDate() - 15);
        } else {
            start.setDate(start.getDate() - 3);
        }
        start.setHours(0, 0, 0, 0);
        setViewStartDate(start);
    }, [viewMode]);

    // 스크롤 동기화 (날짜 영역과 콘텐츠 영역)
    const handleDateAreaScroll = (e) => {
        if (contentRef.current && !isDraggingScroll) {
            contentRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleContentScroll = (e) => {
        if (dateAreaRef.current && !isDraggingScroll) {
            dateAreaRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    // 드래그 스크롤 시작
    const handleScrollDragStart = (e) => {
        // 태스크 바 클릭 시 스크롤 드래그 방지
        if (e.target.closest('.task-bar')) {
            return;
        }

        setIsDraggingScroll(true);
        setScrollStartX(e.pageX);
        if (contentRef.current && viewMode === 'week') {
            setScrollStartLeft(contentRef.current.scrollLeft);
        }
        e.preventDefault();
    };

    // 드래그 스크롤 중
    const handleScrollDragMove = (e) => {
        if (!isDraggingScroll) return;

        const deltaX = e.pageX - scrollStartX;

        if (viewMode === 'week') {
            // 주 뷰: 스크롤 방식
            const newScrollLeft = scrollStartLeft - deltaX;
            if (contentRef.current) {
                contentRef.current.scrollLeft = newScrollLeft;
            }
            if (dateAreaRef.current) {
                dateAreaRef.current.scrollLeft = newScrollLeft;
            }
        } else {
            // 달/년 뷰: viewStartDate 변경 방식
            // 드래그 감도 조절 (픽셀당 이동 거리)
            const sensitivity = viewMode === 'year' ? 0.05 : 0.1; // 년 뷰는 더 느리게
            const dragDistance = -deltaX * sensitivity;

            if (Math.abs(dragDistance) > 1) {
                const newStart = new Date(viewStartDate);

                if (viewMode === 'year') {
                    // 년 뷰: 월 단위로 이동
                    const monthsToMove = Math.floor(dragDistance);
                    newStart.setMonth(newStart.getMonth() + monthsToMove);
                } else {
                    // 달 뷰: 일 단위로 이동
                    const daysToMove = Math.floor(dragDistance);
                    newStart.setDate(newStart.getDate() + daysToMove);
                }

                setViewStartDate(newStart);
                setScrollStartX(e.pageX);
            }
        }
    };

    // 드래그 스크롤 종료
    const handleScrollDragEnd = () => {
        setIsDraggingScroll(false);
    };

    // 셀 너비 계산 (주 뷰만 px, 달/년은 화면에 맞춤)
    const getCellWidth = () => {
        if (viewMode === 'week') return 150; // 1주: 150px per day (스크롤 가능)
        return null; // 달/년: percentage 기반
    };

    const cellWidth = getCellWidth();
    const usePercentage = cellWidth === null;

    // 태스크 바 위치/너비 계산
    const getTaskBarStyle = (task) => {
        const startIdx = dateToIndex(task.startDate || task.dueDate);
        const endIdx = dateToIndex(task.dueDate || task.startDate);

        if (startIdx === null && endIdx === null) return null;

        const effectiveStart = Math.max(0, startIdx ?? endIdx);
        const effectiveEnd = Math.min(viewRange - 1, endIdx ?? startIdx);

        if (effectiveEnd < 0 || effectiveStart >= viewRange) return null;

        if (usePercentage) {
            // 달/년: percentage 기반
            const left = (effectiveStart / viewRange) * 100;
            const width = ((effectiveEnd - effectiveStart + 1) / viewRange) * 100;
            return {
                left: `${left}%`,
                width: `${Math.max(width, 100 / viewRange)}%`,
                backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM
            };
        } else {
            // 주: px 기반
            const left = effectiveStart * cellWidth;
            const width = (effectiveEnd - effectiveStart + 1) * cellWidth;
            return {
                left: `${left}px`,
                width: `${Math.max(width, cellWidth)}px`,
                backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM
            };
        }
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

    // 컬럼별 태스크
    const getTasksByColumn = (columnId) => {
        const columnTasks = tasks.filter(t => t.columnId === columnId);
        return applyFilters(columnTasks);
    };

    // 정렬된 태스크 가져오기
    const getSortedTasks = () => {
        const filteredTasks = applyFilters(tasks);

        if (sortBy === 'startDate') {
            return [...filteredTasks].sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate) : a.dueDate ? new Date(a.dueDate) : new Date(9999, 0);
                const dateB = b.startDate ? new Date(b.startDate) : b.dueDate ? new Date(b.dueDate) : new Date(9999, 0);
                return dateA - dateB;
            });
        } else if (sortBy === 'dueDate') {
            return [...filteredTasks].sort((a, b) => {
                const dateA = a.dueDate ? new Date(a.dueDate) : a.startDate ? new Date(a.startDate) : new Date(9999, 0);
                const dateB = b.dueDate ? new Date(b.dueDate) : b.startDate ? new Date(b.startDate) : new Date(9999, 0);
                return dateA - dateB;
            });
        }

        return filteredTasks;
    };

    // 월/년 헤더 생성
    const getMonthHeaders = () => {
        if (viewMode === 'year') {
            // 1년 뷰에서는 년도만 표시
            const years = [];
            let currentYear = null;
            let startIdx = 0;

            dates.forEach((date, idx) => {
                const year = date.getFullYear();
                if (year !== currentYear) {
                    if (currentYear !== null) {
                        years.push({ month: `${currentYear}년`, startIdx, width: idx - startIdx });
                    }
                    currentYear = year;
                    startIdx = idx;
                }
            });
            if (currentYear !== null) {
                years.push({ month: `${currentYear}년`, startIdx, width: dates.length - startIdx });
            }
            return years;
        } else {
            // 주/달 뷰에서는 년월 표시
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
            if (currentMonth !== null) {
                months.push({ month: currentMonth, startIdx, width: dates.length - startIdx });
            }
            return months;
        }
    };

    // 컬럼 렌더링
    const renderColumn = (column) => {
        const columnTasks = getTasksByColumn(column.columnId);

        return (
            <div key={column.columnId} className="timeline-section">
                <div className="timeline-section-header">
                    <span className="section-name">{column.title}</span>
                    <span className="task-count">{columnTasks.length}</span>
                </div>
                <div className="timeline-section-content">
                    {columnTasks.map(task => {
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
                                <div className="timeline-row-bars" style={usePercentage ? {} : { width: `${viewRange * cellWidth}px` }}>
                                    {barStyle && (
                                        <div
                                            className="task-bar"
                                            style={barStyle}
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <span className="bar-label">{task.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {columnTasks.length === 0 && (
                        <div className="timeline-row empty">
                            <div className="timeline-row-label">
                                <span className="empty-text">태스크 없음</span>
                            </div>
                            <div className="timeline-row-bars" style={usePercentage ? {} : { width: `${viewRange * cellWidth}px` }}></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 정렬된 태스크 렌더링
    const renderSortedTasks = () => {
        const sortedTasks = getSortedTasks();
        const sortLabel = sortBy === 'startDate' ? '시작일 순' : '마감일 순';

        return (
            <div className="timeline-section">
                <div className="timeline-section-header">
                    <span className="section-name">{sortLabel}</span>
                    <span className="task-count">{sortedTasks.length}</span>
                </div>
                <div className="timeline-section-content">
                    {sortedTasks.map(task => {
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
                                <div className="timeline-row-bars" style={usePercentage ? {} : { width: `${viewRange * cellWidth}px` }}>
                                    {barStyle && (
                                        <div
                                            className="task-bar"
                                            style={barStyle}
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <span className="bar-label">{task.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {sortedTasks.length === 0 && (
                        <div className="timeline-row empty">
                            <div className="timeline-row-label">
                                <span className="empty-text">태스크 없음</span>
                            </div>
                            <div className="timeline-row-bars" style={usePercentage ? {} : { width: `${viewRange * cellWidth}px` }}></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            className={`timeline-view ${viewMode === 'week' ? 'week-view' : ''}`}
            onMouseMove={isDraggingScroll ? handleScrollDragMove : undefined}
            onMouseUp={isDraggingScroll ? handleScrollDragEnd : undefined}
            onMouseLeave={isDraggingScroll ? handleScrollDragEnd : undefined}
        >
            {/* 타임라인 헤더 */}
            <div className="timeline-header">
                <div className="timeline-nav">
                    <button className="nav-btn" onClick={goToPrevious}>&lt;</button>
                    <button className="today-btn" onClick={goToToday}>오늘</button>
                    <button className="nav-btn" onClick={goToNext}>&gt;</button>
                </div>
                <div className="timeline-header-controls">
                    <div className="view-range-selector">
                        <button
                            className={viewMode === 'week' ? 'active' : ''}
                            onClick={() => setViewMode('week')}
                        >
                            주
                        </button>
                        <button
                            className={viewMode === 'month' ? 'active' : ''}
                            onClick={() => setViewMode('month')}
                        >
                            달
                        </button>
                        <button
                            className={viewMode === 'year' ? 'active' : ''}
                            onClick={() => setViewMode('year')}
                        >
                            년
                        </button>
                    </div>
                    <div className="sort-selector">
                        <button
                            className={sortBy === 'column' ? 'active' : ''}
                            onClick={() => setSortBy('column')}
                        >
                            칼럼
                        </button>
                        <button
                            className={sortBy === 'startDate' ? 'active' : ''}
                            onClick={() => setSortBy('startDate')}
                        >
                            시작일
                        </button>
                        <button
                            className={sortBy === 'dueDate' ? 'active' : ''}
                            onClick={() => setSortBy('dueDate')}
                        >
                            마감일
                        </button>
                    </div>
                </div>
            </div>

            {/* 타임라인 본체 */}
            <div className="timeline-body" ref={timelineRef}>
                {/* 날짜 헤더 */}
                <div className="timeline-dates">
                    <div className="timeline-label-column"></div>
                    <div
                        className="timeline-date-area"
                        ref={dateAreaRef}
                        onScroll={handleDateAreaScroll}
                        onMouseDown={handleScrollDragStart}
                        style={{ cursor: isDraggingScroll ? 'grabbing' : 'grab' }}
                    >
                        {/* 월/년 헤더 */}
                        <div className="month-headers" style={usePercentage ? {} : { width: `${viewRange * cellWidth}px` }}>
                            {getMonthHeaders().map((item, idx) => (
                                <div
                                    key={idx}
                                    className="month-header"
                                    style={usePercentage ? {
                                        left: `${(item.startIdx / viewRange) * 100}%`,
                                        width: `${(item.width / viewRange) * 100}%`
                                    } : {
                                        left: `${item.startIdx * cellWidth}px`,
                                        width: `${item.width * cellWidth}px`
                                    }}
                                >
                                    {item.month}
                                </div>
                            ))}
                        </div>
                        {/* 일/월 헤더 */}
                        <div className="day-headers">
                            {dates.map((date, idx) => {
                                if (viewMode === 'year') {
                                    // 1년 뷰: 월 표시
                                    const isCurrentMonth = date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
                                    return (
                                        <div
                                            key={idx}
                                            className={`day-header ${isCurrentMonth ? 'today' : ''}`}
                                            style={usePercentage ? { width: `${100 / viewRange}%`, flexShrink: 0 } : { minWidth: `${cellWidth}px`, flexShrink: 0 }}
                                        >
                                            <span className="day-num">{date.getMonth() + 1}월</span>
                                        </div>
                                    );
                                } else {
                                    // 주/달 뷰: 날짜 표시
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                        <div
                                            key={idx}
                                            className={`day-header ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                                            style={usePercentage ? { width: `${100 / viewRange}%`, flexShrink: 0 } : { minWidth: `${cellWidth}px`, flexShrink: 0 }}
                                        >
                                            <span className="day-name">{['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}</span>
                                            <span className="day-num">{date.getDate()}</span>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div>

                {/* 타임라인 콘텐츠 */}
                <div
                    className="timeline-content"
                    ref={contentRef}
                    onScroll={handleContentScroll}
                    onMouseDown={handleScrollDragStart}
                    style={{ cursor: isDraggingScroll ? 'grabbing' : 'grab' }}
                >
                    {/* 그리드 라인 */}
                    <div className="grid-lines" style={usePercentage ? {} : { width: `${viewRange * cellWidth}px` }}>
                        {dates.map((date, idx) => {
                            if (viewMode === 'year') {
                                const isCurrentMonth = date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
                                return (
                                    <div
                                        key={idx}
                                        className={`grid-line ${isCurrentMonth ? 'today' : ''}`}
                                        style={usePercentage ? {
                                            left: `${(idx / viewRange) * 100}%`,
                                            width: `${100 / viewRange}%`
                                        } : {
                                            left: `${idx * cellWidth}px`,
                                            width: `${cellWidth}px`,
                                            minWidth: `${cellWidth}px`
                                        }}
                                    />
                                );
                            } else {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <div
                                        key={idx}
                                        className={`grid-line ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                                        style={usePercentage ? {
                                            left: `${(idx / viewRange) * 100}%`,
                                            width: `${100 / viewRange}%`
                                        } : {
                                            left: `${idx * cellWidth}px`,
                                            width: `${cellWidth}px`,
                                            minWidth: `${cellWidth}px`
                                        }}
                                    />
                                );
                            }
                        })}
                    </div>

                    {/* 컬럼들 또는 정렬된 태스크 */}
                    {sortBy === 'column'
                        ? columns.map(column => renderColumn(column))
                        : renderSortedTasks()
                    }
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
