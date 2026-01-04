import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTeam } from '../api/teamApi';
import { getAllMembers } from '../api/teamApi';
import { getGitHubStatus, listUserRepositories } from '../api/githubIssueApi';
import './CreateTeam.css';

function CreateTeam() {
    const navigate = useNavigate();
    const [loginMember, setLoginMember] = useState(null);
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [allMembers, setAllMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // GitHub 저장소 연결
    const [githubConnected, setGithubConnected] = useState(null); // null=확인중, true/false
    const [repositories, setRepositories] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [showRepoDropdown, setShowRepoDropdown] = useState(false);

    // 로그인 확인
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

    // 모든 회원 목록 가져오기
    useEffect(() => {
        if (loginMember) {
            fetchAllMembers();
        }
    }, [loginMember]);

    // GitHub 연동 상태 확인
    useEffect(() => {
        const checkGitHubStatus = async () => {
            console.log('[DEBUG] checkGitHubStatus 시작 - loginMember:', loginMember);
            if (!loginMember || !loginMember.no) {
                console.log('[DEBUG] loginMember 없음, 스킵');
                return;
            }
            try {
                console.log('[DEBUG] getGitHubStatus 호출 - memberNo:', loginMember.no);
                const status = await getGitHubStatus(loginMember.no);
                console.log('[DEBUG] getGitHubStatus 응답:', status);
                const result = status.connected && status.hasRepoAccess;
                console.log('[DEBUG] githubConnected 설정:', result);
                setGithubConnected(result);
            } catch (error) {
                console.error('[DEBUG] GitHub 상태 확인 실패:', error);
                setGithubConnected(false);
            }
        };
        checkGitHubStatus();
    }, [loginMember]);

    const fetchAllMembers = async () => {
        try {
            const members = await getAllMembers();
            // 본인 제외
            const filteredMembers = members.filter(m => m.no !== loginMember?.no);
            setAllMembers(filteredMembers);
        } catch (error) {
            console.error('회원 목록 조회 실패:', error);
        }
    };

    // 회원 선택/해제
    const handleToggleMember = (member) => {
        setSelectedMembers(prev => {
            const isSelected = prev.some(m => m.no === member.no);
            if (isSelected) {
                return prev.filter(m => m.no !== member.no);
            } else {
                return [...prev, member];
            }
        });
        // 선택 후 검색창 비우기
        setSearchQuery('');
        setShowDropdown(false);
    };

    // 검색 필터링
    const filteredMembers = allMembers.filter(member =>
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.userid?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // GitHub 저장소 목록 로드
    const handleLoadRepositories = async () => {
        setLoadingRepos(true);
        try {
            const repos = await listUserRepositories(loginMember.no);
            setRepositories(Array.isArray(repos) ? repos : []);
            setShowRepoDropdown(true);
        } catch (error) {
            console.error('저장소 목록 조회 실패:', error);
            alert('저장소 목록을 가져오는데 실패했습니다.');
        } finally {
            setLoadingRepos(false);
        }
    };

    // 팀 생성
    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setError('팀 이름을 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await createTeam({
                teamName: teamName.trim(),
                description: teamDescription.trim(),
                leaderNo: loginMember.no,
                memberNos: selectedMembers.map(m => m.no),
                githubRepoFullName: selectedRepo?.fullName || null
            });

            if (result.success) {
                let message = `팀이 생성되었습니다!\n팀 코드: ${result.teamCode}`;
                if (result.githubConnected) {
                    message += '\n\nGitHub 저장소가 연결되었습니다.';
                    if (!result.webhookCreated) {
                        message += '\n(Webhook 등록에 실패했습니다. 팀 설정에서 다시 시도하세요.)';
                    }
                }
                alert(message);
                // 사이드바 팀 목록 갱신
                window.dispatchEvent(new CustomEvent('teamUpdated'));
                // 생성된 팀으로 이동
                navigate(`/team/${result.teamId}?view=overview`);
            } else {
                setError(result.message || '팀 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('팀 생성 실패:', error);
            setError('팀 생성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-team-page">
            <div className="create-team-container">
                <div className="create-team-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        뒤로가기
                    </button>
                    <h1>새 팀 만들기</h1>
                </div>

                <div className="create-team-content">
                    {/* 팀 정보 */}
                    <section className="team-info-section">
                        <h2>팀 정보</h2>
                        <div className="form-group">
                            <label>팀 이름 <span className="required">*</span></label>
                            <input
                                type="text"
                                placeholder="팀 이름을 입력하세요"
                                value={teamName}
                                onChange={(e) => { setTeamName(e.target.value); setError(''); }}
                                maxLength={50}
                            />
                        </div>
                        <div className="form-group">
                            <label>팀 설명</label>
                            <textarea
                                placeholder="팀에 대한 설명을 입력하세요 (선택사항)"
                                value={teamDescription}
                                onChange={(e) => setTeamDescription(e.target.value)}
                                rows={4}
                                maxLength={500}
                            />
                        </div>
                    </section>

                    {/* 팀원 초대 */}
                    <section className="team-members-section">
                        <h2>팀원 초대</h2>
                        <p className="section-description">초대할 팀원을 선택하세요. (나중에도 추가할 수 있습니다)</p>

                        {/* 검색 */}
                        <div className="member-search-wrapper">
                            <div className="member-search">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="이름 또는 아이디로 검색..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(e.target.value.trim().length > 0);
                                    }}
                                    onFocus={() => {
                                        if (searchQuery.trim().length > 0) {
                                            setShowDropdown(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        // 약간의 지연을 주어 클릭 이벤트가 먼저 처리되도록 함
                                        setTimeout(() => setShowDropdown(false), 200);
                                    }}
                                />
                            </div>

                            {/* 드롭다운 회원 목록 */}
                            {showDropdown && searchQuery.trim().length > 0 && (
                                <div className="members-dropdown">
                                    {filteredMembers.length === 0 ? (
                                        <div className="no-members">
                                            검색 결과가 없습니다.
                                        </div>
                                    ) : (
                                        filteredMembers.map(member => {
                                            const isSelected = selectedMembers.some(m => m.no === member.no);
                                            return (
                                                <div
                                                    key={member.no}
                                                    className={`member-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleToggleMember(member)}
                                                >
                                                    <div className="member-avatar">
                                                        {member.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="member-info">
                                                        <span className="member-name">{member.name}</span>
                                                        <span className="member-id">@{member.userid}</span>
                                                    </div>
                                                    <div className="member-checkbox">
                                                        {isSelected && (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 선택된 팀원 */}
                        {selectedMembers.length > 0 && (
                            <div className="selected-members">
                                <div className="selected-members-header">
                                    선택된 팀원 ({selectedMembers.length}명)
                                </div>
                                <div className="selected-members-list">
                                    {selectedMembers.map(member => (
                                        <div key={member.no} className="selected-member-tag">
                                            <span>{member.name}</span>
                                            <button onClick={() => handleToggleMember(member)}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* GitHub 저장소 연결 (선택사항) */}
                    <section className="github-section">
                        <h2>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub 저장소 연결 <span className="optional-label">(선택사항)</span>
                        </h2>
                        <p className="section-description">
                            GitHub 저장소를 연결하면 Issue가 자동으로 Task로 동기화됩니다.
                        </p>

                        {githubConnected === null ? (
                            <div className="github-loading">GitHub 연동 상태 확인 중...</div>
                        ) : githubConnected ? (
                            <div className="github-repo-selector">
                                {selectedRepo ? (
                                    <div className="selected-repo">
                                        <span className="repo-name">{selectedRepo.fullName}</span>
                                        <button
                                            type="button"
                                            className="change-repo-btn"
                                            onClick={() => { setSelectedRepo(null); handleLoadRepositories(); }}
                                        >
                                            변경
                                        </button>
                                        <button
                                            type="button"
                                            className="remove-repo-btn"
                                            onClick={() => setSelectedRepo(null)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="repo-dropdown-wrapper">
                                        <button
                                            type="button"
                                            className="select-repo-btn"
                                            onClick={handleLoadRepositories}
                                            disabled={loadingRepos}
                                        >
                                            {loadingRepos ? '로딩 중...' : '저장소 선택'}
                                        </button>
                                        {showRepoDropdown && repositories.length > 0 && (
                                            <div className="repo-dropdown">
                                                {repositories.map(repo => (
                                                    <div
                                                        key={repo.id}
                                                        className="repo-option"
                                                        onClick={() => {
                                                            setSelectedRepo(repo);
                                                            setShowRepoDropdown(false);
                                                        }}
                                                    >
                                                        <span className="repo-name">{repo.fullName}</span>
                                                        {repo.privateRepo && (
                                                            <span className="private-badge">Private</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {showRepoDropdown && repositories.length === 0 && !loadingRepos && (
                                            <div className="repo-dropdown">
                                                <div className="no-repos">저장소가 없습니다.</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="github-not-connected">
                                <p>GitHub 계정이 연결되어 있지 않습니다.</p>
                                <a href="/mypage" className="connect-github-link">
                                    마이페이지에서 GitHub 연동하기
                                </a>
                                <p className="hint">나중에 팀 설정에서도 연결할 수 있습니다.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {/* 하단 액션 */}
                <div className="create-team-footer">
                    <button className="cancel-btn" onClick={() => navigate(-1)}>
                        취소
                    </button>
                    <button
                        className="create-btn"
                        onClick={handleCreateTeam}
                        disabled={loading || !teamName.trim()}
                    >
                        {loading ? '생성 중...' : '팀 만들기'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateTeam;
