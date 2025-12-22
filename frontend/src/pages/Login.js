import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/memberApi';
import './Auth.css';

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        userid: '',
        password: ''
    });
    const [error, setError] = useState('');

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
                navigate('/activity');
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('로그인 실패:', error);
            setError('로그인에 실패했습니다.');
        }
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

                    {/* 작성자: 홍진기 */}
                    <div>
                        <button type= "button" className="btn btn-primary">구글 로그인</button>
                        <button type= "button" className="btn btn-primary">네이버 로그인</button>
                    </div>
                </form>

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
