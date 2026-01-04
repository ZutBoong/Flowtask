import React, { useState, useEffect } from 'react';
import {
    updateTeam as apiUpdateTeam, updateTeamDescription,
    kickMember, deleteTeam, getTeamMembers
} from '../../api/teamApi';
import {
    listUserRepositories, connectRepository, disconnectRepository,
    getGitHubStatus, getWebhookConfig, bulkImportIssues, bulkExportTasks, getUnlinkedCounts
} from '../../api/githubIssueApi';
import { columnlistByTeam } from '../../api/boardApi';
import { useNavigate } from 'react-router-dom';
import './SettingsView.css';

function SettingsView({ team, loginMember, isLeader, updateTeam, columns: viewColumns }) {
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState([]);
    const [activeSection, setActiveSection] = useState('general');
    const [editingName, setEditingName] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [description, setDescription] = useState(team?.description || '');
    const [githubRepoUrl, setGithubRepoUrl] = useState(team?.githubRepoUrl || '');
    const [urlCopySuccess, setUrlCopySuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const [showRepoSelector, setShowRepoSelector] = useState(false);
    const [repositories, setRepositories] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [githubConnected, setGithubConnected] = useState(null);
    const [connectingRepo, setConnectingRepo] = useState(false);

    const [columns, setColumns] = useState(viewColumns || []);
    const [githubDefaultColumnId, setGithubDefaultColumnId] = useState(team?.githubDefaultColumnId || null);

    const [bulkSyncing, setBulkSyncing] = useState(false);
    const [unlinkedCounts, setUnlinkedCounts] = useState({ unlinkedTasks: 0, unlinkedIssues: 0 });
    const [syncResult, setSyncResult] = useState(null);

    const [columnMappings, setColumnMappings] = useState([]);
    const [newPrefix, setNewPrefix] = useState('');
    const [newColumnId, setNewColumnId] = useState('');

    const [autoSyncEnabled, setAutoSyncEnabled] = useState(team?.githubIssueSyncEnabled ?? true);

    const getInviteUrl = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/invite/${team?.teamCode}`;
    };

    useEffect(() => {
        if (team?.teamId) {
            fetchTeamMembers();
            if (!viewColumns || viewColumns.length === 0) {
                fetchColumns();
            }
        }
    }, [team?.teamId]);

    useEffect(() => {
        if (viewColumns && viewColumns.length > 0) {
            setColumns(viewColumns);
        }
    }, [viewColumns]);

    useEffect(() => {
        if (team) {
            setTeamName(team.teamName || '');
            setDescription(team.description || '');
            setGithubRepoUrl(team.githubRepoUrl || '');
            setGithubDefaultColumnId(team.githubDefaultColumnId || null);
            setAutoSyncEnabled(team.githubIssueSyncEnabled ?? true);
        }
    }, [team]);

    useEffect(() => {
        if (team?.githubColumnMappings) {
            try {
                const mappingsObj = JSON.parse(team.githubColumnMappings);
                const mappingsArr = Object.entries(mappingsObj).map(([prefix, columnId]) => ({
                    prefix,
                    columnId
                }));
                setColumnMappings(mappingsArr);
            } catch (e) {
                setColumnMappings([]);
            }
        }
    }, [team?.githubColumnMappings]);

    const fetchColumns = async () => {
        try {
            const cols = await columnlistByTeam(team.teamId);
            setColumns(Array.isArray(cols) ? cols : []);
        } catch (error) {
            console.error('컬럼 목록 조회 실패:', error);
        }
    };

    const fetchUnlinkedCounts = async () => {
        if (!team?.teamId || !loginMember?.no || !githubRepoUrl) return;
        try {
            const counts = await getUnlinkedCounts(team.teamId, loginMember.no);
            setUnlinkedCounts(counts);
        } catch (error) {
            console.error('연결되지 않은 항목 개수 조회 실패:', error);
        }
    };

    const handleBulkImport = async () => {
        if (!window.confirm('연결되지 않은 모든 GitHub Issues를 Tasks로 가져오시겠습니까?')) return;
        setBulkSyncing(true);
        setSyncResult(null);
        try {
            const result = await bulkImportIssues(team.teamId, loginMember.no);
            setSyncResult({ type: 'import', success: result.imported, skipped: result.skipped, failed: result.failed });
            alert(result.imported > 0 ? `${result.imported}개의 Issue를 가져왔습니다.` : '가져올 Issue가 없습니다.');
            fetchUnlinkedCounts();
        } catch (error) {
            alert('일괄 가져오기에 실패했습니다: ' + (error.response?.data?.error || error.message));
        } finally {
            setBulkSyncing(false);
        }
    };

    const handleAddMapping = () => {
        if (!newPrefix.trim() || !newColumnId) {
            alert('명령어와 컬럼을 모두 입력해주세요.');
            return;
        }
        if (columnMappings.some(m => m.prefix.toLowerCase() === newPrefix.trim().toLowerCase())) {
            alert('이미 존재하는 명령어입니다.');
            return;
        }
        const newMappings = [...columnMappings, { prefix: newPrefix.trim(), columnId: parseInt(newColumnId) }];
        setColumnMappings(newMappings);
        setNewPrefix('');
        setNewColumnId('');
        saveColumnMappings(newMappings);
    };

    const handleRemoveMapping = (index) => {
        const newMappings = columnMappings.filter((_, i) => i !== index);
        setColumnMappings(newMappings);
        saveColumnMappings(newMappings);
    };

    const saveColumnMappings = async (mappings) => {
        const mappingsObj = {};
        mappings.forEach(m => { mappingsObj[m.prefix] = m.columnId; });
        setSaving(true);
        try {
            await apiUpdateTeam(team.teamId, { ...team, githubColumnMappings: JSON.stringify(mappingsObj) });
            if (updateTeam) updateTeam({ githubColumnMappings: JSON.stringify(mappingsObj) });
        } catch (error) {
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkExport = async () => {
        if (!window.confirm('연결되지 않은 모든 Tasks를 GitHub Issues로 내보내시겠습니까?')) return;
        setBulkSyncing(true);
        setSyncResult(null);
        try {
            const result = await bulkExportTasks(team.teamId, loginMember.no);
            setSyncResult({ type: 'export', success: result.exported, skipped: result.skipped, failed: result.failed });
            alert(result.exported > 0 ? `${result.exported}개의 Task를 내보냈습니다.` : '내보낼 Task가 없습니다.');
            fetchUnlinkedCounts();
        } catch (error) {
            alert('일괄 내보내기에 실패했습니다: ' + (error.response?.data?.error || error.message));
        } finally {
            setBulkSyncing(false);
        }
    };

    useEffect(() => {
        const checkGitHubStatus = async () => {
            if (loginMember?.no) {
                try {
                    const status = await getGitHubStatus(loginMember.no);
                    setGithubConnected(status.connected);
                } catch (error) {
                    setGithubConnected(null);
                }
            }
        };
        checkGitHubStatus();
    }, [loginMember?.no]);

    useEffect(() => {
        if (githubRepoUrl && loginMember?.no) {
            fetchUnlinkedCounts();
        }
    }, [githubRepoUrl, loginMember?.no]);

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(team.teamId);
            setTeamMembers(Array.isArray(members) ? members : []);
        } catch (error) {
            setTeamMembers([]);
        }
    };

    const handleSaveName = async () => {
        if (!teamName.trim()) { alert('팀 이름을 입력해주세요.'); return; }
        setSaving(true);
        try {
            await apiUpdateTeam(team.teamId, { ...team, teamName: teamName.trim() });
            if (updateTeam) updateTeam({ teamName: teamName.trim() });
            setEditingName(false);
        } catch (error) {
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDescription = async () => {
        setSaving(true);
        try {
            await updateTeamDescription(team.teamId, description);
            if (updateTeam) updateTeam({ description });
            setEditingDesc(false);
        } catch (error) {
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenRepoSelector = async () => {
        setShowRepoSelector(true);
        setLoadingRepos(true);
        try {
            const repos = await listUserRepositories(loginMember.no);
            setRepositories(Array.isArray(repos) ? repos : []);
            setGithubConnected(true);
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            if (errorMsg.includes('연결되지 않았습니다') || errorMsg.includes('GitHub')) {
                alert('먼저 마이페이지에서 GitHub 계정을 연동해주세요.');
                setGithubConnected(false);
            } else {
                alert('저장소 목록을 가져오는데 실패했습니다.\n' + errorMsg);
            }
            setShowRepoSelector(false);
        } finally {
            setLoadingRepos(false);
        }
    };

    const handleSelectRepository = async (repo) => {
        if (connectingRepo) return;
        setConnectingRepo(true);
        try {
            let webhookUrl = null;
            try {
                const webhookConfig = await getWebhookConfig();
                if (webhookConfig.baseUrl && !webhookConfig.baseUrl.includes('localhost') && !webhookConfig.baseUrl.includes('127.0.0.1')) {
                    webhookUrl = webhookConfig.baseUrl;
                }
            } catch (configError) {}

            if (!webhookUrl) {
                webhookUrl = window.location.origin;
                if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
                    const ngrokUrl = prompt(
                        'GitHub Webhook을 받을 외부 URL을 입력해주세요.\n(예: https://xxxx.ngrok-free.app)\n\nngrok http 8081 명령으로 실행 후 Forwarding URL을 입력하세요.'
                    );
                    if (!ngrokUrl) { setConnectingRepo(false); return; }
                    webhookUrl = ngrokUrl.replace(/\/$/, '');
                }
            }

            const result = await connectRepository(team.teamId, loginMember.no, repo.fullName, webhookUrl);
            if (result.success) {
                alert(result.webhookCreated ? '저장소가 연결되고 Webhook이 자동 등록되었습니다!' : '저장소가 연결되었습니다.');
                setGithubRepoUrl(result.repoUrl);
                if (updateTeam) updateTeam({ githubRepoUrl: result.repoUrl });
                setShowRepoSelector(false);
            }
        } catch (error) {
            alert('저장소 연결에 실패했습니다.\n' + (error.response?.data?.error || error.message));
        } finally {
            setConnectingRepo(false);
        }
    };

    const handleAutoSyncToggle = async () => {
        const newValue = !autoSyncEnabled;
        setAutoSyncEnabled(newValue);
        setSaving(true);
        try {
            await apiUpdateTeam(team.teamId, { ...team, githubIssueSyncEnabled: newValue });
            if (updateTeam) updateTeam({ githubIssueSyncEnabled: newValue });
        } catch (error) {
            alert('저장에 실패했습니다.');
            setAutoSyncEnabled(!newValue);
        } finally {
            setSaving(false);
        }
    };

    const handleDefaultColumnChange = async (columnId) => {
        const newColumnId = columnId ? parseInt(columnId) : null;
        setGithubDefaultColumnId(newColumnId);
        setSaving(true);
        try {
            await apiUpdateTeam(team.teamId, { ...team, githubDefaultColumnId: newColumnId });
            if (updateTeam) updateTeam({ githubDefaultColumnId: newColumnId });
        } catch (error) {
            alert('저장에 실패했습니다.');
            setGithubDefaultColumnId(team?.githubDefaultColumnId || null);
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnectRepository = async () => {
        if (!window.confirm('GitHub 저장소 연결을 해제하시겠습니까?')) return;
        setSaving(true);
        try {
            await disconnectRepository(team.teamId, loginMember.no);
            setGithubRepoUrl('');
            if (updateTeam) updateTeam({ githubRepoUrl: '' });
            alert('저장소 연결이 해제되었습니다.');
        } catch (error) {
            alert('연결 해제에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyUrl = async () => {
        const inviteUrl = getInviteUrl();
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setUrlCopySuccess(true);
            setTimeout(() => setUrlCopySuccess(false), 2000);
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setUrlCopySuccess(true);
            setTimeout(() => setUrlCopySuccess(false), 2000);
        }
    };

    const handleKickMember = async (memberNo, memberName) => {
        if (memberNo === loginMember.no) { alert('자신을 추방할 수 없습니다.'); return; }
        if (memberNo === team.leaderNo) { alert('팀 리더를 추방할 수 없습니다.'); return; }
        if (!window.confirm(`${memberName}님을 팀에서 추방하시겠습니까?`)) return;
        try {
            await kickMember(team.teamId, memberNo, loginMember.no);
            alert(`${memberName}님이 추방되었습니다.`);
            fetchTeamMembers();
        } catch (error) {
            alert('멤버 추방에 실패했습니다.');
        }
    };

    const handleDeleteTeam = async () => {
        if (!window.confirm('정말로 이 팀을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
        if (!window.confirm('모든 프로젝트, 태스크, 파일이 삭제됩니다.\n계속하시겠습니까?')) return;
        try {
            await deleteTeam(team.teamId);
            alert('팀이 삭제되었습니다.');
            navigate('/');
        } catch (error) {
            alert('팀 삭제에 실패했습니다.');
        }
    };

    if (!team) {
        return <div className="settings-view"><div className="sv-loading">팀 정보를 불러오는 중...</div></div>;
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <div className="sv-section">
                        <div className="sv-section-header">
                            <h2 className="sv-section-title">일반 설정</h2>
                            <p className="sv-section-desc">팀의 기본 정보를 관리합니다.</p>
                        </div>

                        <div className="sv-card">
                            <div className="sv-card-body">
                                <div className="sv-input-group">
                                    <label className="sv-input-label">팀 이름</label>
                                    {editingName ? (
                                        <>
                                            <input type="text" className="sv-input" value={teamName} onChange={(e) => setTeamName(e.target.value)} autoFocus />
                                            <div className="sv-btn-group">
                                                <button className="sv-btn secondary" onClick={() => { setTeamName(team?.teamName || ''); setEditingName(false); }}>취소</button>
                                                <button className="sv-btn primary" onClick={handleSaveName} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '15px', color: '#1e293b' }}>{team?.teamName}</span>
                                            {isLeader && <button className="sv-btn secondary sm" onClick={() => setEditingName(true)}>수정</button>}
                                        </div>
                                    )}
                                </div>

                                <div className="sv-input-group">
                                    <label className="sv-input-label">팀 설명</label>
                                    {editingDesc ? (
                                        <>
                                            <textarea className="sv-input sv-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="팀에 대한 설명을 입력하세요..." />
                                            <div className="sv-btn-group">
                                                <button className="sv-btn secondary" onClick={() => { setDescription(team?.description || ''); setEditingDesc(false); }}>취소</button>
                                                <button className="sv-btn primary" onClick={handleSaveDescription} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '14px', color: team?.description ? '#64748b' : '#94a3b8' }}>{team?.description || '설명이 없습니다.'}</span>
                                            {isLeader && <button className="sv-btn secondary sm" onClick={() => setEditingDesc(true)}>수정</button>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isLeader && (
                            <div className="sv-card">
                                <div className="sv-card-header">
                                    <span className="sv-card-title">팀 초대</span>
                                </div>
                                <div className="sv-card-body">
                                    <div className="sv-input-group">
                                        <label className="sv-input-label">초대 링크</label>
                                        <div className="sv-code-box">
                                            <span className="sv-code" style={{ fontSize: '13px', letterSpacing: 0 }}>{getInviteUrl()}</span>
                                            <button className="sv-btn primary sm" onClick={handleCopyUrl}>{urlCopySuccess ? '복사됨!' : '복사'}</button>
                                        </div>
                                        <p className="sv-hint">이 링크를 공유하여 다른 사람을 팀에 초대할 수 있습니다.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'members':
                return (
                    <div className="sv-section">
                        <div className="sv-section-header">
                            <h2 className="sv-section-title">팀원 관리</h2>
                            <p className="sv-section-desc">현재 {teamMembers.length}명의 팀원이 있습니다.</p>
                        </div>

                        <div className="sv-card">
                            <div className="sv-card-body">
                                <div className="sv-members-list">
                                    {teamMembers.map(member => (
                                        <div key={member.memberNo} className="sv-member-item">
                                            <div className="sv-member-avatar">{member.memberName?.charAt(0) || '?'}</div>
                                            <div className="sv-member-info">
                                                <div className="sv-member-name">{member.memberName}</div>
                                                <div className="sv-member-id">@{member.memberUserid}</div>
                                            </div>
                                            {member.memberNo === team?.leaderNo ? (
                                                <span className="sv-badge leader">리더</span>
                                            ) : (
                                                <>
                                                    <span className="sv-badge member">멤버</span>
                                                    {isLeader && (
                                                        <button className="sv-btn danger sm" onClick={() => handleKickMember(member.memberNo, member.memberName)}>추방</button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'github':
                return (
                    <div className="sv-section">
                        <div className="sv-section-header">
                            <h2 className="sv-section-title">GitHub 연동</h2>
                            <p className="sv-section-desc">GitHub 저장소를 연결하여 Issue를 동기화합니다.</p>
                        </div>

                        <div className="sv-card">
                            <div className="sv-card-header">
                                <span className="sv-card-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    저장소
                                </span>
                            </div>
                            <div className="sv-card-body">
                                {githubRepoUrl ? (
                                    <div className="sv-github-connected">
                                        <div className="sv-github-repo">
                                            <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer">{githubRepoUrl.replace('https://github.com/', '')}</a>
                                        </div>
                                        <div className="sv-btn-group" style={{ marginTop: '12px' }}>
                                            <button className="sv-btn secondary sm" onClick={handleOpenRepoSelector}>변경</button>
                                            <button className="sv-btn danger sm" onClick={handleDisconnectRepository} disabled={saving}>연결 해제</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="sv-github-empty">
                                        <p>GitHub 저장소를 연결하면 Issue가 자동으로 Task로 동기화됩니다.</p>
                                        <button className="sv-btn github" onClick={handleOpenRepoSelector}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                            </svg>
                                            GitHub 저장소 연결
                                        </button>
                                        {githubConnected === false && <p className="sv-hint warning">먼저 마이페이지에서 GitHub 계정을 연동해주세요.</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {githubRepoUrl && (
                            <>
                                <div className="sv-card">
                                    <div className="sv-card-header">
                                        <span className="sv-card-title">자동 동기화</span>
                                    </div>
                                    <div className="sv-card-body">
                                        <div className="sv-toggle-row">
                                            <div className="sv-toggle-info">
                                                <div className="sv-toggle-label">실시간 자동 동기화</div>
                                                <div className="sv-toggle-desc">Task 생성 시 GitHub Issue 자동 생성, Issue 생성 시 Task 자동 생성</div>
                                            </div>
                                            <button className={`sv-toggle-switch ${autoSyncEnabled ? 'on' : 'off'}`} onClick={handleAutoSyncToggle} disabled={saving}>
                                                <span className="sv-toggle-slider"></span>
                                            </button>
                                        </div>

                                        <div className="sv-input-group" style={{ marginTop: '20px' }}>
                                            <label className="sv-input-label">Issue 생성 시 기본 컬럼</label>
                                            <select className="sv-select" value={githubDefaultColumnId || ''} onChange={(e) => handleDefaultColumnChange(e.target.value)} disabled={saving || columns.length === 0}>
                                                <option value="">자동 (첫 번째 컬럼)</option>
                                                {columns.map(col => <option key={col.columnId} value={col.columnId}>{col.title}</option>)}
                                            </select>
                                            <p className="sv-hint">GitHub Issue가 생성되면 선택한 컬럼에 Task가 자동 생성됩니다.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="sv-card">
                                    <div className="sv-card-header">
                                        <span className="sv-card-title">일괄 동기화</span>
                                    </div>
                                    <div className="sv-card-body">
                                        <div className="sv-sync-buttons">
                                            <button className="sv-btn secondary" onClick={handleBulkImport} disabled={bulkSyncing}>
                                                {bulkSyncing ? '처리 중...' : 'GitHub → Synodos'}
                                                {unlinkedCounts.unlinkedIssues > 0 && <span className="sv-count-badge">{unlinkedCounts.unlinkedIssues}</span>}
                                            </button>
                                            <button className="sv-btn secondary" onClick={handleBulkExport} disabled={bulkSyncing}>
                                                {bulkSyncing ? '처리 중...' : 'Synodos → GitHub'}
                                                {unlinkedCounts.unlinkedTasks > 0 && <span className="sv-count-badge">{unlinkedCounts.unlinkedTasks}</span>}
                                            </button>
                                        </div>
                                        <p className="sv-hint">연결되지 않은 기존 Issues와 Tasks를 일괄로 동기화합니다.</p>
                                        {syncResult && (
                                            <div className="sv-sync-result">
                                                {syncResult.type === 'import' ? '가져오기' : '내보내기'} 완료: 성공 {syncResult.success}개
                                                {syncResult.skipped > 0 && `, 건너뜀 ${syncResult.skipped}개`}
                                                {syncResult.failed > 0 && `, 실패 ${syncResult.failed}개`}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sv-card">
                                    <div className="sv-card-header">
                                        <span className="sv-card-title">컬럼 매핑 규칙</span>
                                    </div>
                                    <div className="sv-card-body">
                                        <p className="sv-hint" style={{ marginTop: 0, marginBottom: '16px' }}>
                                            Issue 제목이 특정 명령어로 시작하면 자동으로 해당 컬럼에 Task가 생성됩니다.<br />예: "[버그] 로그인 오류" → "버그" 컬럼
                                        </p>
                                        {columnMappings.length > 0 && (
                                            <div className="sv-mapping-list">
                                                {columnMappings.map((mapping, index) => {
                                                    const column = columns.find(c => c.columnId === mapping.columnId);
                                                    return (
                                                        <div key={index} className="sv-mapping-item">
                                                            <span className="sv-mapping-prefix">{mapping.prefix}</span>
                                                            <span className="sv-mapping-arrow">→</span>
                                                            <span className="sv-mapping-column">{column?.title || `컬럼 ID: ${mapping.columnId}`}</span>
                                                            <button className="sv-mapping-delete" onClick={() => handleRemoveMapping(index)}>×</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <div className="sv-mapping-add">
                                            <input type="text" className="sv-input" placeholder="명령어 (예: [버그])" value={newPrefix} onChange={(e) => setNewPrefix(e.target.value)} />
                                            <select className="sv-select" value={newColumnId} onChange={(e) => setNewColumnId(e.target.value)}>
                                                <option value="">컬럼 선택</option>
                                                {columns.map(col => <option key={col.columnId} value={col.columnId}>{col.title}</option>)}
                                            </select>
                                            <button className="sv-btn primary sm" onClick={handleAddMapping} disabled={saving || !newPrefix.trim() || !newColumnId}>추가</button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'danger':
                return (
                    <div className="sv-section">
                        <div className="sv-section-header">
                            <h2 className="sv-section-title">위험 구역</h2>
                            <p className="sv-section-desc">되돌릴 수 없는 작업들입니다. 신중하게 진행해주세요.</p>
                        </div>

                        <div className="sv-card sv-danger-card">
                            <div className="sv-card-body">
                                <div className="sv-danger-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                        <line x1="12" y1="9" x2="12" y2="13"/>
                                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                </div>
                                <h3 className="sv-danger-title">팀 삭제</h3>
                                <p className="sv-danger-desc">
                                    팀을 삭제하면 모든 프로젝트, 태스크, 파일이 영구적으로 삭제됩니다.<br />
                                    이 작업은 되돌릴 수 없습니다.
                                </p>
                                <button className="sv-btn danger-solid" onClick={handleDeleteTeam}>팀 삭제</button>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="settings-view">
            <nav className="sv-sidebar">
                <div className="sv-sidebar-title">설정</div>
                <button className={`sv-nav-item ${activeSection === 'general' ? 'active' : ''}`} onClick={() => setActiveSection('general')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    일반
                </button>
                <button className={`sv-nav-item ${activeSection === 'members' ? 'active' : ''}`} onClick={() => setActiveSection('members')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    팀원
                </button>
                {isLeader && (
                    <button className={`sv-nav-item ${activeSection === 'github' ? 'active' : ''}`} onClick={() => setActiveSection('github')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                    </button>
                )}
                {isLeader && (
                    <button className={`sv-nav-item danger ${activeSection === 'danger' ? 'active' : ''}`} onClick={() => setActiveSection('danger')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        위험 구역
                    </button>
                )}
            </nav>

            <main className="sv-main">
                {renderSection()}
            </main>

            {showRepoSelector && (
                <div className="sv-modal-overlay" onClick={() => setShowRepoSelector(false)}>
                    <div className="sv-modal" onClick={e => e.stopPropagation()}>
                        <div className="sv-modal-header">
                            <h3 className="sv-modal-title">GitHub 저장소 선택</h3>
                            <button className="sv-modal-close" onClick={() => setShowRepoSelector(false)}>×</button>
                        </div>
                        <div className="sv-modal-body">
                            {loadingRepos ? (
                                <div className="sv-loading">저장소 목록을 불러오는 중...</div>
                            ) : repositories.length === 0 ? (
                                <div className="sv-empty">저장소가 없습니다.<br />GitHub에서 저장소를 먼저 생성해주세요.</div>
                            ) : (
                                repositories.map(repo => (
                                    <div key={repo.id} className={`sv-repo-item ${connectingRepo ? 'disabled' : ''}`} onClick={() => handleSelectRepository(repo)}>
                                        <div className="sv-repo-info">
                                            <div className="sv-repo-name">{repo.fullName}</div>
                                            {repo.description && <div className="sv-repo-desc">{repo.description}</div>}
                                        </div>
                                        {repo.privateRepo && <span className="sv-private-badge">Private</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SettingsView;
