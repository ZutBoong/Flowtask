import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleGitHubCallback } from '../api/githubIssueApi';
import './GitHubCallback.css';

/**
 * GitHub OAuth 콜백 페이지 (계정 연동 전용)
 * 마이페이지에서 GitHub 계정 연동 시 사용됩니다.
 * GitHub 로그인은 Spring Security OAuth2를 통해 /oauth2/redirect로 처리됩니다.
 */
function GitHubCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [error, setError] = useState(null);
    const processedRef = useRef(false);  // 중복 실행 방지

    useEffect(() => {
        const processCallback = async () => {
            // 이미 처리된 경우 무시 (StrictMode 중복 실행 방지)
            if (processedRef.current) {
                return;
            }
            processedRef.current = true;

            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            // GitHub에서 에러 응답한 경우
            if (errorParam) {
                setStatus('error');
                setError(errorDescription || errorParam);
                return;
            }

            // code가 없는 경우
            if (!code) {
                setStatus('error');
                setError('인증 코드가 없습니다.');
                return;
            }

            try {
                // GitHub 계정 연동 처리
                const result = await handleGitHubCallback(code, state);

                if (result.success) {
                    setStatus('success');
                    // 로컬 스토리지의 member 정보 업데이트
                    const storedMember = localStorage.getItem('member');
                    if (storedMember) {
                        const member = JSON.parse(storedMember);
                        member.githubUsername = result.githubUsername;
                        member.githubConnectedAt = result.connectedAt;
                        localStorage.setItem('member', JSON.stringify(member));
                    }
                    // 2초 후 이전 페이지로 이동 (강제 새로고침으로 state 동기화)
                    setTimeout(() => {
                        const returnUrl = localStorage.getItem('github_return_url');
                        localStorage.removeItem('github_return_url');
                        window.location.href = returnUrl || '/';
                    }, 2000);
                } else {
                    setStatus('error');
                    setError(result.error || 'GitHub 연결에 실패했습니다.');
                }
            } catch (err) {
                console.error('GitHub callback error:', err);
                setStatus('error');
                setError(err.response?.data?.error || 'GitHub 연결 중 오류가 발생했습니다.');
            }
        };

        processCallback();
    }, [searchParams, navigate]);

    const handleRetry = () => {
        const returnUrl = localStorage.getItem('github_return_url');
        localStorage.removeItem('github_return_url');
        navigate(returnUrl || '/');
    };

    return (
        <div className="github-callback-page">
            <div className="github-callback-card">
                <div className="github-icon">
                    <i className="fa-brands fa-github"></i>
                </div>

                {status === 'processing' && (
                    <>
                        <div className="spinner">
                            <i className="fa-solid fa-spinner fa-spin"></i>
                        </div>
                        <h2>GitHub 연결 중...</h2>
                        <p>잠시만 기다려주세요.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="success-icon">
                            <i className="fa-solid fa-check-circle"></i>
                        </div>
                        <h2>GitHub 연결 완료!</h2>
                        <p>GitHub 계정이 성공적으로 연결되었습니다.</p>
                        <p className="redirect-text">잠시 후 이동합니다...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="error-icon">
                            <i className="fa-solid fa-times-circle"></i>
                        </div>
                        <h2>연결 실패</h2>
                        <p className="error-message">{error}</p>
                        <button className="retry-btn" onClick={handleRetry}>
                            돌아가기
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default GitHubCallback;
