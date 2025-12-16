import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams, createTeam, joinTeam, deleteTeam, leaveTeam, getTeamMembers, kickMember } from '../api/teamApi';
import './TeamList.css';

function TeamList() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [loginMember, setLoginMember] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const member = localStorage.getItem('member');
        if (!token || !member) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        setLoginMember(JSON.parse(member));
    }, [navigate]);

    useEffect(() => {
        if (loginMember) {
            fetchTeams();
        }
    }, [loginMember]);

    const fetchTeams = async () => {
        try {
            const data = await getMyTeams(loginMember.no);
            setTeams(data || []);
        } catch (error) {
            console.error('팀 목록 조회 실패:', error);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            setError('팀 이름을 입력해주세요.');
            return;
        }
        try {
            const result = await createTeam({
                teamName: newTeamName,
                leaderNo: loginMember.no
            });
            if (result.success) {
                alert(`팀이 생성되었습니다!\n팀 코드: ${result.teamCode}`);
                setShowCreateModal(false);
                setNewTeamName('');
                fetchTeams();
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('팀 생성 실패:', error);
            setError('팀 생성에 실패했습니다.');
        }
    };

    const handleJoinTeam = async () => {
        if (!joinCode.trim()) {
            setError('팀 코드를 입력해주세요.');
            return;
        }
        try {
            const result = await joinTeam(joinCode.toUpperCase(), loginMember.no);
            if (result.success) {
                alert('팀에 가입되었습니다!');
                setShowJoinModal(false);
                setJoinCode('');
                fetchTeams();
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('팀 가입 실패:', error);
            setError('팀 가입에 실패했습니다.');
        }
    };

    const handleLeaveTeam = async (team) => {
        if (team.leaderNo === loginMember.no) {
            if (!window.confirm('팀장이 탈퇴하면 팀이 삭제됩니다. 정말 삭제하시겠습니까?')) return;
            try {
                await deleteTeam(team.teamId);
                alert('팀이 삭제되었습니다.');
                fetchTeams();
            } catch (error) {
                console.error('팀 삭제 실패:', error);
            }
        } else {
            if (!window.confirm('정말 팀에서 탈퇴하시겠습니까?')) return;
            try {
                await leaveTeam(team.teamId, loginMember.no);
                alert('팀에서 탈퇴했습니다.');
                fetchTeams();
            } catch (error) {
                console.error('팀 탈퇴 실패:', error);
            }
        }
    };

    const handleSelectTeam = (team) => {
        localStorage.setItem('currentTeam', JSON.stringify(team));
        navigate('/board');
    };

    // 팀 관리 모달 열기
    const handleManageTeam = async (team, e) => {
        e.stopPropagation();
        setSelectedTeam(team);
        setCopySuccess(false);
        try {
            const members = await getTeamMembers(team.teamId);
            setTeamMembers(members || []);
            setShowManageModal(true);
        } catch (error) {
            console.error('팀원 목록 조회 실패:', error);
        }
    };

    // 팀 코드 복사
    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(selectedTeam.teamCode);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('복사 실패:', error);
            // fallback
            const textArea = document.createElement('textarea');
            textArea.value = selectedTeam.teamCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    // 팀원 강퇴
    const handleKickMember = async (memberNo, memberName) => {
        if (!window.confirm(`${memberName}님을 팀에서 강퇴하시겠습니까?`)) return;
        try {
            const result = await kickMember(selectedTeam.teamId, memberNo, loginMember.no);
            if (result.success) {
                alert('팀원이 강퇴되었습니다.');
                const members = await getTeamMembers(selectedTeam.teamId);
                setTeamMembers(members || []);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('팀원 강퇴 실패:', error);
            alert('팀원 강퇴에 실패했습니다.');
        }
    };

    return (
        <div className="team-list-container">
            <div className="team-list-header">
                <h2>내 팀 목록</h2>
                <div className="team-actions">
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        + 팀 생성
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>
                        팀 코드로 가입
                    </button>
                </div>
            </div>

            {teams.length === 0 ? (
                <div className="no-teams">
                    <p>아직 가입된 팀이 없습니다.</p>
                    <p>새 팀을 생성하거나 팀 코드로 가입하세요.</p>
                </div>
            ) : (
                <div className="teams-grid">
                    {teams.map(team => (
                        <div key={team.teamId} className="team-card" onClick={() => handleSelectTeam(team)}>
                            <h3>{team.teamName}</h3>
                            <p className="team-code">코드: {team.teamCode}</p>
                            <p className="team-leader">팀장: {team.leaderName}</p>
                            <div className="team-card-actions" onClick={e => e.stopPropagation()}>
                                <button
                                    className="btn btn-info btn-small"
                                    onClick={(e) => handleManageTeam(team, e)}
                                >
                                    관리
                                </button>
                                <button
                                    className="btn btn-danger btn-small"
                                    onClick={() => handleLeaveTeam(team)}
                                >
                                    {team.leaderNo === loginMember?.no ? '팀 삭제' : '탈퇴'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 팀 생성 모달 */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>새 팀 생성</h3>
                        <div className="form-group">
                            <label>팀 이름</label>
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={e => { setNewTeamName(e.target.value); setError(''); }}
                                placeholder="팀 이름을 입력하세요"
                            />
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleCreateTeam}>생성</button>
                            <button className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setError(''); }}>취소</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 팀 가입 모달 */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>팀 코드로 가입</h3>
                        <div className="form-group">
                            <label>팀 코드</label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={e => { setJoinCode(e.target.value); setError(''); }}
                                placeholder="팀 코드를 입력하세요"
                                maxLength={8}
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleJoinTeam}>가입</button>
                            <button className="btn btn-secondary" onClick={() => { setShowJoinModal(false); setError(''); }}>취소</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 팀 관리 모달 */}
            {showManageModal && selectedTeam && (
                <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
                    <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                        <h3>{selectedTeam.teamName} 관리</h3>

                        {/* 팀 초대 코드 */}
                        <div className="invite-section">
                            <label>팀 초대 코드</label>
                            <div className="invite-code-box">
                                <span className="invite-code">{selectedTeam.teamCode}</span>
                                <button className="btn btn-copy" onClick={handleCopyCode}>
                                    {copySuccess ? '복사됨!' : '복사'}
                                </button>
                            </div>
                            <p className="invite-hint">이 코드를 공유하여 팀원을 초대하세요.</p>
                        </div>

                        {/* 팀원 목록 */}
                        <div className="members-section">
                            <label>팀원 목록 ({teamMembers.length}명)</label>
                            <div className="members-list">
                                {teamMembers.map(member => (
                                    <div key={member.memberNo} className="member-item">
                                        <div className="member-info">
                                            <span className="member-name">{member.memberName}</span>
                                            <span className="member-userid">@{member.memberUserid}</span>
                                            {member.role === 'LEADER' && (
                                                <span className="member-badge leader">리더</span>
                                            )}
                                        </div>
                                        {selectedTeam.leaderNo === loginMember?.no &&
                                         member.memberNo !== loginMember?.no && (
                                            <button
                                                className="btn btn-danger btn-small"
                                                onClick={() => handleKickMember(member.memberNo, member.memberName)}
                                            >
                                                강퇴
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowManageModal(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamList;
