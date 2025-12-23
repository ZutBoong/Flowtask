import React, { useState, useEffect } from 'react';
import {
    updateTeam, updateTeamDescription, regenerateTeamCode,
    kickMember, deleteTeam, getTeamMembers
} from '../api/teamApi';
import './TeamSettingsModal.css';

function TeamSettingsModal({ team, loginMember, onClose, onTeamUpdate, onTeamDelete }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [activeTab, setActiveTab] = useState('info');
    const [editingName, setEditingName] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [description, setDescription] = useState(team?.description || '');
    const [showTeamCode, setShowTeamCode] = useState(false);
    const [codeCopySuccess, setCodeCopySuccess] = useState(false);
    const [urlCopySuccess, setUrlCopySuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    // 초대 URL 생성
    const getInviteUrl = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/invite/${team?.teamCode}`;
    };

    const isLeader = team?.leaderNo === loginMember?.no;

    useEffect(() => {
        if (team?.teamId) {
            fetchTeamMembers();
        }
    }, [team?.teamId]);

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(team.teamId);
            setTeamMembers(members || []);
        } catch (error) {
            console.error('팀 멤버 조회 실패:', error);
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
            </div>
        </div>
    );
}

export default TeamSettingsModal;
