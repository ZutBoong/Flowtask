import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socialRegister, checkEmail, checkUserid } from '../api/memberApi';
import './Auth.css';

function SocialSignupComplete() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        userid: '',
        email: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [useridError, setUseridError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);

    // URL 파라미터에서 정보 가져오기
    const params = new URLSearchParams(location.search);
    const provider = params.get('provider');
    const providerId = params.get('providerId');
    const name = params.get('name');
    const initialEmail = params.get('email') || '';
    const needsEmailInput = params.get('needsEmailInput') === 'true';

    useEffect(() => {
        // 필수 파라미터 체크
        if (!provider || !providerId) {
            navigate('/login');
            return;
        }

        // 이메일이 있으면 폼에 설정
        if (initialEmail) {
            setForm(prev => ({ ...prev, email: initialEmail }));
        }
    }, [provider, providerId, initialEmail, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        setError('');
        if (name === 'userid') {
            setUseridError('');
        }
        if (name === 'email') {
            setEmailError('');
        }
    };

    // 아이디 중복 체크
    const handleUseridBlur = async () => {
        if (!form.userid) return;

        // 아이디 형식 체크 (영문, 숫자, 4-20자)
        if (!/^[a-zA-Z0-9]{4,20}$/.test(form.userid)) {
            setUseridError('아이디는 영문, 숫자 4-20자로 입력해주세요.');
            return;
        }

        try {
            const result = await checkUserid(form.userid);
            if (!result.available) {
                setUseridError('이미 사용 중인 아이디입니다.');
            }
        } catch (error) {
            console.error('아이디 체크 실패:', error);
        }
    };

    // 이메일 중복 체크
    const handleEmailBlur = async () => {
        if (!form.email) return;

        try {
            const result = await checkEmail(form.email);
            if (!result.available) {
                setEmailError('이미 사용 중인 이메일입니다.');
            }
        } catch (error) {
            console.error('이메일 체크 실패:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 아이디 필수 체크
        if (!form.userid) {
            setError('아이디를 입력해주세요.');
            return;
        }

        // 아이디 형식 체크
        if (!/^[a-zA-Z0-9]{4,20}$/.test(form.userid)) {
            setError('아이디는 영문, 숫자 4-20자로 입력해주세요.');
            return;
        }

        // 이메일 필수 체크
        if (!form.email) {
            setError('이메일을 입력해주세요.');
            return;
        }

        // 이메일 형식 체크
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError('올바른 이메일 형식을 입력해주세요.');
            return;
        }

        // 약관 동의 체크
        if (!agreeTerms || !agreePrivacy) {
            setError('필수 약관에 동의해주세요.');
            return;
        }

        if (useridError) {
            setError('아이디 중복을 확인해주세요.');
            return;
        }

        if (emailError) {
            setError('이메일 중복을 확인해주세요.');
            return;
        }

        setLoading(true);
        try {
            const result = await socialRegister({
                userid: form.userid,
                email: form.email,
                phone: form.phone || null,
                name: decodeURIComponent(name || ''),
                provider: provider,
                providerId: providerId
            });

            if (result.success) {
                // 토큰 및 회원 정보 저장
                localStorage.setItem('token', result.token);
                localStorage.setItem('member', JSON.stringify(result.member));
                alert(`${decodeURIComponent(name || '')}님, 회원가입이 완료되었습니다!`);
                navigate('/activity');
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('회원가입 실패:', error);
            setError('회원가입에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const getProviderName = (provider) => {
        switch (provider) {
            case 'google': return 'Google';
            case 'naver': return 'Naver';
            case 'kakao': return 'Kakao';
            default: return provider;
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>회원가입</h2>

                <div className="verification-info">
                    <p><strong>{getProviderName(provider)}</strong> 계정으로 가입합니다.</p>
                    <p>서비스 이용을 위해 추가 정보를 입력해주세요.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 이름 (읽기 전용) */}
                    <div className="form-group">
                        <label>이름</label>
                        <input
                            type="text"
                            value={decodeURIComponent(name || '')}
                            disabled
                            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                    </div>

                    {/* 아이디 */}
                    <div className="form-group">
                        <label>아이디 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="text"
                            name="userid"
                            value={form.userid}
                            onChange={handleChange}
                            onBlur={handleUseridBlur}
                            placeholder="영문, 숫자 4-20자"
                            autoComplete="username"
                        />
                        {useridError && <span className="error-msg">{useridError}</span>}
                    </div>

                    {/* 이메일 */}
                    <div className="form-group">
                        <label>이메일 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            onBlur={handleEmailBlur}
                            placeholder="이메일을 입력해주세요"
                            disabled={!needsEmailInput && initialEmail}
                            style={!needsEmailInput && initialEmail ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                        />
                        {emailError && <span className="error-msg">{emailError}</span>}
                        {needsEmailInput && (
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                {getProviderName(provider)}에서 이메일을 제공받지 못했습니다. 이메일을 직접 입력해주세요.
                            </p>
                        )}
                    </div>

                    {/* 전화번호 (선택) */}
                    <div className="form-group">
                        <label>전화번호 <span style={{ color: '#94a3b8', fontSize: '11px' }}>(선택)</span></label>
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="010-1234-5678"
                        />
                    </div>

                    {/* 약관 동의 */}
                    <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
                            <input
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', color: '#475569' }}>
                                <span style={{ color: '#ef4444' }}>[필수]</span> 서비스 이용약관에 동의합니다.
                            </span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={agreePrivacy}
                                onChange={(e) => setAgreePrivacy(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', color: '#475569' }}>
                                <span style={{ color: '#ef4444' }}>[필수]</span> 개인정보 처리방침에 동의합니다.
                            </span>
                        </label>
                    </div>

                    {error && <div className="error-msg" style={{ marginBottom: '15px' }}>{error}</div>}

                    <div className="button-group">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? '처리 중...' : '가입 완료'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SocialSignupComplete;
