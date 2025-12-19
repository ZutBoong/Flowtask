import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMyTeams, deleteTeam, leaveTeam } from '../api/teamApi';
import TeamSettingsModal from './TeamSettingsModal';
import './Sidebar.css';

function Sidebar({ isOpen, onToggle, currentTeam, onSelectTeam, loginMember }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [teams, setTeams] = useState([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [settingsTeam, setSettingsTeam] = useState(null);
    const userMenuRef = useRef(null);

    // 사용자 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    useEffect(() => {
        if (loginMember) {
            fetchTeams();
        }
    }, [loginMember]);

    const fetchTeams = async () => {
        try {
            const data = await getMyTeams(loginMember.no);
            setTeams(data || []);
            // 현재 팀 페이지가 아닐 때만 첫 번째 팀 선택
            if (!currentTeam && data && data.length > 0 && !location.pathname.startsWith('/team/')) {
                onSelectTeam(data[0]);
            }
        } catch (error) {
            console.error('팀 목록 조회 실패:', error);
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

                        {/* 홈 버튼 */}
                        <div className="sidebar-home">
                            <button className="home-btn" onClick={() => navigate('/activity')} title="내 활동">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                <span>홈</span>
                            </button>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="sidebar-actions">
                            <button className="action-btn primary" onClick={() => navigate('/create-team')} title="팀 생성">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                        </div>

                        {/* 팀 목록 */}
                        <div className="sidebar-section">
                            <div className="section-title">내 팀</div>
                            <ul className="team-list">
                                {teams.map(team => (
                                    <li
                                        key={team.teamId}
                                        className={`team-item ${currentTeam?.teamId === team.teamId && location.pathname.startsWith('/team/') ? 'active' : ''}`}
                                        onClick={() => {
                                            onSelectTeam(team);
                                            navigate(`/team/${team.teamId}?view=overview`);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setSettingsTeam(team);
                                        }}
                                    >
                                        <span className="team-name">{team.teamName}</span>
                                        <button
                                            className="team-settings-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSettingsTeam(team);
                                            }}
                                            title="팀 설정"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {teams.length === 0 && (
                                <p className="no-teams">팀이 없습니다</p>
                            )}
                        </div>

                        {/* 하단 사용자 정보 */}
                        <div className="sidebar-footer-wrapper" ref={userMenuRef}>
                            <div className="sidebar-footer" onClick={() => setShowUserMenu(!showUserMenu)} style={{ cursor: 'pointer' }}>
                                <div className="user-avatar">
                                    {loginMember?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="user-info">
                                    <span className="user-name">{loginMember?.name || '사용자'}</span>
                                    <span className="user-id">{loginMember?.userid || ''}</span>
                                </div>
                                <svg className="user-menu-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                            {showUserMenu && (
                                <div className="user-menu-popup">
                                    <div className="user-menu-item" onClick={() => { navigate('/mypage'); setShowUserMenu(false); }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        <span>마이페이지</span>
                                    </div>
                                    <div className="user-menu-item" onClick={() => { navigate('/activity'); setShowUserMenu(false); }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                        </svg>
                                        <span>내 활동</span>
                                    </div>
                                </div>
                            )}
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
                    <button className="icon-btn" onClick={() => navigate('/activity')} title="홈 (내 활동)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </button>
                    <button className="icon-btn primary" onClick={() => navigate('/create-team')} title="팀 생성">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
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
                    <div className="collapsed-footer-wrapper" ref={userMenuRef}>
                        <div className="user-avatar-small" onClick={() => setShowUserMenu(!showUserMenu)} style={{ cursor: 'pointer' }}>
                            {loginMember?.name?.charAt(0) || 'U'}
                        </div>
                        {showUserMenu && (
                            <div className="user-menu-popup collapsed">
                                <div className="user-menu-item" onClick={() => { navigate('/mypage'); setShowUserMenu(false); }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span>마이페이지</span>
                                </div>
                                <div className="user-menu-item" onClick={() => { navigate('/activity'); setShowUserMenu(false); }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                    <span>내 활동</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 팀 설정 모달 */}
            {settingsTeam && (
                <TeamSettingsModal
                    team={settingsTeam}
                    loginMember={loginMember}
                    onClose={() => setSettingsTeam(null)}
                    onTeamUpdate={(updates) => {
                        setTeams(prev => prev.map(t =>
                            t.teamId === settingsTeam.teamId ? { ...t, ...updates } : t
                        ));
                        setSettingsTeam(prev => ({ ...prev, ...updates }));
                        if (currentTeam?.teamId === settingsTeam.teamId) {
                            onSelectTeam({ ...currentTeam, ...updates });
                        }
                    }}
                    onTeamDelete={(teamId) => {
                        const updatedTeams = teams.filter(t => t.teamId !== teamId);
                        setTeams(updatedTeams);
                        if (currentTeam?.teamId === teamId) {
                            onSelectTeam(updatedTeams[0] || null);
                            navigate('/');
                        }
                    }}
                />
            )}

        </>
    );
}

export default Sidebar;
