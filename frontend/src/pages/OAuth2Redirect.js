import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { linkSocialAccount } from '../api/memberApi';

function OAuth2Redirect() {
    const navigate = useNavigate();
    const ranRef = useRef(false);

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const handleRedirect = async () => {
            const params = new URL(window.location.href).searchParams;

            const token = params.get('token');
            const email = params.get('email');
            const name = params.get('name');
            const memberNo = params.get('memberNo');
            const provider = params.get('provider');
            const isNewUser = params.get('isNewUser') === 'true';
            const providerId = params.get('providerId');
            const socialName = params.get('socialName');
            const socialEmail = params.get('socialEmail');
            const needsEmailInput = params.get('needsEmailInput') === 'true';
            // GitHub 연동 시 추가 파라미터
            const githubUsername = params.get('githubUsername');
            const githubAccessToken = params.get('githubAccessToken');

            // 연동 모드 확인 (localStorage에서)
            const linkMode = localStorage.getItem('socialLinkMode') === 'true';
            const linkMemberNo = localStorage.getItem('socialLinkMemberNo');

            // 연동 모드 정보 삭제
            localStorage.removeItem('socialLinkMode');
            localStorage.removeItem('socialLinkMemberNo');

            // 연동 모드인 경우
            if (linkMode && linkMemberNo && isNewUser) {
                try {
                    const linkData = {
                        memberNo: parseInt(linkMemberNo),
                        provider: provider,
                        providerId: providerId,
                        email: socialEmail,
                        name: decodeURIComponent(socialName || '')
                    };

                    // GitHub 연동인 경우 access token도 전달
                    if (provider === 'github' && githubUsername && githubAccessToken) {
                        linkData.githubUsername = githubUsername;
                        linkData.githubAccessToken = githubAccessToken;
                    }

                    const result = await linkSocialAccount(linkData);

                    if (result.success) {
                        alert(`${provider} 계정이 연동되었습니다.`);
                    } else {
                        alert(result.message || '연동에 실패했습니다.');
                    }
                } catch (error) {
                    console.error('연동 실패:', error);
                    alert('연동에 실패했습니다.');
                }

                navigate('/mypage', { replace: true });
                return;
            }

            // 연동 모드인데 이미 다른 계정에 연동된 경우 (기존 회원)
            if (linkMode && linkMemberNo && !isNewUser) {
                alert('이미 다른 계정에 연동된 소셜 계정입니다.');
                navigate('/mypage', { replace: true });
                return;
            }

            // 신규 회원 (회원가입 필요)
            if (isNewUser) {
                const signupUrl = `/social-signup-complete?provider=${provider}&providerId=${providerId}&name=${encodeURIComponent(socialName || '')}&email=${socialEmail || ''}&needsEmailInput=${needsEmailInput}`;
                navigate(signupUrl, { replace: true });
                return;
            }

            // 기존 회원 로그인
            // URL에는 token이 없지만 localStorage에 token이 있는 경우
            const savedToken = localStorage.getItem('token');
            if (!token && savedToken) {
                navigate('/activity', { replace: true });
                return;
            }

            // token이 없으면 로그인 페이지로
            if (!token || token === "null" || token === "undefined") {
                navigate('/login', { replace: true });
                return;
            }

            // token 저장
            localStorage.setItem('token', token);

            // member 객체 저장 (GitHub 연동 정보 포함)
            const member = {
                no: Number(memberNo),
                memberNo: Number(memberNo),
                email: email,
                name: name,
                provider: provider?.toUpperCase(),
                githubUsername: githubUsername || null  // GitHub 연동 정보 포함
            };

            localStorage.setItem('member', JSON.stringify(member));

            // 메인 페이지로
            navigate('/activity', { replace: true });
        };

        handleRedirect();
    }, [navigate]);

    return <div>로그인 처리 중입니다...</div>;
}

export default OAuth2Redirect;
