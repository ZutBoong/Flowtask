import React, { useState, useEffect } from 'react';
import {
    updateTeam, updateTeamDescription, regenerateTeamCode,
    kickMember, deleteTeam, getTeamMembers
} from '../api/teamApi';
import {
    listUserRepositories, connectRepository, disconnectRepository,
    getGitHubStatus, getWebhookConfig, bulkImportIssues, bulkExportTasks, getUnlinkedCounts
} from '../api/githubIssueApi';
import { columnlistByTeam } from '../api/boardApi';
import './TeamSettingsModal.css';

function TeamSettingsModal({ team, loginMember, onClose, onTeamUpdate, onTeamDelete }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [activeTab, setActiveTab] = useState('info');
    const [editingName, setEditingName] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [editingGithub, setEditingGithub] = useState(false);
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [description, setDescription] = useState(team?.description || '');
    const [githubRepoUrl, setGithubRepoUrl] = useState(team?.githubRepoUrl || '');
    const [showTeamCode, setShowTeamCode] = useState(false);
    const [codeCopySuccess, setCodeCopySuccess] = useState(false);
    const [urlCopySuccess, setUrlCopySuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    // GitHub 저장소 연결
    const [showRepoSelector, setShowRepoSelector] = useState(false);
    const [repositories, setRepositories] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [githubConnected, setGithubConnected] = useState(null); // null = 확인 중, true/false = 확인됨
    const [connectingRepo, setConnectingRepo] = useState(false);

    // GitHub Issue 기본 컬럼
    const [columns, setColumns] = useState([]);
    const [githubDefaultColumnId, setGithubDefaultColumnId] = useState(team?.githubDefaultColumnId || null);

    // 일괄 동기화
    const [bulkSyncing, setBulkSyncing] = useState(false);
    const [unlinkedCounts, setUnlinkedCounts] = useState({ unlinkedTasks: 0, unlinkedIssues: 0 });
    const [syncResult, setSyncResult] = useState(null);

    // 컬럼 매핑 규칙
    const [columnMappings, setColumnMappings] = useState([]);
    const [newPrefix, setNewPrefix] = useState('');
    const [newColumnId, setNewColumnId] = useState('');

    // 초대 URL 생성
    const getInviteUrl = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/invite/${team?.teamCode}`;
    };

    const isLeader = team?.leaderNo === loginMember?.no;

    useEffect(() => {
        if (team?.teamId) {
            fetchTeamMembers();
            fetchColumns();
        }
    }, [team?.teamId]);

    // 컬럼 매핑 규칙 로드
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
                console.error('매핑 규칙 파싱 실패:', e);
                setColumnMappings([]);
            }
        }
    }, [team?.githubColumnMappings]);

    // 컬럼 목록 로드
    const fetchColumns = async () => {
        try {
            const cols = await columnlistByTeam(team.teamId);
            setColumns(Array.isArray(cols) ? cols : []);
        } catch (error) {
            console.error('컬럼 목록 조회 실패:', error);
        }
    };

    // 연결되지 않은 Issue/Task 개수 로드
    const fetchUnlinkedCounts = async () => {
        if (!team?.teamId || !loginMember?.no || !githubRepoUrl) return;
        try {
            const counts = await getUnlinkedCounts(team.teamId, loginMember.no);
            setUnlinkedCounts(counts);
        } catch (error) {
            console.error('연결되지 않은 항목 개수 조회 실패:', error);
        }
    };

    // GitHub Issues 일괄 가져오기
    const handleBulkImport = async () => {
        if (!window.confirm('연결되지 않은 모든 GitHub Issues를 Tasks로 가져오시겠습니까?')) return;

        setBulkSyncing(true);
        setSyncResult(null);
        try {
            const result = await bulkImportIssues(team.teamId, loginMember.no);
            setSyncResult({
                type: 'import',
                success: result.imported,
                skipped: result.skipped,
                failed: result.failed
            });
            if (result.imported > 0) {
                alert(`${result.imported}개의 Issue를 가져왔습니다.`);
            } else {
                alert('가져올 Issue가 없습니다.');
            }
            fetchUnlinkedCounts();
        } catch (error) {
            console.error('일괄 가져오기 실패:', error);
            alert('일괄 가져오기에 실패했습니다: ' + (error.response?.data?.error || error.message));
        } finally {
            setBulkSyncing(false);
        }
    };

    // 매핑 규칙 추가
    const handleAddMapping = () => {
        if (!newPrefix.trim() || !newColumnId) {
            alert('명령어와 컬럼을 모두 입력해주세요.');
            return;
        }

        // 중복 확인
        if (columnMappings.some(m => m.prefix.toLowerCase() === newPrefix.trim().toLowerCase())) {
            alert('이미 존재하는 명령어입니다.');
            return;
        }

        const newMappings = [...columnMappings, { prefix: newPrefix.trim(), columnId: parseInt(newColumnId) }];
        setColumnMappings(newMappings);
        setNewPrefix('');
        setNewColumnId('');

        // 저장
        saveColumnMappings(newMappings);
    };

    // 매핑 규칙 삭제
    const handleRemoveMapping = (index) => {
        const newMappings = columnMappings.filter((_, i) => i !== index);
        setColumnMappings(newMappings);
        saveColumnMappings(newMappings);
    };

    // 매핑 규칙 저장
    const saveColumnMappings = async (mappings) => {
        const mappingsObj = {};
        mappings.forEach(m => {
            mappingsObj[m.prefix] = m.columnId;
        });

        setSaving(true);
        try {
            await updateTeam(team.teamId, {
                ...team,
                githubColumnMappings: JSON.stringify(mappingsObj)
            });
            if (onTeamUpdate) onTeamUpdate({ githubColumnMappings: JSON.stringify(mappingsObj) });
        } catch (error) {
            console.error('매핑 규칙 저장 실패:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // Tasks 일괄 내보내기
    const handleBulkExport = async () => {
        if (!window.confirm('연결되지 않은 모든 Tasks를 GitHub Issues로 내보내시겠습니까?')) return;

        setBulkSyncing(true);
        setSyncResult(null);
        try {
            const result = await bulkExportTasks(team.teamId, loginMember.no);
            setSyncResult({
                type: 'export',
                success: result.exported,
                skipped: result.skipped,
                failed: result.failed
            });
            if (result.exported > 0) {
                alert(`${result.exported}개의 Task를 내보냈습니다.`);
            } else {
                alert('내보낼 Task가 없습니다.');
            }
            fetchUnlinkedCounts();
        } catch (error) {
            console.error('일괄 내보내기 실패:', error);
            alert('일괄 내보내기에 실패했습니다: ' + (error.response?.data?.error || error.message));
        } finally {
            setBulkSyncing(false);
        }
    };

    // GitHub 연동 상태 확인
    useEffect(() => {
        const checkGitHubStatus = async () => {
            if (loginMember?.no) {
                try {
                    const status = await getGitHubStatus(loginMember.no);
                    setGithubConnected(status.connected);
                } catch (error) {
                    console.error('GitHub 상태 확인 실패:', error);
                    // 실패해도 null로 두지 않고, 나중에 실제 시도할 때 확인
                    setGithubConnected(null);
                }
            }
        };
        checkGitHubStatus();
    }, [loginMember?.no]);

    // 저장소 연결 시 연결되지 않은 항목 개수 조회
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
            console.error('팀 멤버 조회 실패:', error);
            setTeamMembers([]);
        }
    };

    // 팀 이름 저장
    const handleSaveName = async () => {
        if (!teamName.trim()) {
            alert('팀 이름을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            await updateTeam(team.teamId, { ...team, teamName: teamName.trim() });
            if (onTeamUpdate) onTeamUpdate({ teamName: teamName.trim() });
            setEditingName(false);
        } catch (error) {
            console.error('팀 이름 저장 실패:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 팀 설명 저장
    const handleSaveDescription = async () => {
        setSaving(true);
        try {
            await updateTeamDescription(team.teamId, description);
            if (onTeamUpdate) onTeamUpdate({ description });
            setEditingDesc(false);
        } catch (error) {
            console.error('팀 설명 저장 실패:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // GitHub 저장소 선택 모달 열기
    const handleOpenRepoSelector = async () => {
        setShowRepoSelector(true);
        setLoadingRepos(true);
        try {
            const repos = await listUserRepositories(loginMember.no);
            setRepositories(Array.isArray(repos) ? repos : []);
            setGithubConnected(true); // 성공하면 연동됨으로 표시
        } catch (error) {
            console.error('저장소 목록 조회 실패:', error);
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

    // 저장소 선택 및 연결
    const handleSelectRepository = async (repo) => {
        if (connectingRepo) return;

        setConnectingRepo(true);
        try {
            let webhookUrl = null;

            // 1. 먼저 백엔드 설정에서 webhook URL 가져오기 시도
            try {
                const webhookConfig = await getWebhookConfig();
                if (webhookConfig.baseUrl && !webhookConfig.baseUrl.includes('localhost') && !webhookConfig.baseUrl.includes('127.0.0.1')) {
                    webhookUrl = webhookConfig.baseUrl;
                    console.log('백엔드 설정된 webhook URL 사용:', webhookUrl);
                }
            } catch (configError) {
                console.log('Webhook 설정 조회 실패, 수동 입력으로 진행:', configError);
            }

            // 2. 백엔드에 설정이 없으면 현재 origin 또는 ngrok URL 사용
            if (!webhookUrl) {
                webhookUrl = window.location.origin;

                // localhost인 경우 사용자에게 ngrok URL 입력 요청
                if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
                    const ngrokUrl = prompt(
                        'GitHub Webhook을 받을 외부 URL을 입력해주세요.\n' +
                        '(예: https://xxxx.ngrok-free.app)\n\n' +
                        'ngrok http 8081 명령으로 실행 후 Forwarding URL을 입력하세요.\n\n' +
                        '※ 서버에 GITHUB_WEBHOOK_BASE_URL 환경변수를 설정하면 이 입력이 필요 없습니다.'
                    );
                    if (!ngrokUrl) {
                        setConnectingRepo(false);
                        return;
                    }
                    webhookUrl = ngrokUrl.replace(/\/$/, ''); // 끝의 / 제거
                }
            }

            const result = await connectRepository(
                team.teamId,
                loginMember.no,
                repo.fullName,
                webhookUrl
            );

            if (result.success) {
                const message = result.webhookCreated
                    ? '저장소가 연결되고 Webhook이 자동 등록되었습니다!'
                    : '저장소가 연결되었습니다. (Webhook 등록에 실패했습니다. 수동으로 설정해주세요.)';
                alert(message);

                setGithubRepoUrl(result.repoUrl);
                if (onTeamUpdate) onTeamUpdate({ githubRepoUrl: result.repoUrl });
                setShowRepoSelector(false);
            }
        } catch (error) {
            console.error('저장소 연결 실패:', error);
            alert('저장소 연결에 실패했습니다.\n' + (error.response?.data?.error || error.message));
        } finally {
            setConnectingRepo(false);
        }
    };

    // 기본 컬럼 변경
    const handleDefaultColumnChange = async (columnId) => {
        const newColumnId = columnId ? parseInt(columnId) : null;
        setGithubDefaultColumnId(newColumnId);

        setSaving(true);
        try {
            await updateTeam(team.teamId, {
                ...team,
                githubDefaultColumnId: newColumnId
            });
            if (onTeamUpdate) onTeamUpdate({ githubDefaultColumnId: newColumnId });
        } catch (error) {
            console.error('기본 컬럼 저장 실패:', error);
            alert('저장에 실패했습니다.');
            setGithubDefaultColumnId(team?.githubDefaultColumnId || null);
        } finally {
            setSaving(false);
        }
    };

    // 저장소 연결 해제
    const handleDisconnectRepository = async () => {
        if (!window.confirm('GitHub 저장소 연결을 해제하시겠습니까?\nIssue 동기화가 중단됩니다.')) return;

        setSaving(true);
        try {
            await disconnectRepository(team.teamId, loginMember.no);
            setGithubRepoUrl('');
            if (onTeamUpdate) onTeamUpdate({ githubRepoUrl: '' });
            alert('저장소 연결이 해제되었습니다.');
        } catch (error) {
            console.error('저장소 연결 해제 실패:', error);
            alert('연결 해제에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 초대 코드 복사
    const handleCopyCode = async () => {
        if (!team?.teamCode) return;
        try {
            await navigator.clipboard.writeText(team.teamCode);
            setCodeCopySuccess(true);
            setTimeout(() => setCodeCopySuccess(false), 2000);
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = team.teamCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCodeCopySuccess(true);
            setTimeout(() => setCodeCopySuccess(false), 2000);
        }
    };

    // 초대 URL 복사
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

    // 초대 코드 재생성
    const handleRegenerateCode = async () => {
        if (!window.confirm('새 초대 코드를 생성하시겠습니까?\n기존 코드는 더 이상 사용할 수 없습니다.')) return;

        try {
            const result = await regenerateTeamCode(team.teamId, loginMember.no);
            if (onTeamUpdate && result?.teamCode) {
                onTeamUpdate({ teamCode: result.teamCode });
            }
            alert('새 초대 코드가 생성되었습니다.');
        } catch (error) {
            console.error('초대 코드 재생성 실패:', error);
            alert('초대 코드 재생성에 실패했습니다.');
        }
    };

    // 멤버 추방
    const handleKickMember = async (memberNo, memberName) => {
        if (memberNo === loginMember.no) {
            alert('자신을 추방할 수 없습니다.');
            return;
        }
        if (memberNo === team.leaderNo) {
            alert('팀 리더를 추방할 수 없습니다.');
            return;
        }
        if (!window.confirm(`${memberName}님을 팀에서 추방하시겠습니까?`)) return;

        try {
            await kickMember(team.teamId, memberNo, loginMember.no);
            alert(`${memberName}님이 추방되었습니다.`);
            fetchTeamMembers();
        } catch (error) {
            console.error('멤버 추방 실패:', error);
            alert('멤버 추방에 실패했습니다.');
        }
    };

    // 팀 삭제
    const handleDeleteTeam = async () => {
        if (!window.confirm('정말로 이 팀을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
        if (!window.confirm('모든 프로젝트, 태스크, 파일이 삭제됩니다.\n계속하시겠습니까?')) return;

        try {
            await deleteTeam(team.teamId);
            alert('팀이 삭제되었습니다.');
            if (onTeamDelete) onTeamDelete(team.teamId);
            onClose();
        } catch (error) {
            console.error('팀 삭제 실패:', error);
            alert('팀 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="team-settings-overlay" onClick={onClose}>
            <div className="team-settings-modal" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="tsm-header">
                    <h2>팀 설정</h2>
                    <button className="tsm-close" onClick={onClose}>&times;</button>
                </div>

                {/* 탭 */}
                <div className="tsm-tabs">
                    <button
                        className={`tsm-tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        팀 정보
                    </button>
                    <button
                        className={`tsm-tab ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        팀원 ({teamMembers.length})
                    </button>
                    {isLeader && (
                        <button
                            className={`tsm-tab ${activeTab === 'danger' ? 'active' : ''}`}
                            onClick={() => setActiveTab('danger')}
                        >
                            위험 구역
                        </button>
                    )}
                </div>

                {/* 콘텐츠 */}
                <div className="tsm-content">
                    {activeTab === 'info' && (
                        <div className="tsm-section">
                            {/* 팀 이름 */}
                            <div className="tsm-field">
                                <label>팀 이름</label>
                                {isLeader && editingName ? (
                                    <div className="tsm-edit-field">
                                        <input
                                            type="text"
                                            value={teamName}
                                            onChange={(e) => setTeamName(e.target.value)}
                                            placeholder="팀 이름"
                                            autoFocus
                                        />
                                        <div className="tsm-edit-actions">
                                            <button
                                                className="tsm-btn secondary"
                                                onClick={() => {
                                                    setTeamName(team?.teamName || '');
                                                    setEditingName(false);
                                                }}
                                            >
                                                취소
                                            </button>
                                            <button
                                                className="tsm-btn primary"
                                                onClick={handleSaveName}
                                                disabled={saving}
                                            >
                                                {saving ? '저장 중...' : '저장'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="tsm-display-field">
                                        <span className="tsm-value">{team?.teamName}</span>
                                        {isLeader && (
                                            <button className="tsm-edit-btn" onClick={() => setEditingName(true)}>
                                                수정
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 팀 설명 */}
                            <div className="tsm-field">
                                <label>팀 설명</label>
                                {isLeader && editingDesc ? (
                                    <div className="tsm-edit-field">
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="팀에 대한 설명을 입력하세요..."
                                            rows={3}
                                        />
                                        <div className="tsm-edit-actions">
                                            <button
                                                className="tsm-btn secondary"
                                                onClick={() => {
                                                    setDescription(team?.description || '');
                                                    setEditingDesc(false);
                                                }}
                                            >
                                                취소
                                            </button>
                                            <button
                                                className="tsm-btn primary"
                                                onClick={handleSaveDescription}
                                                disabled={saving}
                                            >
                                                {saving ? '저장 중...' : '저장'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="tsm-display-field">
                                        <span className="tsm-value desc">
                                            {team?.description || '설명이 없습니다.'}
                                        </span>
                                        {isLeader && (
                                            <button className="tsm-edit-btn" onClick={() => setEditingDesc(true)}>
                                                수정
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* GitHub 저장소 연결 */}
                            {isLeader && (
                                <div className="tsm-field">
                                    <label>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '6px', verticalAlign: 'middle'}}>
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        GitHub 저장소
                                    </label>
                                    <div className="tsm-github-section">
                                        {githubRepoUrl ? (
                                            <div className="tsm-connected-repo">
                                                <div className="tsm-repo-info">
                                                    <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer">
                                                        {githubRepoUrl.replace('https://github.com/', '')}
                                                    </a>
                                                    <span className="tsm-sync-badge">Issue 동기화 활성화</span>
                                                </div>
                                                <div className="tsm-repo-actions">
                                                    <button
                                                        className="tsm-btn secondary small"
                                                        onClick={handleOpenRepoSelector}
                                                    >
                                                        변경
                                                    </button>
                                                    <button
                                                        className="tsm-btn danger small"
                                                        onClick={handleDisconnectRepository}
                                                        disabled={saving}
                                                    >
                                                        연결 해제
                                                    </button>
                                                </div>
                                                {/* 기본 컬럼 선택 */}
                                                <div className="tsm-default-column">
                                                    <label>Issue 생성 시 기본 컬럼</label>
                                                    <select
                                                        value={githubDefaultColumnId || ''}
                                                        onChange={(e) => handleDefaultColumnChange(e.target.value)}
                                                        disabled={saving || columns.length === 0}
                                                    >
                                                        <option value="">자동 (첫 번째 컬럼)</option>
                                                        {columns.map(col => (
                                                            <option key={col.columnId} value={col.columnId}>
                                                                {col.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="tsm-hint">
                                                        GitHub Issue가 생성되면 선택한 컬럼에 Task가 자동 생성됩니다.
                                                    </p>
                                                </div>

                                                {/* 일괄 동기화 */}
                                                <div className="tsm-bulk-sync">
                                                    <label>일괄 동기화</label>
                                                    <div className="tsm-bulk-sync-buttons">
                                                        <button
                                                            className="tsm-btn secondary"
                                                            onClick={handleBulkImport}
                                                            disabled={bulkSyncing}
                                                        >
                                                            {bulkSyncing ? '처리 중...' : `GitHub → Synodos`}
                                                            {unlinkedCounts.unlinkedIssues > 0 && (
                                                                <span className="tsm-count-badge">
                                                                    {unlinkedCounts.unlinkedIssues}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            className="tsm-btn secondary"
                                                            onClick={handleBulkExport}
                                                            disabled={bulkSyncing}
                                                        >
                                                            {bulkSyncing ? '처리 중...' : `Synodos → GitHub`}
                                                            {unlinkedCounts.unlinkedTasks > 0 && (
                                                                <span className="tsm-count-badge">
                                                                    {unlinkedCounts.unlinkedTasks}
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="tsm-hint">
                                                        연결되지 않은 기존 Issues와 Tasks를 일괄로 동기화합니다.
                                                    </p>
                                                    {syncResult && (
                                                        <div className="tsm-sync-result">
                                                            {syncResult.type === 'import' ? '가져오기' : '내보내기'} 완료:
                                                            성공 {syncResult.success}개
                                                            {syncResult.skipped > 0 && `, 건너뜀 ${syncResult.skipped}개`}
                                                            {syncResult.failed > 0 && `, 실패 ${syncResult.failed}개`}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 컬럼 매핑 규칙 */}
                                                <div className="tsm-column-mappings">
                                                    <label>Issue 제목 명령어 → 컬럼 매핑</label>
                                                    <p className="tsm-hint">
                                                        Issue 제목이 특정 명령어로 시작하면 자동으로 해당 컬럼에 Task가 생성됩니다.
                                                        <br />예: "[버그] 로그인 오류" → "버그" 컬럼
                                                    </p>

                                                    {/* 기존 매핑 규칙 목록 */}
                                                    {columnMappings.length > 0 && (
                                                        <div className="tsm-mapping-list">
                                                            {columnMappings.map((mapping, index) => {
                                                                const column = columns.find(c => c.columnId === mapping.columnId);
                                                                return (
                                                                    <div key={index} className="tsm-mapping-item">
                                                                        <span className="tsm-mapping-prefix">{mapping.prefix}</span>
                                                                        <span className="tsm-mapping-arrow">→</span>
                                                                        <span className="tsm-mapping-column">
                                                                            {column?.title || `컬럼 ID: ${mapping.columnId}`}
                                                                        </span>
                                                                        <button
                                                                            className="tsm-mapping-delete"
                                                                            onClick={() => handleRemoveMapping(index)}
                                                                            title="삭제"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* 새 매핑 규칙 추가 폼 */}
                                                    <div className="tsm-mapping-add">
                                                        <input
                                                            type="text"
                                                            placeholder="명령어 (예: [버그])"
                                                            value={newPrefix}
                                                            onChange={(e) => setNewPrefix(e.target.value)}
                                                            className="tsm-mapping-input"
                                                        />
                                                        <select
                                                            value={newColumnId}
                                                            onChange={(e) => setNewColumnId(e.target.value)}
                                                            className="tsm-mapping-select"
                                                        >
                                                            <option value="">컬럼 선택</option>
                                                            {columns.map(col => (
                                                                <option key={col.columnId} value={col.columnId}>
                                                                    {col.title}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            className="tsm-btn primary small"
                                                            onClick={handleAddMapping}
                                                            disabled={saving || !newPrefix.trim() || !newColumnId}
                                                        >
                                                            추가
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="tsm-no-repo">
                                                <p>GitHub 저장소를 연결하면 Issue가 자동으로 Task로 동기화됩니다.</p>
                                                <button
                                                    className="tsm-btn github"
                                                    onClick={handleOpenRepoSelector}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                    </svg>
                                                    GitHub 저장소 연결
                                                </button>
                                                {githubConnected === false && (
                                                    <p className="tsm-hint warning">
                                                        먼저 마이페이지에서 GitHub 계정을 연동해주세요.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 초대 링크 */}
                            {isLeader && (
                                <div className="tsm-field">
                                    <label>초대 링크</label>
                                    <div className="tsm-code-section">
                                        <div className="tsm-invite-url">
                                            <input
                                                type="text"
                                                value={getInviteUrl()}
                                                readOnly
                                                className="tsm-url-input"
                                            />
                                            <button
                                                className="tsm-code-btn primary"
                                                onClick={handleCopyUrl}
                                            >
                                                {urlCopySuccess ? '복사됨!' : '링크 복사'}
                                            </button>
                                        </div>
                                        <p className="tsm-hint">
                                            이 링크를 공유하여 다른 사람을 팀에 초대할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 초대 코드 */}
                            {isLeader && (
                                <div className="tsm-field">
                                    <label>초대 코드</label>
                                    <div className="tsm-code-section">
                                        <div className="tsm-code-display">
                                            <span className="tsm-code">
                                                {showTeamCode ? team?.teamCode : '••••••••'}
                                            </span>
                                            <button
                                                className="tsm-code-btn"
                                                onClick={() => setShowTeamCode(!showTeamCode)}
                                            >
                                                {showTeamCode ? '숨기기' : '보기'}
                                            </button>
                                            <button
                                                className="tsm-code-btn primary"
                                                onClick={handleCopyCode}
                                            >
                                                {codeCopySuccess ? '복사됨!' : '복사'}
                                            </button>
                                        </div>
                                        <button
                                            className="tsm-btn secondary small"
                                            onClick={handleRegenerateCode}
                                        >
                                            새 코드 생성
                                        </button>
                                        <p className="tsm-hint">
                                            링크 대신 코드로 직접 초대할 수도 있습니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="tsm-section">
                            <div className="tsm-members-list">
                                {teamMembers.map(member => (
                                    <div key={member.memberNo} className="tsm-member-item">
                                        <div className="tsm-member-avatar">
                                            {member.memberName?.charAt(0) || '?'}
                                        </div>
                                        <div className="tsm-member-info">
                                            <span className="tsm-member-name">{member.memberName}</span>
                                            <span className="tsm-member-userid">@{member.memberUserid}</span>
                                        </div>
                                        {member.memberNo === team?.leaderNo ? (
                                            <span className="tsm-role-badge leader">리더</span>
                                        ) : (
                                            <>
                                                <span className="tsm-role-badge member">멤버</span>
                                                {isLeader && (
                                                    <button
                                                        className="tsm-kick-btn"
                                                        onClick={() => handleKickMember(member.memberNo, member.memberName)}
                                                    >
                                                        추방
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'danger' && isLeader && (
                        <div className="tsm-section">
                            <div className="tsm-danger-zone">
                                <div className="tsm-danger-icon">⚠️</div>
                                <h3>팀 삭제</h3>
                                <p>
                                    팀을 삭제하면 모든 프로젝트, 태스크, 파일이 영구적으로 삭제됩니다.
                                    이 작업은 되돌릴 수 없습니다.
                                </p>
                                <button className="tsm-btn danger" onClick={handleDeleteTeam}>
                                    팀 삭제
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 저장소 선택 모달 */}
                {showRepoSelector && (
                    <div className="tsm-repo-selector-overlay" onClick={() => setShowRepoSelector(false)}>
                        <div className="tsm-repo-selector" onClick={e => e.stopPropagation()}>
                            <div className="tsm-repo-selector-header">
                                <h3>GitHub 저장소 선택</h3>
                                <button className="tsm-close" onClick={() => setShowRepoSelector(false)}>&times;</button>
                            </div>
                            <div className="tsm-repo-list">
                                {loadingRepos ? (
                                    <div className="tsm-loading">저장소 목록을 불러오는 중...</div>
                                ) : repositories.length === 0 ? (
                                    <div className="tsm-empty">
                                        저장소가 없습니다.<br />
                                        GitHub에서 저장소를 먼저 생성해주세요.
                                    </div>
                                ) : (
                                    repositories.map(repo => (
                                        <div
                                            key={repo.id}
                                            className={`tsm-repo-item ${connectingRepo ? 'disabled' : ''}`}
                                            onClick={() => handleSelectRepository(repo)}
                                        >
                                            <div className="tsm-repo-item-info">
                                                <span className="tsm-repo-name">{repo.fullName}</span>
                                                {repo.description && (
                                                    <span className="tsm-repo-desc">{repo.description}</span>
                                                )}
                                            </div>
                                            <div className="tsm-repo-item-meta">
                                                {repo.privateRepo && (
                                                    <span className="tsm-private-badge">Private</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TeamSettingsModal;
