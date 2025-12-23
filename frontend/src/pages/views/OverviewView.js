import React, { useState, useEffect } from 'react';
import { getTaskFavorites, toggleTaskFavorite } from '../../api/boardApi';
import { useNavigate } from 'react-router-dom';
import TeamHeader from '../../components/TeamHeader';
import './OverviewView.css';

// 워크플로우 상태
const WORKFLOW_STATUSES = {
    WAITING: { label: 'Waiting', color: '#94a3b8' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6' },
    REVIEW: { label: 'Review', color: '#f59e0b' },
    DONE: { label: 'Done', color: '#10b981' },
    REJECTED: { label: 'Rejected', color: '#ef4444' },
    DECLINED: { label: 'Declined', color: '#6b7280' }
};

// 화면 높이에 따른 표시 개수 계산
const calculateMaxItems = () => {
    const height = window.innerHeight;
    if (height < 600) return 2;
    if (height < 750) return 3;
    if (height < 900) return 5;
    if (height < 1100) return 7;
    return 10;
};

function OverviewView({ team, tasks, teamMembers, loginMember, isLeader, updateTeam, activeTab }) {
    const navigate = useNavigate();
    const [favoriteTasks, setFavoriteTasks] = useState([]);
    const [showMyTasksModal, setShowMyTasksModal] = useState(false);
    const [showFavoritesModal, setShowFavoritesModal] = useState(false);
    const [maxDisplayItems, setMaxDisplayItems] = useState(calculateMaxItems());

    // 화면 크기 변경 감지
    useEffect(() => {
        const handleResize = () => {
            setMaxDisplayItems(calculateMaxItems());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 즐겨찾기한 태스크 로드 (개요 탭 진입 시 새로고침)
    useEffect(() => {
        if (loginMember && activeTab === 'overview') {
            loadFavoriteTasks();
        }
    }, [loginMember, activeTab]);

    const loadFavoriteTasks = async () => {
        try {
            const favorites = await getTaskFavorites(loginMember.no);
            setFavoriteTasks(favorites || []);
        } catch (error) {
            console.error('즐겨찾기 로드 실패:', error);
        }
    };

    // 내가 참여중인 태스크 (담당자로 지정된 태스크)
    const getMyTasks = () => {
        if (!loginMember) return [];
        return tasks.filter(task =>
            task.assignees?.some(a => a.memberNo === loginMember.no)
        );
    };

    // 즐겨찾기 토글
    const handleToggleFavorite = async (taskId) => {
        try {
            const result = await toggleTaskFavorite(taskId, loginMember.no);
            if (result.success) {
                // 즐겨찾기 목록 새로고침
                loadFavoriteTasks();
            }
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
        }
    };

    // 참여중인 태스크 정렬 (Done 맨 아래, 긴급 우선, 마감일 빠른 순)
    const sortedMyTasks = getMyTasks().sort((a, b) => {
        // Done은 맨 아래
        const aDone = a.workflowStatus === 'DONE' ? 1 : 0;
        const bDone = b.workflowStatus === 'DONE' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;

        // 긴급 우선
        const aUrgent = a.priority === 'URGENT' ? 0 : 1;
        const bUrgent = b.priority === 'URGENT' ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;

        // 마감일 빠른 순
        const aDate = a.dueDate ? new Date(a.dueDate) : null;
        const bDate = b.dueDate ? new Date(b.dueDate) : null;
        if (aDate && bDate) return aDate - bDate;
        if (aDate && !bDate) return -1;
        if (!aDate && bDate) return 1;

        return 0;
    });

    // 태스크 아이템 렌더링 컴포넌트 (순서: 상태, 제목, 설명, 날짜, 긴급)
    const renderTaskItem = (task) => (
        <div key={task.taskId} className={`task-item ${task.workflowStatus === 'DONE' ? 'done' : ''}`}>
            <span
                className="task-status"
                style={{ backgroundColor: WORKFLOW_STATUSES[task.workflowStatus]?.color || '#94a3b8' }}
            >
                {WORKFLOW_STATUSES[task.workflowStatus]?.label || task.workflowStatus}
            </span>
            <span className="task-title">{task.title}</span>
            <span className="task-description">{task.description || '-'}</span>
            <span className="task-due-date">
                {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                    : '-'
                }
            </span>
            <span className="task-urgent">
                {task.priority === 'URGENT' && (
                    <i className="fa-solid fa-triangle-exclamation"></i>
                )}
            </span>
        </div>
    );

    // 표시할 태스크 (최대 개수 제한 - 화면 크기에 따라 동적)
    const displayedMyTasks = sortedMyTasks.slice(0, maxDisplayItems);
    const displayedFavorites = favoriteTasks.slice(0, maxDisplayItems);
    const hasMoreMyTasks = sortedMyTasks.length > maxDisplayItems;
    const hasMoreFavorites = favoriteTasks.length > maxDisplayItems;

    return (
        <div className="overview-view">
            <TeamHeader team={team} />

            {/* 하단: 좌측(참여중인 태스크), 우측(즐겨찾기 태스크) */}
            <div className="overview-bottom-row">
                {/* 참여중인 태스크 */}
                <div className="overview-section tasks-section">
                    <div className="section-header">
                        <h2>참여중인 태스크</h2>
                        <span className="count-badge">{sortedMyTasks.length}</span>
                    </div>
                    <div className="tasks-list">
                        {displayedMyTasks.length > 0 ? (
                            displayedMyTasks.map(renderTaskItem)
                        ) : (
                            <p className="no-data">참여중인 태스크가 없습니다.</p>
                        )}
                    </div>
                    {hasMoreMyTasks && (
                        <button
                            className="show-more-btn"
                            onClick={() => setShowMyTasksModal(true)}
                        >
                            +{sortedMyTasks.length - maxDisplayItems}개 더보기
                        </button>
                    )}
                </div>

                {/* 즐겨찾기한 태스크 */}
                <div className="overview-section favorites-section">
                    <div className="section-header">
                        <h2>즐겨찾기한 태스크</h2>
                        <span className="count-badge">{favoriteTasks.length}</span>
                    </div>
                    <div className="tasks-list">
                        {displayedFavorites.length > 0 ? (
                            displayedFavorites.map(renderTaskItem)
                        ) : (
                            <p className="no-data">즐겨찾기한 태스크가 없습니다.</p>
                        )}
                    </div>
                    {hasMoreFavorites && (
                        <button
                            className="show-more-btn"
                            onClick={() => setShowFavoritesModal(true)}
                        >
                            +{favoriteTasks.length - maxDisplayItems}개 더보기
                        </button>
                    )}
                </div>
            </div>

            {/* 참여중인 태스크 모달 */}
            {showMyTasksModal && (
                <div className="overview-modal-overlay" onClick={() => setShowMyTasksModal(false)}>
                    <div className="overview-modal" onClick={e => e.stopPropagation()}>
                        <div className="overview-modal-header">
                            <h3>참여중인 태스크</h3>
                            <span className="modal-count">{sortedMyTasks.length}개</span>
                            <button
                                className="overview-modal-close"
                                onClick={() => setShowMyTasksModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="overview-modal-body">
                            {sortedMyTasks.map(renderTaskItem)}
                        </div>
                    </div>
                </div>
            )}

            {/* 즐겨찾기 태스크 모달 */}
            {showFavoritesModal && (
                <div className="overview-modal-overlay" onClick={() => setShowFavoritesModal(false)}>
                    <div className="overview-modal" onClick={e => e.stopPropagation()}>
                        <div className="overview-modal-header">
                            <h3>즐겨찾기한 태스크</h3>
                            <span className="modal-count">{favoriteTasks.length}개</span>
                            <button
                                className="overview-modal-close"
                                onClick={() => setShowFavoritesModal(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="overview-modal-body">
                            {favoriteTasks.map(renderTaskItem)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OverviewView;
