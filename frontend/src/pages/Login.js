import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/memberApi';
import { getGitHubLoginUrl } from '../api/githubIssueApi';
import './Auth.css';

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        userid: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [githubLoading, setGithubLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.userid || !form.password) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        try {
            const result = await login(form);

            if (result.success) {
                // JWT 토큰과 회원 정보 저장 (localStorage 사용)
                localStorage.setItem('token', result.token);
                localStorage.setItem('member', JSON.stringify(result.member));
                alert(`${result.member.name}님, 환영합니다!`);

                // 리다이렉트 URL이 있으면 해당 페이지로 이동 (초대 링크 등)
                const redirectUrl = localStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                    localStorage.removeItem('redirectAfterLogin');
                    navigate(redirectUrl);
                } else {
                    navigate('/activity');
                }
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('로그인 실패:', error);
            setError('로그인에 실패했습니다.');
        }
    };

    const handleGitHubLogin = async () => {
        setGithubLoading(true);
        try {
            const data = await getGitHubLoginUrl();
            if (data.url) {
                // 로그인 모드 저장
                localStorage.setItem('github_oauth_mode', 'login');
                localStorage.setItem('github_return_url', '/activity');
                window.location.href = data.url;
            } else if (data.error) {
                setError(data.error);
            }
        } catch (error) {
            console.error('GitHub 로그인 URL 가져오기 실패:', error);
            setError('GitHub 로그인을 시작할 수 없습니다.');
        } finally {
            setGithubLoading(false);
        }
    };

    // 소셜 로그인
    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:8081/oauth2/authorization/google';
    };
    const handleNaverLogin = () => {    //작성자 : 윤희망 OAuth2.0연동 Naver.Kakao
        window.location.href =
        'http://localhost:8081/oauth2/authorization/naver'
    };
    const handleKakaoLogin = () => {
        window.location.href =
        'http://localhost:8081/oauth2/authorization/kakao'
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>로그인</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>아이디</label>
                        <input
                            type="text"
                            name="userid"
                            value={form.userid}
                            onChange={handleChange}
                            placeholder="아이디를 입력하세요"
                        />
                    </div>

                    <div className="form-group">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="비밀번호를 입력하세요"
                        />
                    </div>

                    {error && <div className="error-msg" style={{ marginBottom: '15px' }}>{error}</div>}

                    <div className="button-group">
                        <button type="submit" className="btn btn-primary">로그인</button>
                    </div>
                </form>

                <div className="social-divider">
                    <span>또는</span>
                </div>

                <div className="social-login-buttons">
                    <button
                        type="button"
                        className="social-btn google"
                        onClick={handleGoogleLogin}
                        title="Google로 로그인"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="social-btn naver"
                        onClick={handleNaverLogin}
                        title="Naver로 로그인"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="social-btn kakao"
                        onClick={handleKakaoLogin}
                        title="Kakao로 로그인"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222v2.218a.472.472 0 0 0 .944 0v-1.58l.787-.73 1.33 2.422a.472.472 0 1 0 .826-.454l-1.829-3.177zm-7.907-1.03a.472.472 0 0 0-.472.472v3.776a.472.472 0 0 0 .944 0v-3.776a.472.472 0 0 0-.472-.472zm-3.037.006a.472.472 0 0 0-.42.256l-1.9 3.773a.472.472 0 1 0 .843.424l.407-.81h2.128l.404.808a.472.472 0 1 0 .845-.422l-1.888-3.773a.472.472 0 0 0-.42-.256zm.002 1.465l.657 1.31H6.31l.656-1.31zm7.027-1.4c.26 0 .472.212.472.472v2.836h1.492a.472.472 0 1 1 0 .944h-1.964a.472.472 0 0 1-.472-.472v-3.308c0-.26.211-.472.472-.472z"/>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="social-btn github"
                        onClick={handleGitHubLogin}
                        disabled={githubLoading}
                        title="GitHub로 로그인"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                    </button>
                </div>

                <div className="auth-links">
                    <span onClick={() => navigate('/find-id')}>아이디 찾기</span>
                    <span className="divider">|</span>
                    <span onClick={() => navigate('/find-password')}>비밀번호 찾기</span>
                    <span className="divider">|</span>
                    <span onClick={() => navigate('/register')}>회원가입</span>
                </div>
            </div>
        </div>
    );
}

export default Login;
