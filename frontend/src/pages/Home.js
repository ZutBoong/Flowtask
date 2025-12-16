import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <div className="home-content">
                <h1 className="home-title">Flowtask</h1>
                <p className="home-subtitle">프로젝트 관리 및 협업 플랫폼</p>

                <div className="home-buttons">
                    <button
                        className="btn btn-primary btn-large"
                        onClick={() => navigate('/login')}
                    >
                        로그인
                    </button>
                    <button
                        className="btn btn-secondary btn-large"
                        onClick={() => navigate('/register')}
                    >
                        회원가입
                    </button>
                </div>

                <div className="home-links">
                    <span onClick={() => navigate('/find-id')}>아이디 찾기</span>
                    <span className="divider">|</span>
                    <span onClick={() => navigate('/find-password')}>비밀번호 찾기</span>
                </div>
            </div>
        </div>
    );
}

export default Home;
