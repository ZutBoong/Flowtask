import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getProfile,
    updateProfile,
    deleteMember,
    changeEmail,
    changePasswordVerified,
    sendPasswordChangeCode,
    sendEmailChangeCode,
    verifyCode,
    uploadProfileImage,
    deleteProfileImage,
    getProfileImageUrl
} from '../api/memberApi';
import Sidebar from '../components/Sidebar';
import './MyPage.css';

function MyPage() {
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [activeSection, setActiveSection] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [loginMember, setLoginMember] = useState(null);

    // 프로필 수정 폼
    const [profileForm, setProfileForm] = useState({
        name: '',
        phone: ''
    });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // 이메일 변경 폼
    const [emailForm, setEmailForm] = useState({
        newEmail: '',
        verificationCode: ''
    });
    const [emailStep, setEmailStep] = useState(1); // 1: 입력, 2: 인증
    const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
    const [emailCodeSent, setEmailCodeSent] = useState(false);

    // 비밀번호 변경 폼
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        verificationCode: ''
    });
    const [passwordStep, setPasswordStep] = useState(1); // 1: 비밀번호 입력, 2: 인증
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [passwordCodeSent, setPasswordCodeSent] = useState(false);

    // 회원 탈퇴
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // 프로필 이미지
    const fileInputRef = useRef(null);
    const [profileImageKey, setProfileImageKey] = useState(Date.now());
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageMessage, setImageMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const storedMember = localStorage.getItem('member');
        if (!storedMember) {
            navigate('/login');
            return;
        }

        const memberData = JSON.parse(storedMember);
        setLoginMember(memberData);
        fetchProfile(memberData.no);

        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
            setCurrentTeam(JSON.parse(storedTeam));
        }
    }, [navigate]);

    const fetchProfile = async (memberNo) => {
        try {
            setLoading(true);
            const profileRes = await getProfile(memberNo);

            if (profileRes.success) {
                setMember(profileRes.member);
                setProfileForm({
                    name: profileRes.member.name || '',
                    phone: profileRes.member.phone || ''
                });
            }
        } catch (error) {
            console.error('프로필 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTeam = (team) => {
        setCurrentTeam(team);
        localStorage.setItem('currentTeam', JSON.stringify(team));
        navigate(`/team/${team.teamId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member');
        localStorage.removeItem('currentTeam');
        navigate('/login');
    };

    // 프로필 이미지 업로드
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
            setImageMessage({ type: 'error', text: '이미지 파일만 업로드 가능합니다.' });
            return;
        }

        // 파일 크기 검증 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setImageMessage({ type: 'error', text: '파일 크기는 5MB 이하만 가능합니다.' });
            return;
        }

        try {
            setUploadingImage(true);
            setImageMessage({ type: '', text: '' });

            const result = await uploadProfileImage(member.no, file);

            if (result.success) {
                setMember(result.member);
                setProfileImageKey(Date.now()); // 이미지 캐시 무효화
                setImageMessage({ type: 'success', text: '프로필 이미지가 업로드되었습니다.' });

                // localStorage 업데이트
                const storedMember = JSON.parse(localStorage.getItem('member'));
                localStorage.setItem('member', JSON.stringify({
                    ...storedMember,
                    profileImage: result.member.profileImage
                }));
            } else {
                setImageMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setImageMessage({ type: 'error', text: '이미지 업로드에 실패했습니다.' });
        } finally {
            setUploadingImage(false);
            // 파일 입력 초기화
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // 프로필 이미지 삭제
    const handleImageDelete = async () => {
        if (!member?.profileImage) return;

        try {
            setUploadingImage(true);
            setImageMessage({ type: '', text: '' });

            const result = await deleteProfileImage(member.no);

            if (result.success) {
                setMember(result.member);
                setProfileImageKey(Date.now());
                setImageMessage({ type: 'success', text: '프로필 이미지가 삭제되었습니다.' });

                // localStorage 업데이트
                const storedMember = JSON.parse(localStorage.getItem('member'));
                localStorage.setItem('member', JSON.stringify({
                    ...storedMember,
                    profileImage: null
                }));
            } else {
                setImageMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setImageMessage({ type: 'error', text: '이미지 삭제에 실패했습니다.' });
        } finally {
            setUploadingImage(false);
        }
    };

    // 프로필 수정
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });

        if (!profileForm.name.trim()) {
            setProfileMessage({ type: 'error', text: '이름을 입력해주세요.' });
            return;
        }

        try {
            const result = await updateProfile({
                no: member.no,
                name: profileForm.name,
                email: member.email,
                phone: profileForm.phone
            });

            if (result.success) {
                setProfileMessage({ type: 'success', text: result.message });
                setMember(result.member);
                const storedMember = JSON.parse(localStorage.getItem('member'));
                localStorage.setItem('member', JSON.stringify({
                    ...storedMember,
                    name: result.member.name
                }));
                setLoginMember(prev => ({
                    ...prev,
                    name: result.member.name
                }));
            } else {
                setProfileMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: '회원 정보 수정에 실패했습니다.' });
        }
    };

    // 이메일 변경 - 인증 코드 발송
    const handleSendEmailCode = async () => {
        setEmailMessage({ type: '', text: '' });

        if (!emailForm.newEmail.trim()) {
            setEmailMessage({ type: 'error', text: '새 이메일을 입력해주세요.' });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailForm.newEmail)) {
            setEmailMessage({ type: 'error', text: '올바른 이메일 형식을 입력해주세요.' });
            return;
        }

        if (emailForm.newEmail === member.email) {
            setEmailMessage({ type: 'error', text: '현재 이메일과 동일합니다.' });
            return;
        }

        try {
            const result = await sendEmailChangeCode(emailForm.newEmail);
            setEmailMessage({ type: 'success', text: result.message });
            setEmailCodeSent(true);
            setEmailStep(2);
        } catch (error) {
            setEmailMessage({ type: 'error', text: error.response?.data?.message || '인증 코드 발송에 실패했습니다.' });
        }
    };

    // 이메일 변경 - 인증 확인 및 변경
    const handleEmailChange = async (e) => {
        e.preventDefault();
        setEmailMessage({ type: '', text: '' });

        if (!emailForm.verificationCode.trim()) {
            setEmailMessage({ type: 'error', text: '인증 코드를 입력해주세요.' });
            return;
        }

        try {
            // 인증 코드 확인
            const verifyResult = await verifyCode(emailForm.newEmail, emailForm.verificationCode, 'EMAIL_CHANGE');

            if (verifyResult.success) {
                // 이메일 변경
                const changeResult = await changeEmail({
                    no: member.no,
                    newEmail: emailForm.newEmail
                });

                if (changeResult.success) {
                    setEmailMessage({ type: 'success', text: '이메일이 변경되었습니다.' });
                    setMember(changeResult.member);
                    const storedMember = JSON.parse(localStorage.getItem('member'));
                    localStorage.setItem('member', JSON.stringify({
                        ...storedMember,
                        email: changeResult.member.email
                    }));
                    setLoginMember(prev => ({
                        ...prev,
                        email: changeResult.member.email
                    }));
                    // 폼 초기화
                    setEmailForm({ newEmail: '', verificationCode: '' });
                    setEmailStep(1);
                    setEmailCodeSent(false);
                } else {
                    setEmailMessage({ type: 'error', text: changeResult.message });
                }
            } else {
                setEmailMessage({ type: 'error', text: verifyResult.message });
            }
        } catch (error) {
            setEmailMessage({ type: 'error', text: error.response?.data?.message || '이메일 변경에 실패했습니다.' });
        }
    };

    // 비밀번호 변경 - Step 1: 비밀번호 입력 및 인증 코드 발송
    const handlePasswordStep1 = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (!passwordForm.currentPassword) {
            setPasswordMessage({ type: 'error', text: '현재 비밀번호를 입력해주세요.' });
            return;
        }
        if (!passwordForm.newPassword) {
            setPasswordMessage({ type: 'error', text: '새 비밀번호를 입력해주세요.' });
            return;
        }
        if (passwordForm.newPassword.length < 4) {
            setPasswordMessage({ type: 'error', text: '비밀번호는 4자 이상이어야 합니다.' });
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
            return;
        }

        try {
            // 이메일로 인증 코드 발송
            const result = await sendPasswordChangeCode(member.email);
            setPasswordMessage({ type: 'success', text: '등록된 이메일로 인증 코드가 발송되었습니다.' });
            setPasswordCodeSent(true);
            setPasswordStep(2);
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.response?.data?.message || '인증 코드 발송에 실패했습니다.' });
        }
    };

    // 비밀번호 변경 - Step 2: 인증 코드 확인 및 변경
    const handlePasswordStep2 = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (!passwordForm.verificationCode.trim()) {
            setPasswordMessage({ type: 'error', text: '인증 코드를 입력해주세요.' });
            return;
        }

        try {
            // 인증 코드 확인
            const verifyResult = await verifyCode(member.email, passwordForm.verificationCode, 'PASSWORD_CHANGE');

            if (verifyResult.success) {
                // 비밀번호 변경
                const changeResult = await changePasswordVerified({
                    no: member.no,
                    newPassword: passwordForm.newPassword
                });

                if (changeResult.success) {
                    setPasswordMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' });
                    // 폼 초기화
                    setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                        verificationCode: ''
                    });
                    setPasswordStep(1);
                    setPasswordCodeSent(false);
                } else {
                    setPasswordMessage({ type: 'error', text: changeResult.message });
                }
            } else {
                setPasswordMessage({ type: 'error', text: verifyResult.message });
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.response?.data?.message || '비밀번호 변경에 실패했습니다.' });
        }
    };

    // 회원 탈퇴
    const handleDeleteAccount = async () => {
        setDeleteMessage({ type: '', text: '' });

        if (deleteConfirm !== '회원탈퇴') {
            setDeleteMessage({ type: 'error', text: '"회원탈퇴"를 정확히 입력해주세요.' });
            return;
        }

        try {
            const result = await deleteMember(member.no);

            if (result.success) {
                alert('회원 탈퇴가 완료되었습니다.');
                localStorage.removeItem('token');
                localStorage.removeItem('member');
                localStorage.removeItem('currentTeam');
                navigate('/login');
            } else {
                setDeleteMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setDeleteMessage({ type: 'error', text: error.response?.data?.message || '회원 탈퇴에 실패했습니다.' });
        }
    };

    const sections = [
        { id: 'profile', label: '프로필 정보', icon: '👤' },
        { id: 'email', label: '이메일 변경', icon: '📧' },
        { id: 'password', label: '비밀번호 변경', icon: '🔒' },
        { id: 'delete', label: '회원 탈퇴', icon: '🚪' }
    ];

    return (
        <div className="mypage-page">
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                currentTeam={currentTeam}
                onSelectTeam={handleSelectTeam}
                loginMember={loginMember}
            />

            <div className={`mypage-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <header className="mypage-header">
                    <div className="mypage-header-left">
                        <h1 className="mypage-title">마이페이지</h1>
                    </div>
                    <div className="mypage-header-right">
                        <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                    </div>
                </header>

                <div className="mypage-main">
                    {loading ? (
                        <div className="mypage-loading">
                            <div className="loading-spinner"></div>
                            <p>로딩 중...</p>
                        </div>
                    ) : (
                        <div className="mypage-container">
                            {/* 왼쪽: 프로필 카드 */}
                            <div className="mypage-sidebar-card">
                                <div className="profile-avatar-container">
                                    <div className="profile-avatar">
                                        {member?.profileImage ? (
                                            <img
                                                src={`${getProfileImageUrl(member.no)}?t=${profileImageKey}`}
                                                alt="프로필"
                                                className="profile-image"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <span
                                            className="profile-initial"
                                            style={{ display: member?.profileImage ? 'none' : 'flex' }}
                                        >
                                            {member?.name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                    <div className="profile-avatar-actions">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            className="avatar-action-btn upload"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            title="이미지 업로드"
                                        >
                                            {uploadingImage ? '...' : '📷'}
                                        </button>
                                        {member?.profileImage && (
                                            <button
                                                className="avatar-action-btn delete"
                                                onClick={handleImageDelete}
                                                disabled={uploadingImage}
                                                title="이미지 삭제"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                    {imageMessage.text && (
                                        <div className={`image-message ${imageMessage.type}`}>
                                            {imageMessage.text}
                                        </div>
                                    )}
                                </div>
                                <h2 className="profile-name">{member?.name}</h2>
                                <p className="profile-userid">@{member?.userid}</p>
                                <p className="profile-email">{member?.email}</p>

                                <nav className="mypage-nav">
                                    {sections.map(section => (
                                        <button
                                            key={section.id}
                                            className={`nav-item ${activeSection === section.id ? 'active' : ''} ${section.id === 'delete' ? 'danger' : ''}`}
                                            onClick={() => setActiveSection(section.id)}
                                        >
                                            <span className="nav-icon">{section.icon}</span>
                                            <span className="nav-label">{section.label}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* 오른쪽: 섹션 콘텐츠 */}
                            <div className="mypage-content-card">
                                {activeSection === 'profile' && (
                                    <div className="section-content">
                                        <h3 className="section-title">프로필 정보</h3>
                                        <p className="section-desc">기본 정보를 수정할 수 있습니다.</p>

                                        <form onSubmit={handleProfileSubmit} className="mypage-form">
                                            <div className="form-group">
                                                <label>아이디</label>
                                                <input
                                                    type="text"
                                                    value={member?.userid || ''}
                                                    disabled
                                                    className="input-disabled"
                                                />
                                                <span className="form-hint">아이디는 변경할 수 없습니다.</span>
                                            </div>
                                            <div className="form-group">
                                                <label>이름</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                                    placeholder="이름을 입력하세요"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>전화번호</label>
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                                    placeholder="전화번호를 입력하세요"
                                                />
                                            </div>
                                            {profileMessage.text && (
                                                <div className={`form-message ${profileMessage.type}`}>
                                                    {profileMessage.text}
                                                </div>
                                            )}
                                            <button type="submit" className="btn btn-primary">
                                                저장하기
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {activeSection === 'email' && (
                                    <div className="section-content">
                                        <h3 className="section-title">이메일 변경</h3>
                                        <p className="section-desc">새 이메일로 인증 코드를 발송하여 변경합니다.</p>

                                        <div className="current-info">
                                            <span className="info-label">현재 이메일</span>
                                            <span className="info-value">{member?.email}</span>
                                        </div>

                                        <form onSubmit={handleEmailChange} className="mypage-form">
                                            <div className="form-group">
                                                <label>새 이메일</label>
                                                <div className="input-with-button">
                                                    <input
                                                        type="email"
                                                        value={emailForm.newEmail}
                                                        onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                                                        placeholder="새 이메일을 입력하세요"
                                                        disabled={emailStep === 2}
                                                    />
                                                    {emailStep === 1 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={handleSendEmailCode}
                                                        >
                                                            인증 코드 발송
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {emailStep === 2 && (
                                                <>
                                                    <div className="form-group">
                                                        <label>인증 코드</label>
                                                        <input
                                                            type="text"
                                                            value={emailForm.verificationCode}
                                                            onChange={(e) => setEmailForm({...emailForm, verificationCode: e.target.value})}
                                                            placeholder="6자리 인증 코드를 입력하세요"
                                                            maxLength={6}
                                                        />
                                                        <span className="form-hint">새 이메일로 발송된 인증 코드를 입력하세요.</span>
                                                    </div>
                                                    <div className="button-group">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline"
                                                            onClick={() => {
                                                                setEmailStep(1);
                                                                setEmailCodeSent(false);
                                                                setEmailForm({ newEmail: '', verificationCode: '' });
                                                                setEmailMessage({ type: '', text: '' });
                                                            }}
                                                        >
                                                            취소
                                                        </button>
                                                        <button type="submit" className="btn btn-primary">
                                                            이메일 변경
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {emailMessage.text && (
                                                <div className={`form-message ${emailMessage.type}`}>
                                                    {emailMessage.text}
                                                </div>
                                            )}
                                        </form>
                                    </div>
                                )}

                                {activeSection === 'password' && (
                                    <div className="section-content">
                                        <h3 className="section-title">비밀번호 변경</h3>
                                        <p className="section-desc">보안을 위해 이메일 인증 후 비밀번호를 변경합니다.</p>

                                        {passwordStep === 1 && (
                                            <form onSubmit={handlePasswordStep1} className="mypage-form">
                                                <div className="form-group">
                                                    <label>현재 비밀번호</label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.currentPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                                        placeholder="현재 비밀번호를 입력하세요"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>새 비밀번호</label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.newPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                                        placeholder="새 비밀번호를 입력하세요"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>새 비밀번호 확인</label>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.confirmPassword}
                                                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                                        placeholder="새 비밀번호를 다시 입력하세요"
                                                    />
                                                </div>
                                                {passwordMessage.text && (
                                                    <div className={`form-message ${passwordMessage.type}`}>
                                                        {passwordMessage.text}
                                                    </div>
                                                )}
                                                <button type="submit" className="btn btn-primary">
                                                    이메일 인증 진행
                                                </button>
                                            </form>
                                        )}

                                        {passwordStep === 2 && (
                                            <form onSubmit={handlePasswordStep2} className="mypage-form">
                                                <div className="verification-notice">
                                                    <span className="notice-icon">📧</span>
                                                    <div>
                                                        <strong>{member?.email}</strong>으로 인증 코드가 발송되었습니다.
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>인증 코드</label>
                                                    <input
                                                        type="text"
                                                        value={passwordForm.verificationCode}
                                                        onChange={(e) => setPasswordForm({...passwordForm, verificationCode: e.target.value})}
                                                        placeholder="6자리 인증 코드를 입력하세요"
                                                        maxLength={6}
                                                    />
                                                </div>
                                                {passwordMessage.text && (
                                                    <div className={`form-message ${passwordMessage.type}`}>
                                                        {passwordMessage.text}
                                                    </div>
                                                )}
                                                <div className="button-group">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline"
                                                        onClick={() => {
                                                            setPasswordStep(1);
                                                            setPasswordCodeSent(false);
                                                            setPasswordForm({
                                                                currentPassword: '',
                                                                newPassword: '',
                                                                confirmPassword: '',
                                                                verificationCode: ''
                                                            });
                                                            setPasswordMessage({ type: '', text: '' });
                                                        }}
                                                    >
                                                        취소
                                                    </button>
                                                    <button type="submit" className="btn btn-primary">
                                                        비밀번호 변경
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}

                                {activeSection === 'delete' && (
                                    <div className="section-content">
                                        <h3 className="section-title danger-text">회원 탈퇴</h3>
                                        <p className="section-desc">계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</p>

                                        <div className="danger-zone">
                                            <div className="danger-warning">
                                                <span className="warning-icon">⚠️</span>
                                                <div>
                                                    <strong>주의사항</strong>
                                                    <ul>
                                                        <li>탈퇴 시 모든 개인 정보가 삭제됩니다.</li>
                                                        <li>팀 리더인 경우 탈퇴가 불가능합니다.</li>
                                                        <li>이 작업은 되돌릴 수 없습니다.</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn-danger"
                                                onClick={() => setShowDeleteModal(true)}
                                            >
                                                회원 탈퇴
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 탈퇴 확인 모달 */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
                        <h3>정말 탈퇴하시겠습니까?</h3>
                        <p>탈퇴를 확인하려면 아래에 <strong>"회원탈퇴"</strong>를 입력해주세요.</p>

                        <input
                            type="text"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder="회원탈퇴"
                            className="delete-confirm-input"
                        />

                        {deleteMessage.text && (
                            <div className={`form-message ${deleteMessage.type}`}>
                                {deleteMessage.text}
                            </div>
                        )}

                        <div className="modal-buttons">
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirm('');
                                    setDeleteMessage({ type: '', text: '' });
                                }}
                            >
                                취소
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteAccount}
                            >
                                탈퇴하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyPage;
