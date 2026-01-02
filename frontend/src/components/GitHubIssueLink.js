import React, { useState, useEffect } from 'react';
import {
    getSyncStatus,
    linkTaskToIssue,
    unlinkTask,
    createIssueFromTask,
    syncToGitHub,
    listGitHubIssues,
    getGitHubStatus,
    getGitHubAuthorizeUrl
} from '../api/githubIssueApi';
import './GitHubIssueLink.css';

const SYNC_STATUS = {
    SYNCED: { label: '동기화됨', color: '#10b981', icon: 'fa-check-circle' },
    PENDING: { label: '동기화 대기', color: '#f59e0b', icon: 'fa-clock' },
    CONFLICT: { label: '충돌', color: '#ef4444', icon: 'fa-exclamation-triangle' },
    ERROR: { label: '오류', color: '#dc2626', icon: 'fa-times-circle' }
};

function GitHubIssueLink({ taskId, teamId, taskTitle, taskDescription, loginMember }) {
    const memberNo = loginMember?.no;
    const [mapping, setMapping] = useState(null);
    const [loading, setLoading] = useState(true);
    const [githubConnected, setGithubConnected] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [availableIssues, setAvailableIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (memberNo) {
            checkGitHubConnection();
        }
    }, [memberNo]);

    useEffect(() => {
        if (taskId && githubConnected) {
            fetchSyncStatus();
        } else if (taskId && !githubConnected) {
            setLoading(false);
        }
    }, [taskId, githubConnected]);

    const checkGitHubConnection = async () => {
        try {
            const status = await getGitHubStatus(memberNo);
            setGithubConnected(status.connected);
        } catch (error) {
            console.error('GitHub 연동 상태 확인 실패:', error);
            setGithubConnected(false);
        }
    };

    const handleConnectGitHub = async () => {
        try {
            // 현재 URL을 저장하여 OAuth 후 돌아올 수 있도록 함
            localStorage.setItem('github_return_url', window.location.pathname);
            const result = await getGitHubAuthorizeUrl(memberNo);
            if (result.url) {
                window.location.href = result.url;
            } else if (result.error) {
                setError(result.error);
            }
        } catch (error) {
            setError('GitHub 연결에 실패했습니다.');
        }
    };

    const fetchSyncStatus = async () => {
        try {
            setLoading(true);
            const result = await getSyncStatus(taskId);
            if (result.linked === false) {
                setMapping(null);
            } else {
                setMapping(result);
            }
        } catch (error) {
            console.error('동기화 상태 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableIssues = async () => {
        try {
            setIssuesLoading(true);
            const issues = await listGitHubIssues(teamId, memberNo, 'open');
            setAvailableIssues(issues || []);
        } catch (error) {
            console.error('GitHub Issues 조회 실패:', error);
            setError(error.response?.data?.error || 'GitHub Issues를 불러오는데 실패했습니다.');
        } finally {
            setIssuesLoading(false);
        }
    };

    const handleOpenLinkModal = () => {
        setShowLinkModal(true);
        setSelectedIssue(null);
        setError(null);
        fetchAvailableIssues();
    };

    const handleLinkIssue = async () => {
        if (!selectedIssue) return;
        try {
            setActionLoading(true);
            setError(null);
            const result = await linkTaskToIssue(taskId, selectedIssue.number, teamId, memberNo);
            setMapping(result);
            setShowLinkModal(false);
        } catch (error) {
            console.error('Issue 연결 실패:', error);
            setError(error.response?.data?.error || 'Issue 연결에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnlink = async () => {
        if (!window.confirm('GitHub Issue 연결을 해제하시겠습니까?')) return;
        try {
            setActionLoading(true);
            await unlinkTask(taskId);
            setMapping(null);
        } catch (error) {
            console.error('연결 해제 실패:', error);
            setError(error.response?.data?.error || '연결 해제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateIssue = async () => {
        if (!window.confirm('이 태스크로 새 GitHub Issue를 생성하시겠습니까?')) return;
        try {
            setActionLoading(true);
            setError(null);
            const result = await createIssueFromTask(taskId, teamId, memberNo);
            setMapping(result);
        } catch (error) {
            console.error('Issue 생성 실패:', error);
            setError(error.response?.data?.error || 'Issue 생성에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setActionLoading(true);
            setError(null);
            await syncToGitHub(taskId, memberNo);
            await fetchSyncStatus();
        } catch (error) {
            console.error('동기화 실패:', error);
            setError(error.response?.data?.error || '동기화에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="github-issue-link loading">
                <i className="fa-solid fa-spinner fa-spin"></i> 로딩 중...
            </div>
        );
    }

    // GitHub 연결 안됨
    if (!githubConnected) {
        return (
            <div className="github-issue-link">
                <div className="github-not-connected">
                    <i className="fa-brands fa-github"></i>
                    <span>GitHub 계정을 연결하면 Issue와 동기화할 수 있습니다.</span>
                    <button className="connect-github-btn" onClick={handleConnectGitHub}>
                        <i className="fa-brands fa-github"></i>
                        GitHub 연결
                    </button>
                </div>
            </div>
        );
    }

    const statusInfo = mapping ? SYNC_STATUS[mapping.syncStatus] || SYNC_STATUS.SYNCED : null;

    return (
        <div className="github-issue-link">
            {error && (
                <div className="issue-link-error">
                    <i className="fa-solid fa-exclamation-circle"></i>
                    {error}
                    <button onClick={() => setError(null)}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
            )}

            {mapping ? (
                <div className="linked-issue">
                    <div className="issue-info">
                        <a
                            href={mapping.issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="issue-link"
                        >
                            <i className="fa-brands fa-github"></i>
                            #{mapping.issueNumber}
                        </a>
                        <span
                            className="sync-status"
                            style={{ color: statusInfo?.color }}
                            title={statusInfo?.label}
                        >
                            <i className={`fa-solid ${statusInfo?.icon}`}></i>
                            {statusInfo?.label}
                        </span>
                        {mapping.lastSyncedAt && (
                            <span className="last-synced">
                                마지막 동기화: {new Date(mapping.lastSyncedAt).toLocaleString('ko-KR')}
                            </span>
                        )}
                    </div>
                    <div className="issue-actions">
                        <button
                            className="action-btn sync"
                            onClick={handleSync}
                            disabled={actionLoading}
                            title="GitHub에 동기화"
                        >
                            <i className={`fa-solid ${actionLoading ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
                        </button>
                        <button
                            className="action-btn unlink"
                            onClick={handleUnlink}
                            disabled={actionLoading}
                            title="연결 해제"
                        >
                            <i className="fa-solid fa-unlink"></i>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="no-issue">
                    <span className="no-issue-text">연결된 GitHub Issue가 없습니다.</span>
                    <div className="no-issue-actions">
                        <button
                            className="link-btn"
                            onClick={handleOpenLinkModal}
                            disabled={actionLoading}
                        >
                            <i className="fa-solid fa-link"></i>
                            기존 Issue 연결
                        </button>
                        <button
                            className="create-btn"
                            onClick={handleCreateIssue}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                                <i className="fa-solid fa-plus"></i>
                            )}
                            새 Issue 생성
                        </button>
                    </div>
                </div>
            )}

            {/* Issue 연결 모달 */}
            {showLinkModal && (
                <div className="issue-link-modal-overlay" onClick={() => setShowLinkModal(false)}>
                    <div className="issue-link-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>GitHub Issue 연결</h3>
                            <button className="close-btn" onClick={() => setShowLinkModal(false)}>
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {issuesLoading ? (
                                <div className="loading-issues">
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Issue 목록 로딩 중...
                                </div>
                            ) : availableIssues.length === 0 ? (
                                <div className="no-issues">
                                    <i className="fa-solid fa-inbox"></i>
                                    <p>연결 가능한 Open Issue가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="issues-list">
                                    {availableIssues.map(issue => (
                                        <div
                                            key={issue.number}
                                            className={`issue-item ${selectedIssue?.number === issue.number ? 'selected' : ''}`}
                                            onClick={() => setSelectedIssue(issue)}
                                        >
                                            <div className="issue-number">#{issue.number}</div>
                                            <div className="issue-details">
                                                <div className="issue-title">{issue.title}</div>
                                                {issue.labels && issue.labels.length > 0 && (
                                                    <div className="issue-labels">
                                                        {issue.labels.map((label, idx) => (
                                                            <span
                                                                key={typeof label === 'string' ? label : label.name || idx}
                                                                className="label-tag"
                                                                style={typeof label === 'object' && label.color
                                                                    ? { backgroundColor: `#${label.color}` }
                                                                    : {}}
                                                            >
                                                                {typeof label === 'string' ? label : label.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowLinkModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="confirm-btn"
                                onClick={handleLinkIssue}
                                disabled={!selectedIssue || actionLoading}
                            >
                                {actionLoading ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> 연결 중...</>
                                ) : (
                                    <><i className="fa-solid fa-link"></i> 연결</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GitHubIssueLink;
