import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function OAuth2Redirect() {
    const navigate = useNavigate();
    const ranRef = useRef(false);   // ⭐ StrictMode 중복 실행 방지

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const params = new URL(window.location.href).searchParams;

        const token = params.get('token');
        const email = params.get('email');
        const name = params.get('name');
        const memberNo = params.get('memberNo');

        console.log("TOKEN PARAM:", token);
        console.log("EMAIL PARAM:", email);
        console.log("NAME PARAM:", name);
        console.log("MEMBER NO PARAM:", memberNo);

        // ⭐ URL에는 token이 없지만 localStorage에 token이 있는 경우 → 정상 로그인 유지
        const savedToken = localStorage.getItem('token');
        if (!token && savedToken) {
            navigate('/activity', { replace: true });
            return;
        }

        // ⭐ token이 완전히 없으면 로그인 시키기
        if (!token || token === "null" || token === "undefined") {
            navigate('/login', { replace: true });
            return;
        }

        // ⭐ token 저장
        localStorage.setItem('token', token);

        // ⭐ member 저장 (MyActivity 두 필드를 모두 사용하므로 둘 다 넣기)
        const member = {
            no: Number(memberNo),
            memberNo: Number(memberNo),
            userid: "google_" + email,
            name: name,
            social: "GOOGLE"
        };

        localStorage.setItem('member', JSON.stringify(member));

        navigate('/activity', { replace: true });
    }, [navigate]);

    return <div>로그인 처리 중입니다...</div>;
}

export default OAuth2Redirect;