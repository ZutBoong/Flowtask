import React, { useState } from 'react';
import {
    updateTeam, updateTeamDescription, regenerateTeamCode,
    kickMember, deleteTeam
} from '../../api/teamApi';
import './AdminView.css';

function AdminView({ team, teamMembers, loginMember, isLeader, updateTeam: updateTeamProp }) {
    const [editingName, setEditingName] = useState(false);
    const [editingDesc, setEditingDesc] = useState(false);
    const [teamName, setTeamName] = useState(team?.teamName || '');
    const [description, setDescription] = useState(team?.description || '');
    const [showTeamCode, setShowTeamCode] = useState(false);
    const [codeCopySuccess, setCodeCopySuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    // 팀 이름 저장
    const handleSaveName = async () => {
        if (!teamName.trim()) {
            alert('팀 이름을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            await updateTeam(team.teamId, { ...team, teamName: teamName.trim() });
            if (updateTeamProp) updateTeamProp({ teamName: teamName.trim() });
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
            if (updateTeamProp) updateTeamProp({ description });
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

    // 초대 코드 재생성
    const handleRegenerateCode = async () => {
        if (!window.confirm('새 초대 코드를 생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다.')) return;

        try {
            const result = await regenerateTeamCode(team.teamId, loginMember.no);
            if (updateTeamProp && result?.teamCode) {
                updateTeamProp({ teamCode: result.teamCode });
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
            window.location.reload();
        } catch (error) {
            console.error('멤버 추방 실패:', error);
            alert('멤버 추방에 실패했습니다.');
        }
    };

    // 팀 삭제
    const handleDeleteTeam = async () => {
        if (!window.confirm('정말로 이 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        if (!window.confirm('모든 프로젝트, 태스크, 파일이 삭제됩니다. 계속하시겠습니까?')) return;

        try {
            await deleteTeam(team.teamId);
            alert('팀이 삭제되었습니다.');
            localStorage.removeItem('currentTeam');
            window.location.href = '/';
        } catch (error) {
            console.error('팀 삭제 실패:', error);
            alert('팀 삭제에 실패했습니다.');
        }
    };

    if (!isLeader) {
        return (
            <div className="admin-view">
                <div className="no-permission">
                    <h2>권한이 없습니다</h2>
                    <p>관리자 설정은 팀 리더만 접근할 수 있습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-view">
            {/* 팀 정보 섹션 */}
            <div className="admin-section">
                <h2>팀 정보</h2>

                {/* 팀 이름 */}
                <div className="admin-field">
                    <label>팀 이름</label>
                    {editingName ? (
                        <div className="edit-field">
                            <input
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="팀 이름"
                            />
                            <div className="edit-actions">
                                <button
                                    className="cancel-btn"
                                    onClick={() => {
                                        setTeamName(team?.teamName || '');
                                        setEditingName(false);
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    className="save-btn"
                                    onClick={handleSaveName}
                                    disabled={saving}
                                >
                                    {saving ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="display-field">
                            <span className="value">{team?.teamName}</span>
                            <button className="edit-btn" onClick={() => setEditingName(true)}>수정</button>
                        </div>
                    )}
                </div>

                {/* 팀 설명 */}
                <div className="admin-field">
                    <label>팀 설명</label>
                    {editingDesc ? (
                        <div className="edit-field">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="팀에 대한 설명을 입력하세요..."
                                rows={4}
                            />
                            <div className="edit-actions">
                                <button
                                    className="cancel-btn"
                                    onClick={() => {
                                        setDescription(team?.description || '');
                                        setEditingDesc(false);
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
                        <div className="display-field">
                            <span className="value description">
                                {team?.description || '설명이 없습니다.'}
                            </span>
                            <button className="edit-btn" onClick={() => setEditingDesc(true)}>수정</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 초대 코드 섹션 */}
            <div className="admin-section">
                <h2>초대 코드</h2>
                <div className="invite-code-section">
                    <div className="code-display">
                        <span className="code">
                            {showTeamCode ? team?.teamCode : '••••••••'}
                        </span>
                        <button
                            className="toggle-btn"
                            onClick={() => setShowTeamCode(!showTeamCode)}
                        >
                            {showTeamCode ? '숨기기' : '보기'}
                        </button>
                        <button
                            className="copy-btn"
                            onClick={handleCopyCode}
                        >
                            {codeCopySuccess ? '복사됨!' : '복사'}
                        </button>
                    </div>
                    <button className="regenerate-btn" onClick={handleRegenerateCode}>
                        새 코드 생성
                    </button>
                    <p className="hint">
                        이 코드를 공유하여 다른 사람을 팀에 초대할 수 있습니다.
                    </p>
                </div>
            </div>

            {/* 팀원 관리 섹션 */}
            <div className="admin-section">
                <h2>팀원 관리</h2>
                <div className="members-list">
                    {teamMembers.map(member => (
                        <div key={member.memberNo} className="member-item">
                            <div className="member-avatar">
                                {member.memberName?.charAt(0) || '?'}
                            </div>
                            <div className="member-info">
                                <span className="member-name">{member.memberName}</span>
                                <span className="member-userid">@{member.memberUserid}</span>
                            </div>
                            <div className="member-role">
                                {member.memberNo === team?.leaderNo ? (
                                    <span className="role-badge leader">리더</span>
                                ) : (
                                    <span className="role-badge member">멤버</span>
                                )}
                            </div>
                            {member.memberNo !== team?.leaderNo && (
                                <button
                                    className="kick-btn"
                                    onClick={() => handleKickMember(member.memberNo, member.memberName)}
                                >
                                    추방
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 위험 구역 */}
            <div className="admin-section danger-zone">
                <h2>위험 구역</h2>
                <div className="danger-content">
                    <div className="danger-info">
                        <h3>팀 삭제</h3>
                        <p>
                            팀을 삭제하면 모든 프로젝트, 태스크, 파일이 영구적으로 삭제됩니다.
                            이 작업은 되돌릴 수 없습니다.
                        </p>
                    </div>
                    <button className="delete-team-btn" onClick={handleDeleteTeam}>
                        팀 삭제
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminView;
