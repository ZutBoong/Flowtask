import React, { useState, useEffect } from 'react';
import { taskwrite, taskupdate, taskdelete } from '../../api/boardApi';
import { createSection, updateSection, deleteSection } from '../../api/sectionApi';
import TaskModal from '../../components/TaskModal';
import './ListView.css';

// 상태 라벨
const STATUS_LABELS = {
    OPEN: '열림',
    IN_PROGRESS: '진행중',
    RESOLVED: '해결됨',
    CLOSED: '닫힘'
};

// 상태 색상
const STATUS_COLORS = {
    OPEN: '#ff9800',
    IN_PROGRESS: '#2196f3',
    RESOLVED: '#4caf50',
    CLOSED: '#9c27b0'
};

function ListView({
    team,
    tasks: propTasks,
    sections: propSections,
    columns,
    teamMembers,
    loginMember,
    filters,
    addTask,
    updateTask,
    removeTask,
    addSection,
    updateSection: updateSectionProp,
    removeSection,
    refreshData
}) {
    const [tasks, setTasks] = useState(propTasks || []);
    const [sections, setSections] = useState(propSections || []);
    const [expandedSections, setExpandedSections] = useState({});
    const [newTaskTitle, setNewTaskTitle] = useState({});
    const [newSectionName, setNewSectionName] = useState('');
    const [editingSection, setEditingSection] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [addingSectionTask, setAddingSectionTask] = useState(null);

    // props 동기화
    useEffect(() => {
        setTasks(propTasks || []);
    }, [propTasks]);

    useEffect(() => {
        setSections(propSections || []);
        // 기본적으로 모든 섹션 펼침
        const expanded = {};
        (propSections || []).forEach(s => {
            expanded[s.sectionId] = true;
        });
        expanded['unassigned'] = true;
        setExpandedSections(expanded);
    }, [propSections]);

    // 섹션 토글
    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
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

    // 섹션별 태스크 가져오기
    const getTasksBySection = (sectionId) => {
        let sectionTasks;
        if (sectionId === 'unassigned') {
            sectionTasks = tasks.filter(t => !t.sectionId);
        } else {
            sectionTasks = tasks.filter(t => t.sectionId === sectionId);
        }
        return applyFilters(sectionTasks);
    };

    // 새 섹션 추가
    const handleAddSection = async () => {
        if (!newSectionName.trim() || !team) return;

        try {
            const section = await createSection({
                teamId: team.teamId,
                sectionName: newSectionName.trim(),
                position: sections.length + 1
            });
            setSections(prev => [...prev, section]);
            setExpandedSections(prev => ({ ...prev, [section.sectionId]: true }));
            setNewSectionName('');
            if (addSection) addSection(section);
        } catch (error) {
            console.error('섹션 추가 실패:', error);
            alert('섹션 추가에 실패했습니다.');
        }
    };

    // 섹션 이름 수정
    const handleUpdateSection = async (sectionId, newName) => {
        if (!newName.trim()) return;

        try {
            const section = sections.find(s => s.sectionId === sectionId);
            await updateSection(sectionId, { ...section, sectionName: newName.trim() });
            setSections(prev => prev.map(s =>
                s.sectionId === sectionId ? { ...s, sectionName: newName.trim() } : s
            ));
            setEditingSection(null);
            if (updateSectionProp) updateSectionProp({ ...section, sectionName: newName.trim() });
        } catch (error) {
            console.error('섹션 수정 실패:', error);
        }
    };

    // 섹션 삭제
    const handleDeleteSection = async (sectionId) => {
        if (!window.confirm('이 섹션을 삭제하시겠습니까? 태스크는 삭제되지 않습니다.')) return;

        try {
            await deleteSection(sectionId);
            setSections(prev => prev.filter(s => s.sectionId !== sectionId));
            // 해당 섹션의 태스크들 sectionId를 null로 변경
            setTasks(prev => prev.map(t =>
                t.sectionId === sectionId ? { ...t, sectionId: null } : t
            ));
            if (removeSection) removeSection(sectionId);
        } catch (error) {
            console.error('섹션 삭제 실패:', error);
        }
    };

    // 태스크 추가
    const handleAddTask = async (sectionId) => {
        const title = newTaskTitle[sectionId];
        if (!title?.trim() || !team) return;

        // columns가 있으면 첫 번째 컬럼에 추가
        const columnId = columns?.[0]?.columnId;
        if (!columnId) {
            alert('먼저 보드에서 컬럼을 생성해주세요.');
            return;
        }

        try {
            await taskwrite({
                columnId,
                title: title.trim(),
                sectionId: sectionId === 'unassigned' ? null : sectionId
            });
            setNewTaskTitle(prev => ({ ...prev, [sectionId]: '' }));
            setAddingSectionTask(null);
            if (refreshData) refreshData();
        } catch (error) {
            console.error('태스크 추가 실패:', error);
            alert('태스크 추가에 실패했습니다.');
        }
    };

    // 태스크 완료 토글
    const handleToggleComplete = async (task) => {
        const newStatus = task.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
        try {
            await taskupdate({ ...task, status: newStatus });
            setTasks(prev => prev.map(t =>
                t.taskId === task.taskId ? { ...t, status: newStatus } : t
            ));
            if (updateTask) updateTask({ ...task, status: newStatus });
        } catch (error) {
            console.error('상태 변경 실패:', error);
        }
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

    // 섹션 렌더링
    const renderSection = (sectionId, sectionName, isUnassigned = false) => {
        const sectionTasks = getTasksBySection(sectionId);
        const isExpanded = expandedSections[sectionId];

        return (
            <div key={sectionId} className="list-section">
                <div className="section-header" onClick={() => toggleSection(sectionId)}>
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                    {editingSection === sectionId ? (
                        <input
                            type="text"
                            defaultValue={sectionName}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => handleUpdateSection(sectionId, e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleUpdateSection(sectionId, e.target.value);
                                }
                            }}
                        />
                    ) : (
                        <span className="section-name">{sectionName}</span>
                    )}
                    <span className="task-count">{sectionTasks.length}</span>
                    {!isUnassigned && (
                        <div className="section-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="section-action-btn"
                                onClick={() => setEditingSection(sectionId)}
                                title="이름 수정"
                            >
                                ✎
                            </button>
                            <button
                                className="section-action-btn delete"
                                onClick={() => handleDeleteSection(sectionId)}
                                title="삭제"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                {isExpanded && (
                    <div className="section-content">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th className="col-check"></th>
                                    <th className="col-title">제목</th>
                                    <th className="col-assignee">담당자</th>
                                    <th className="col-due">마감일</th>
                                    <th className="col-status">상태</th>
                                    <th className="col-actions"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectionTasks.map(task => (
                                    <tr
                                        key={task.taskId}
                                        className={task.status === 'CLOSED' ? 'completed' : ''}
                                    >
                                        <td className="col-check">
                                            <input
                                                type="checkbox"
                                                checked={task.status === 'CLOSED'}
                                                onChange={() => handleToggleComplete(task)}
                                            />
                                        </td>
                                        <td className="col-title">
                                            <span
                                                className="task-title-link"
                                                onClick={() => setSelectedTask(task)}
                                            >
                                                {task.title}
                                            </span>
                                            {task.tags?.length > 0 && (
                                                <div className="task-tags">
                                                    {task.tags.slice(0, 2).map(tag => (
                                                        <span
                                                            key={tag.tagId}
                                                            className="tag-badge"
                                                            style={{ backgroundColor: tag.color }}
                                                        >
                                                            {tag.tagName}
                                                        </span>
                                                    ))}
                                                    {task.tags.length > 2 && (
                                                        <span className="tag-more">+{task.tags.length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="col-assignee">{getAssigneeName(task)}</td>
                                        <td className="col-due">{formatDueDate(task.dueDate)}</td>
                                        <td className="col-status">
                                            <span
                                                className="status-badge"
                                                style={{ backgroundColor: STATUS_COLORS[task.status] || STATUS_COLORS.OPEN }}
                                            >
                                                {STATUS_LABELS[task.status] || '열림'}
                                            </span>
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
                                ))}
                            </tbody>
                        </table>

                        {/* 태스크 추가 */}
                        {addingSectionTask === sectionId ? (
                            <div className="add-task-inline">
                                <input
                                    type="text"
                                    placeholder="태스크 제목 입력..."
                                    value={newTaskTitle[sectionId] || ''}
                                    onChange={(e) => setNewTaskTitle(prev => ({
                                        ...prev,
                                        [sectionId]: e.target.value
                                    }))}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') handleAddTask(sectionId);
                                    }}
                                    autoFocus
                                />
                                <button onClick={() => handleAddTask(sectionId)}>추가</button>
                                <button onClick={() => setAddingSectionTask(null)}>취소</button>
                            </div>
                        ) : (
                            <button
                                className="add-task-btn"
                                onClick={() => setAddingSectionTask(sectionId)}
                            >
                                + 작업 추가
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="list-view">
            {/* 섹션들 */}
            {sections.map(section => renderSection(section.sectionId, section.sectionName))}

            {/* 미지정 섹션 */}
            {renderSection('unassigned', '미지정', true)}

            {/* 새 섹션 추가 */}
            <div className="add-section">
                <input
                    type="text"
                    placeholder="새 섹션 이름..."
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAddSection();
                    }}
                />
                <button onClick={handleAddSection}>+ 섹션 추가</button>
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

export default ListView;
