import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMyTeams, createTeam, joinTeam, deleteTeam, leaveTeam, getTeamMembers, kickMember, inviteMember } from '../api/teamApi';
import { searchMember } from '../api/memberApi';
import GitRepoSettings from './GitRepoSettings';
import './Sidebar.css';

function Sidebar({ isOpen, onToggle, currentTeam, onSelectTeam, loginMember }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [teams, setTeams] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showMembersSection, setShowMembersSection] = useState(true);
    const [newTeamName, setNewTeamName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [showGitSettings, setShowGitSettings] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteKeyword, setInviteKeyword] = useState('');
    const [searchedMember, setSearchedMember] = useState(null);
    const [inviteError, setInviteError] = useState('');

    useEffect(() => {
        if (loginMember) {
            fetchTeams();
        }
    }, [loginMember]);

    // 현재 팀이 변경되면 팀원 목록 가져오기
    useEffect(() => {
        if (currentTeam?.teamId) {
            fetchTeamMembers();
        } else {
            setTeamMembers([]);
        }
    }, [currentTeam]);

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(currentTeam.teamId);
            setTeamMembers(members || []);
        } catch (error) {
            console.error('팀원 목록 조회 실패:', error);
            setTeamMembers([]);
        }
    };

    const fetchTeams = async () => {
        try {
            const data = await getMyTeams(loginMember.no);
            setTeams(data || []);
            if (!currentTeam && data && data.length > 0) {
                onSelectTeam(data[0]);
            }
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
                setError('');
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
                setError('');
                fetchTeams();
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('팀 가입 실패:', error);
            setError('팀 가입에 실패했습니다.');
        }
    };

    const handleLeaveTeam = async (team, e) => {
        e.stopPropagation();
        if (team.leaderNo === loginMember.no) {
            if (!window.confirm('팀장이 탈퇴하면 팀이 삭제됩니다. 정말 삭제하시겠습니까?')) return;
            try {
                await deleteTeam(team.teamId);
                alert('팀이 삭제되었습니다.');
                const updatedTeams = teams.filter(t => t.teamId !== team.teamId);
                setTeams(updatedTeams);
                if (currentTeam?.teamId === team.teamId) {
                    onSelectTeam(updatedTeams[0] || null);
                }
            } catch (error) {
                console.error('팀 삭제 실패:', error);
            }
        } else {
            if (!window.confirm('정말 팀에서 탈퇴하시겠습니까?')) return;
            try {
                await leaveTeam(team.teamId, loginMember.no);
                alert('팀에서 탈퇴했습니다.');
                const updatedTeams = teams.filter(t => t.teamId !== team.teamId);
                setTeams(updatedTeams);
                if (currentTeam?.teamId === team.teamId) {
                    onSelectTeam(updatedTeams[0] || null);
                }
            } catch (error) {
                console.error('팀 탈퇴 실패:', error);
            }
        }
    };

    // 회원 검색 (팀 초대용)
    const handleSearchMember = async () => {
        if (!inviteKeyword.trim()) {
            setInviteError('아이디 또는 이메일을 입력해주세요.');
            return;
        }
        setInviteError('');
        setSearchedMember(null);
        try {
            const result = await searchMember(inviteKeyword.trim());
            if (result.success) {
                setSearchedMember(result.member);
            } else {
                setInviteError(result.message);
            }
        } catch (error) {
            console.error('회원 검색 실패:', error);
            setInviteError('회원 검색에 실패했습니다.');
        }
    };

    // 팀원 초대
    const handleInviteMember = async () => {
        if (!searchedMember) return;
        try {
            const result = await inviteMember(currentTeam.teamId, searchedMember.no, loginMember.no);
            if (result.success) {
                alert(`${searchedMember.name}님이 팀에 초대되었습니다.`);
                setShowInviteModal(false);
                setInviteKeyword('');
                setSearchedMember(null);
                setInviteError('');
                fetchTeamMembers();
            } else {
                setInviteError(result.message);
            }
        } catch (error) {
            console.error('팀원 초대 실패:', error);
            setInviteError('팀원 초대에 실패했습니다.');
        }
    };

    // 팀원 강퇴
    const handleKickMember = async (memberNo, memberName) => {
        if (!window.confirm(`${memberName}님을 팀에서 강퇴하시겠습니까?`)) return;
        try {
            const result = await kickMember(currentTeam.teamId, memberNo, loginMember.no);
            if (result.success) {
                alert('팀원이 강퇴되었습니다.');
                fetchTeamMembers();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('팀원 강퇴 실패:', error);
            alert('팀원 강퇴에 실패했습니다.');
        }
    };

    return (
        <>
            {/* 펼친 사이드바 */}
            {isOpen ? (
                <div className="sidebar open">
                    <div className="sidebar-expanded">
                        {/* 상단 헤더 */}
                        <div className="sidebar-header">
                            <span className="sidebar-logo">Flowtask</span>
                            <button className="sidebar-collapse-btn" onClick={onToggle} title="사이드바 접기">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <line x1="9" y1="3" x2="9" y2="21" />
                                </svg>
                            </button>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="sidebar-actions">
                            <button className="action-btn primary" onClick={() => setShowCreateModal(true)} title="팀 생성">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                            <button className="action-btn" onClick={() => setShowJoinModal(true)} title="팀 코드로 가입">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" />
                                    <line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                            </button>
                        </div>

                        {/* 네비게이션 메뉴 */}
                        <div className="sidebar-nav">
                            <div
                                className={`nav-item ${location.pathname === '/board' ? 'active' : ''}`}
                                onClick={() => navigate('/board')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="9" />
                                    <rect x="14" y="3" width="7" height="5" />
                                    <rect x="14" y="12" width="7" height="9" />
                                    <rect x="3" y="16" width="7" height="5" />
                                </svg>
                                <span>보드</span>
                            </div>
                            <div
                                className={`nav-item ${location.pathname === '/calendar' ? 'active' : ''}`}
                                onClick={() => navigate('/calendar')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>캘린더</span>
                            </div>
                            {currentTeam && (
                            <div
                                className="nav-item"
                                onClick={() => setShowGitSettings(true)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <line x1="12" y1="3" x2="12" y2="9" />
                                    <line x1="12" y1="15" x2="12" y2="21" />
                                    <line x1="3" y1="12" x2="9" y2="12" />
                                    <line x1="15" y1="12" x2="21" y2="12" />
                                    <line x1="5.6" y1="5.6" x2="9.2" y2="9.2" />
                                    <line x1="14.8" y1="14.8" x2="18.4" y2="18.4" />
                                    <line x1="5.6" y1="18.4" x2="9.2" y2="14.8" />
                                    <line x1="14.8" y1="9.2" x2="18.4" y2="5.6" />
                                </svg>
                                <span>Git 연동</span>
                            </div>
                            )}
                        </div>

                        {/* 팀원 섹션 */}
                        <div className="sidebar-menu">
                            <div className="menu-item-header">
                                <div
                                    className={`menu-item ${showMembersSection ? 'active' : ''}`}
                                    onClick={() => setShowMembersSection(!showMembersSection)}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    <span>팀원 {currentTeam && `(${teamMembers.length})`}</span>
                                </div>
                                <div className="invite-btn-wrapper">
                                    {currentTeam && currentTeam.leaderNo === loginMember?.no && (
                                        <button
                                            className="invite-btn"
                                            onClick={() => setShowInviteModal(true)}
                                            title="팀원 초대"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            </div>
                            {showMembersSection && currentTeam && (
                                <ul className="members-list menu-members">
                                    {[...teamMembers].sort((a, b) => {
                                        if (a.role === 'LEADER') return -1;
                                        if (b.role === 'LEADER') return 1;
                                        return 0;
                                    }).map(member => (
                                        <li key={member.memberNo} className="member-item">
                                            <div className={`member-avatar ${member.role === 'LEADER' ? 'leader' : ''}`}>
                                                {member.memberName?.charAt(0) || 'U'}
                                            </div>
                                            <div className="member-info">
                                                <span className="member-name">
                                                    {member.memberName}
                                                    {member.role === 'LEADER' && ' ★'}
                                                </span>
                                                <span className="member-role">
                                                    {member.role === 'LEADER' ? '팀장' : '멤버'}
                                                </span>
                                            </div>
                                            {currentTeam.leaderNo === loginMember?.no &&
                                             member.memberNo !== loginMember?.no && (
                                                <button
                                                    className="kick-btn"
                                                    onClick={() => handleKickMember(member.memberNo, member.memberName)}
                                                    title="강퇴"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                    {teamMembers.length === 0 && (
                                        <p className="no-members">팀원이 없습니다</p>
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* 팀 목록 */}
                        <div className="sidebar-section">
                            <div className="section-title">내 팀</div>
                            <ul className="team-list">
                                {teams.map(team => (
                                    <li
                                        key={team.teamId}
                                        className={`team-item ${currentTeam?.teamId === team.teamId ? 'active' : ''}`}
                                        onClick={() => onSelectTeam(team)}
                                    >
                                        <span className="team-name">{team.teamName}</span>
                                        <button
                                            className="team-delete-btn"
                                            onClick={(e) => handleLeaveTeam(team, e)}
                                            title={team.leaderNo === loginMember?.no ? '팀 삭제' : '팀 탈퇴'}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {teams.length === 0 && (
                                <p className="no-teams">팀이 없습니다</p>
                            )}
                        </div>

                        {/* 하단 사용자 정보 */}
                        <div className="sidebar-footer" onClick={() => navigate('/mypage')} style={{ cursor: 'pointer' }}>
                            <div className="user-avatar">
                                {loginMember?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{loginMember?.name || '사용자'}</span>
                                <span className="user-id">{loginMember?.userid || ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="sidebar-collapsed">
                    <button className="icon-btn" onClick={onToggle} title="사이드바 펼치기">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </button>
                    <button className="icon-btn primary" onClick={() => setShowCreateModal(true)} title="팀 생성">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => setShowJoinModal(true)} title="팀 코드로 가입">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                    </button>
                    <button className="icon-btn" title="팀 목록">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </button>
                    <div className="collapsed-spacer"></div>
                    <div className="user-avatar-small">
                        {loginMember?.name?.charAt(0) || 'U'}
                    </div>
                </div>
            )}

            {/* 팀 생성 모달 */}
            {showCreateModal && (
                <div className="sidebar-modal-overlay" onClick={() => { setShowCreateModal(false); setError(''); }}>
                    <div className="sidebar-modal" onClick={e => e.stopPropagation()}>
                        <h3>새 팀 생성</h3>
                        <div className="modal-form-group">
                            <label>팀 이름</label>
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={e => { setNewTeamName(e.target.value); setError(''); }}
                                placeholder="팀 이름을 입력하세요"
                                onKeyPress={e => e.key === 'Enter' && handleCreateTeam()}
                                autoFocus
                            />
                        </div>
                        {error && <p className="modal-error">{error}</p>}
                        <div className="modal-buttons">
                            <button className="modal-btn" onClick={() => { setShowCreateModal(false); setError(''); setNewTeamName(''); }}>취소</button>
                            <button className="modal-btn primary" onClick={handleCreateTeam}>생성</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 팀 가입 모달 */}
            {showJoinModal && (
                <div className="sidebar-modal-overlay" onClick={() => { setShowJoinModal(false); setError(''); }}>
                    <div className="sidebar-modal" onClick={e => e.stopPropagation()}>
                        <h3>팀 코드로 가입</h3>
                        <div className="modal-form-group">
                            <label>팀 코드</label>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={e => { setJoinCode(e.target.value); setError(''); }}
                                placeholder="팀 코드를 입력하세요"
                                maxLength={8}
                                style={{ textTransform: 'uppercase' }}
                                onKeyPress={e => e.key === 'Enter' && handleJoinTeam()}
                                autoFocus
                            />
                        </div>
                        {error && <p className="modal-error">{error}</p>}
                        <div className="modal-buttons">
                            <button className="modal-btn" onClick={() => { setShowJoinModal(false); setError(''); setJoinCode(''); }}>취소</button>
                            <button className="modal-btn primary" onClick={handleJoinTeam}>가입</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Git 설정 모달 */}
            {showGitSettings && currentTeam && (
                <GitRepoSettings
                    teamId={currentTeam.teamId}
                    onClose={() => setShowGitSettings(false)}
                />
            )}

            {/* 팀원 초대 모달 */}
            {showInviteModal && (
                <div className="sidebar-modal-overlay" onClick={() => { setShowInviteModal(false); setInviteError(''); setSearchedMember(null); setInviteKeyword(''); }}>
                    <div className="sidebar-modal" onClick={e => e.stopPropagation()}>
                        <h3>팀원 초대</h3>
                        <div className="modal-form-group">
                            <label>아이디 또는 이메일</label>
                            <div className="search-input-row">
                                <input
                                    type="text"
                                    value={inviteKeyword}
                                    onChange={e => { setInviteKeyword(e.target.value); setInviteError(''); setSearchedMember(null); }}
                                    placeholder="초대할 회원의 아이디 또는 이메일"
                                    onKeyPress={e => e.key === 'Enter' && handleSearchMember()}
                                    autoFocus
                                />
                                <button className="search-btn" onClick={handleSearchMember}>검색</button>
                            </div>
                        </div>
                        {inviteError && <p className="modal-error">{inviteError}</p>}
                        {searchedMember && (
                            <div className="searched-member">
                                <div className="searched-member-info">
                                    <div className="searched-avatar">{searchedMember.name?.charAt(0) || 'U'}</div>
                                    <div className="searched-details">
                                        <span className="searched-name">{searchedMember.name}</span>
                                        <span className="searched-userid">@{searchedMember.userid}</span>
                                    </div>
                                </div>
                                <button className="modal-btn primary" onClick={handleInviteMember}>초대</button>
                            </div>
                        )}
                        <div className="modal-buttons">
                            <button className="modal-btn" onClick={() => { setShowInviteModal(false); setInviteError(''); setSearchedMember(null); setInviteKeyword(''); }}>취소</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;
