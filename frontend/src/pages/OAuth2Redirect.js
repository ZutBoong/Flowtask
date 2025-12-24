import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function OAuth2Redirect() {
    const navigate = useNavigate();
    const ranRef = useRef(false);   // StrictMode 중복 실행 방지

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const params = new URL(window.location.href).searchParams;

        const token = params.get('token');
        const email = params.get('email');
        const name = params.get('name');
        const memberNo = params.get('memberNo');
        const provider = params.get('provider'); // ⭐ 핵심

        console.log("TOKEN PARAM:", token);
        console.log("EMAIL PARAM:", email);
        console.log("NAME PARAM:", name);
        console.log("MEMBER NO PARAM:", memberNo);
        console.log("PROVIDER PARAM:", provider);

        // ⭐ URL에는 token이 없지만 localStorage에 token이 있는 경우 → 로그인 유지
        const savedToken = localStorage.getItem('token');
        if (!token && savedToken) {
            navigate('/activity', { replace: true });
            return;
        }

        // ⭐ token이 없으면 로그인 페이지로
        if (!token || token === "null" || token === "undefined") {
            navigate('/login', { replace: true });
            return;
        }

        // ⭐ token 저장
        localStorage.setItem('token', token);

        // ⭐ member 객체 (소셜 공통 구조)
        const member = {
            no: Number(memberNo),
            memberNo: Number(memberNo),
            email: email,
            name: name,
            provider: provider?.toUpperCase() // GOOGLE / NAVER / KAKAO
        };

        localStorage.setItem('member', JSON.stringify(member));

        navigate('/activity', { replace: true });
    }, [navigate]);

    return <div>로그인 처리 중입니다...</div>;
}

export default OAuth2Redirect;