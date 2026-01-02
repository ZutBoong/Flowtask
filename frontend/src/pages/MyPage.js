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
    getProfileImageUrl,
    getSocialLinks,
    unlinkSocialAccount
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

    // 소셜 연동
    const [socialLinks, setSocialLinks] = useState([]);
    const [primaryProvider, setPrimaryProvider] = useState(null);
    const [socialMessage, setSocialMessage] = useState({ type: '', text: '' });

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

            // 소셜 연동 목록 조회
            const socialRes = await getSocialLinks(memberNo);
            if (socialRes.success) {
                setSocialLinks(socialRes.links || []);
                setPrimaryProvider(socialRes.primaryProvider);
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

            console.log('이미지 업로드 시작 - memberNo:', member.no);
            const result = await uploadProfileImage(member.no, file);
            console.log('이미지 업로드 응답:', result);

            if (result.success) {
                console.log('업로드 성공 - 새 member:', result.member);
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
                console.log('업로드 실패:', result.message);
                setImageMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            console.error('이미지 업로드 에러:', error);
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
            const requestData = {
                no: member.no,
                name: profileForm.name,
                phone: profileForm.phone || ''
            };
            console.log('프로필 업데이트 요청:', requestData);

            const result = await updateProfile(requestData);
            console.log('프로필 업데이트 응답:', result);

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
                setProfileMessage({ type: 'error', text: result.message || '회원 정보 수정에 실패했습니다.' });
            }
        } catch (error) {
            console.error('프로필 업데이트 에러:', error);
            setProfileMessage({ type: 'error', text: error.response?.data?.message || '회원 정보 수정에 실패했습니다.' });
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

    // 소셜 연동하기
    const handleSocialLink = async (provider) => {
        // GitHub의 경우 GitHubOAuthController를 사용 (repo 권한 포함)
        if (provider === 'github') {
            try {
                // 콜백 후 돌아올 URL 저장
                localStorage.setItem('github_return_url', '/mypage');

                // GitHub OAuth URL 가져오기
                const response = await fetch(`/api/github/oauth/authorize?memberNo=${member.no}`);
                const data = await response.json();

                if (data.error) {
                    alert(data.error);
                    return;
                }

                // GitHub OAuth 페이지로 이동
                window.location.href = data.url;
            } catch (error) {
                console.error('GitHub 연동 시작 실패:', error);
                alert('GitHub 연동을 시작할 수 없습니다.');
            }
            return;
        }

        // 다른 소셜 로그인은 기존 Spring Security OAuth2 사용
        // localStorage에 연동 모드 정보 저장
        localStorage.setItem('socialLinkMode', 'true');
        localStorage.setItem('socialLinkMemberNo', member.no.toString());

        // OAuth 로그인 페이지로 이동
        window.location.href = `http://localhost:8081/oauth2/authorization/${provider}`;
    };

    // 소셜 연동 해제
    const handleSocialUnlink = async (provider) => {
        if (!window.confirm(`${provider} 계정 연동을 해제하시겠습니까?`)) {
            return;
        }

        try {
            // GitHub의 경우 GitHubOAuthController의 disconnect 엔드포인트 사용
            if (provider === 'github') {
                const response = await fetch(`/api/github/oauth/disconnect/${member.no}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const result = await response.json();

                if (result.success) {
                    // member 객체에서 githubUsername 제거
                    setMember(prev => ({ ...prev, githubUsername: null }));
                    setSocialMessage({ type: 'success', text: 'GitHub 계정 연동이 해제되었습니다.' });

                    // localStorage의 member도 업데이트
                    const storedMember = localStorage.getItem('member');
                    if (storedMember) {
                        const memberData = JSON.parse(storedMember);
                        delete memberData.githubUsername;
                        localStorage.setItem('member', JSON.stringify(memberData));
                    }
                } else {
                    setSocialMessage({ type: 'error', text: result.error || 'GitHub 연동 해제에 실패했습니다.' });
                }
                return;
            }

            // 다른 소셜 계정은 기존 방식 사용
            const result = await unlinkSocialAccount(member.no, provider);
            if (result.success) {
                setSocialLinks(result.links || []);
                setSocialMessage({ type: 'success', text: result.message });
            } else {
                setSocialMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setSocialMessage({ type: 'error', text: '연동 해제에 실패했습니다.' });
        }
    };

    // 연동 여부 확인
    const isLinked = (provider) => {
        // GitHub의 경우 member 테이블의 githubUsername도 확인
        if (provider === 'github') {
            return primaryProvider === 'github' ||
                   socialLinks.some(link => link.provider === 'github') ||
                   (member?.githubUsername && member.githubUsername.length > 0);
        }
        return primaryProvider === provider || socialLinks.some(link => link.provider === provider);
    };

    const sections = [
        { id: 'profile', label: '프로필 정보' },
        { id: 'social', label: '소셜 계정 연동' },
        { id: 'email', label: '이메일 변경' },
        { id: 'password', label: '비밀번호 변경' },
        { id: 'delete', label: '회원 탈퇴' }
    ];

    const renderNavIcon = (sectionId) => {
        const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

        switch (sectionId) {
            case 'profile':
                return (
                    <svg {...iconProps}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                );
            case 'social':
                return (
                    <svg {...iconProps}>
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                );
            case 'email':
                return (
                    <svg {...iconProps}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                );
            case 'password':
                return (
                    <svg {...iconProps}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                );
            case 'delete':
                return (
                    <svg {...iconProps}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                );
            default:
                return null;
        }
    };

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
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                    />
                                    <div
                                        className={`profile-avatar clickable ${uploadingImage ? 'uploading' : ''}`}
                                        onClick={() => !uploadingImage && fileInputRef.current?.click()}
                                        title="클릭하여 프로필 이미지 변경"
                                    >
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
                                        <div className="avatar-overlay">
                                            {uploadingImage ? (
                                                <div className="upload-spinner"></div>
                                            ) : (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                                    <circle cx="12" cy="13" r="4"/>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    {member?.profileImage && (
                                        <button
                                            className="avatar-delete-btn"
                                            onClick={handleImageDelete}
                                            disabled={uploadingImage}
                                            title="이미지 삭제"
                                        >
                                            이미지 삭제
                                        </button>
                                    )}
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
                                            <span className="nav-icon">{renderNavIcon(section.id)}</span>
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

                                {activeSection === 'social' && (
                                    <div className="section-content">
                                        <h3 className="section-title">소셜 계정 연동</h3>
                                        <p className="section-desc">다른 소셜 계정을 연동하여 로그인할 수 있습니다.</p>

                                        {socialMessage.text && (
                                            <div className={`form-message ${socialMessage.type}`} style={{ marginBottom: '20px' }}>
                                                {socialMessage.text}
                                            </div>
                                        )}

                                        <div className="social-links-container">
                                            {/* Google */}
                                            <div className={`social-link-item ${isLinked('google') ? 'linked' : ''}`}>
                                                <div className="social-link-info">
                                                    <span className="social-icon google">G</span>
                                                    <div className="social-details">
                                                        <span className="social-name">Google</span>
                                                        {isLinked('google') && (
                                                            <span className="social-status">
                                                                {primaryProvider === 'google' ? '(가입 계정)' : '연동됨'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isLinked('google') ? (
                                                    primaryProvider !== 'google' && (
                                                        <button
                                                            className="btn btn-outline btn-small"
                                                            onClick={() => handleSocialUnlink('google')}
                                                        >
                                                            연동 해제
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-small"
                                                        onClick={() => handleSocialLink('google')}
                                                    >
                                                        연동하기
                                                    </button>
                                                )}
                                            </div>

                                            {/* Naver */}
                                            <div className={`social-link-item ${isLinked('naver') ? 'linked' : ''}`}>
                                                <div className="social-link-info">
                                                    <span className="social-icon naver">N</span>
                                                    <div className="social-details">
                                                        <span className="social-name">Naver</span>
                                                        {isLinked('naver') && (
                                                            <span className="social-status">
                                                                {primaryProvider === 'naver' ? '(가입 계정)' : '연동됨'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isLinked('naver') ? (
                                                    primaryProvider !== 'naver' && (
                                                        <button
                                                            className="btn btn-outline btn-small"
                                                            onClick={() => handleSocialUnlink('naver')}
                                                        >
                                                            연동 해제
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-small"
                                                        onClick={() => handleSocialLink('naver')}
                                                    >
                                                        연동하기
                                                    </button>
                                                )}
                                            </div>

                                            {/* Kakao */}
                                            <div className={`social-link-item ${isLinked('kakao') ? 'linked' : ''}`}>
                                                <div className="social-link-info">
                                                    <span className="social-icon kakao">K</span>
                                                    <div className="social-details">
                                                        <span className="social-name">Kakao</span>
                                                        {isLinked('kakao') && (
                                                            <span className="social-status">
                                                                {primaryProvider === 'kakao' ? '(가입 계정)' : '연동됨'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isLinked('kakao') ? (
                                                    primaryProvider !== 'kakao' && (
                                                        <button
                                                            className="btn btn-outline btn-small"
                                                            onClick={() => handleSocialUnlink('kakao')}
                                                        >
                                                            연동 해제
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-small"
                                                        onClick={() => handleSocialLink('kakao')}
                                                    >
                                                        연동하기
                                                    </button>
                                                )}
                                            </div>

                                            {/* GitHub */}
                                            <div className={`social-link-item ${isLinked('github') ? 'linked' : ''}`}>
                                                <div className="social-link-info">
                                                    <span className="social-icon github">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                        </svg>
                                                    </span>
                                                    <div className="social-details">
                                                        <span className="social-name">GitHub</span>
                                                        {isLinked('github') && (
                                                            <span className="social-status">
                                                                {primaryProvider === 'github' ? '(가입 계정)' : '연동됨'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isLinked('github') ? (
                                                    primaryProvider !== 'github' && (
                                                        <button
                                                            className="btn btn-outline btn-small"
                                                            onClick={() => handleSocialUnlink('github')}
                                                        >
                                                            연동 해제
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-small"
                                                        onClick={() => handleSocialLink('github')}
                                                    >
                                                        연동하기
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="social-note">
                                            <p>가입 시 사용한 소셜 계정은 연동 해제할 수 없습니다.</p>
                                        </div>
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
