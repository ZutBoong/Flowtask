import React, { useState } from 'react';
import { updateTeamDescription } from '../../api/teamApi';
import './OverviewView.css';

// 상태별 라벨
const STATUS_LABELS = {
    OPEN: '열림',
    IN_PROGRESS: '진행중',
    RESOLVED: '해결됨',
    CLOSED: '닫힘'
};

function OverviewView({ team, tasks, teamMembers, loginMember, isLeader, updateTeam }) {
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionValue, setDescriptionValue] = useState(team?.description || '');
    const [saving, setSaving] = useState(false);

    // 태스크 통계
    const getTaskStats = () => {
        const stats = {
            total: tasks.length,
            byStatus: {}
        };

        tasks.forEach(task => {
            const status = task.status || 'OPEN';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        });

        // 완료율 계산
        const completed = (stats.byStatus['CLOSED'] || 0) + (stats.byStatus['RESOLVED'] || 0);
        stats.completionRate = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;

        return stats;
    };

    const stats = getTaskStats();

    // 설명 저장
    const handleSaveDescription = async () => {
        if (saving) return;

        try {
            setSaving(true);
            await updateTeamDescription(team.teamId, descriptionValue);
            updateTeam({ description: descriptionValue });
            setEditingDescription(false);
        } catch (error) {
            console.error('설명 저장 실패:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 최근 활동 태스크 (최근 수정된 5개)
    const getRecentTasks = () => {
        return [...tasks]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);
    };

    // 마감 임박 태스크
    const getUpcomingTasks = () => {
        const now = new Date();
        return tasks
            .filter(task => {
                if (!task.dueDate || task.status === 'CLOSED') return false;
                const due = new Date(task.dueDate);
                return due >= now;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
    };

    return (
        <div className="overview-view">
            {/* 팀 정보 섹션 */}
            <div className="overview-section team-info-section">
                <div className="section-header">
                    <h2>팀 정보</h2>
                </div>
                <div className="team-info-content">
                    <div className="team-name-display">
                        <span className="label">팀 이름</span>
                        <span className="value">{team?.teamName}</span>
                    </div>

                    <div className="team-description-display">
                        <span className="label">설명</span>
                        {editingDescription ? (
                            <div className="description-edit">
                                <textarea
                                    value={descriptionValue}
                                    onChange={(e) => setDescriptionValue(e.target.value)}
                                    placeholder="팀에 대한 설명을 입력하세요..."
                                    rows={4}
                                />
                                <div className="edit-actions">
                                    <button
                                        className="cancel-btn"
                                        onClick={() => {
                                            setDescriptionValue(team?.description || '');
                                            setEditingDescription(false);
                                        }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className="save-btn"
                                        onClick={handleSaveDescription}
                                        disabled={saving}
                                    >
                                        {saving ? '저장 중...' : '저장'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="description-display">
                                <p>{team?.description || '설명이 없습니다.'}</p>
                                {isLeader && (
                                    <button
                                        className="edit-btn"
                                        onClick={() => setEditingDescription(true)}
                                    >
                                        수정
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 통계 섹션 */}
            <div className="overview-section stats-section">
                <div className="section-header">
                    <h2>태스크 현황</h2>
                </div>
                <div className="stats-grid">
                    <div className="stat-card total">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">전체 태스크</span>
                    </div>
                    <div className="stat-card completion">
                        <span className="stat-value">{stats.completionRate}%</span>
                        <span className="stat-label">완료율</span>
                        <div className="completion-bar">
                            <div
                                className="completion-fill"
                                style={{ width: `${stats.completionRate}%` }}
                            ></div>
                        </div>
                    </div>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <div key={key} className={`stat-card status-${key.toLowerCase()}`}>
                            <span className="stat-value">{stats.byStatus[key] || 0}</span>
                            <span className="stat-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 팀원 섹션 */}
            <div className="overview-section members-section">
                <div className="section-header">
                    <h2>팀원 ({teamMembers.length}명)</h2>
                </div>
                <div className="members-grid">
                    {teamMembers.map(member => (
                        <div key={member.memberNo} className="member-card">
                            <div className="member-avatar">
                                {member.memberName?.charAt(0) || '?'}
                            </div>
                            <div className="member-info">
                                <span className="member-name">{member.memberName}</span>
                                <span className="member-userid">@{member.memberUserid}</span>
                                {member.memberNo === team?.leaderNo && (
                                    <span className="leader-badge">리더</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="overview-bottom-row">
                {/* 최근 활동 섹션 */}
                <div className="overview-section recent-section">
                    <div className="section-header">
                        <h2>최근 활동</h2>
                    </div>
                    <div className="recent-tasks-list">
                        {getRecentTasks().length > 0 ? (
                            getRecentTasks().map(task => (
                                <div key={task.taskId} className="recent-task-item">
                                    <span className={`status-dot status-${(task.status || 'OPEN').toLowerCase()}`}></span>
                                    <span className="task-title">{task.title}</span>
                                    <span className="task-time">
                                        {new Date(task.updatedAt || task.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">최근 활동이 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 마감 임박 섹션 */}
                <div className="overview-section upcoming-section">
                    <div className="section-header">
                        <h2>마감 임박</h2>
                    </div>
                    <div className="upcoming-tasks-list">
                        {getUpcomingTasks().length > 0 ? (
                            getUpcomingTasks().map(task => (
                                <div key={task.taskId} className="upcoming-task-item">
                                    <span className="task-title">{task.title}</span>
                                    <span className="due-date">
                                        {new Date(task.dueDate).toLocaleDateString('ko-KR', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">마감 예정 태스크가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OverviewView;
