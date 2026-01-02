import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinTeam } from '../api/teamApi';
import './Invite.css';

function Invite() {
    const navigate = useNavigate();
    const { teamCode } = useParams();
    const [loginMember, setLoginMember] = useState(null);
    const [status, setStatus] = useState('checking'); // checking, joining, success, error, login_required
    const [errorMessage, setErrorMessage] = useState('');
    const [teamInfo, setTeamInfo] = useState(null);

    // 로그인 확인
    useEffect(() => {
        const token = localStorage.getItem('token');
        const member = localStorage.getItem('member');

        if (!token || !member) {
            setStatus('login_required');
            return;
        }

        setLoginMember(JSON.parse(member));
    }, []);

    // 로그인 상태 확인 후 자동 가입 시도
    useEffect(() => {
        if (loginMember && teamCode) {
            handleJoinTeam();
        }
    }, [loginMember, teamCode]);

    const handleJoinTeam = async () => {
        setStatus('joining');

        try {
            const result = await joinTeam(teamCode, loginMember.no);

            if (result.success) {
                setTeamInfo(result);
                setStatus('success');
                // 사이드바 팀 목록 갱신
                window.dispatchEvent(new CustomEvent('teamUpdated'));
            } else {
                setErrorMessage(result.message || '팀 가입에 실패했습니다.');
                setStatus('error');
            }
        } catch (error) {
            console.error('팀 가입 실패:', error);
            if (error.response?.data?.message) {
                setErrorMessage(error.response.data.message);
            } else if (error.response?.status === 404) {
                setErrorMessage('유효하지 않은 초대 링크입니다.');
            } else if (error.response?.status === 409) {
                setErrorMessage('이미 가입된 팀입니다.');
            } else {
                setErrorMessage('팀 가입에 실패했습니다.');
            }
            setStatus('error');
        }
    };

    const handleGoToLogin = () => {
        // 로그인 후 돌아올 수 있도록 현재 URL 저장
        localStorage.setItem('redirectAfterLogin', `/invite/${teamCode}`);
        navigate('/login');
    };

    const handleGoToTeam = () => {
        if (teamInfo?.teamId) {
            navigate(`/team/${teamInfo.teamId}?view=overview`);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="invite-page">
            <div className="invite-container">
                <div className="invite-logo">Synodos</div>

                {status === 'checking' && (
                    <div className="invite-content">
                        <div className="invite-spinner"></div>
                        <p>확인 중...</p>
                    </div>
                )}

                {status === 'login_required' && (
                    <div className="invite-content">
                        <div className="invite-icon">
                            <i className="fa-solid fa-user-lock"></i>
                        </div>
                        <h2>로그인이 필요합니다</h2>
                        <p>팀에 가입하려면 먼저 로그인해주세요.</p>
                        <div className="invite-actions">
                            <button className="invite-btn primary" onClick={handleGoToLogin}>
                                로그인하기
                            </button>
                            <button className="invite-btn secondary" onClick={() => navigate('/register')}>
                                회원가입
                            </button>
                        </div>
                    </div>
                )}

                {status === 'joining' && (
                    <div className="invite-content">
                        <div className="invite-spinner"></div>
                        <h2>팀에 가입 중...</h2>
                        <p>잠시만 기다려주세요.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="invite-content">
                        <div className="invite-icon success">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h2>팀 가입 완료!</h2>
                        <p><strong>{teamInfo?.teamName || '팀'}</strong>에 성공적으로 가입했습니다.</p>
                        <div className="invite-actions">
                            <button className="invite-btn primary" onClick={handleGoToTeam}>
                                팀으로 이동
                            </button>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="invite-content">
                        <div className="invite-icon error">
                            <i className="fa-solid fa-xmark"></i>
                        </div>
                        <h2>가입 실패</h2>
                        <p>{errorMessage}</p>
                        <div className="invite-actions">
                            <button className="invite-btn secondary" onClick={() => navigate('/')}>
                                홈으로 이동
                            </button>
                            {errorMessage === '이미 가입된 팀입니다.' && (
                                <button className="invite-btn primary" onClick={() => navigate('/activity')}>
                                    내 팀 보기
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Invite;
