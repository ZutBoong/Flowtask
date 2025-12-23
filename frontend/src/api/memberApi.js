import axiosInstance from './axiosInstance';

// 회원가입
export const register = async (member) => {
    const response = await axiosInstance.post('/api/member/register', member);
    return response.data;
};

// 아이디 중복 체크
export const checkUserid = async (userid) => {
    const response = await axiosInstance.get('/api/member/check-userid', {
        params: { userid }
    });
    return response.data;
};

// 이메일 중복 체크
export const checkEmail = async (email) => {
    const response = await axiosInstance.get('/api/member/check-email', {
        params: { email }
    });
    return response.data;
};

// 로그인
export const login = async (member) => {
    const response = await axiosInstance.post('/api/member/login', member);
    return response.data;
};

// 아이디 찾기
export const findUserid = async (member) => {
    const response = await axiosInstance.post('/api/member/find-userid', member);
    return response.data;
};

// 비밀번호 찾기 (회원 확인)
export const findPassword = async (member) => {
    const response = await axiosInstance.post('/api/member/find-password', member);
    return response.data;
};

// 비밀번호 변경
export const resetPassword = async (member) => {
    const response = await axiosInstance.put('/api/member/reset-password', member);
    return response.data;
};

// 로그아웃
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('member');
};

// 회원 정보 조회 (마이페이지)
export const getProfile = async (no) => {
    const response = await axiosInstance.get(`/api/member/profile/${no}`);
    return response.data;
};

// 회원 정보 수정 (마이페이지)
export const updateProfile = async (member) => {
    const response = await axiosInstance.put('/api/member/update', member);
    return response.data;
};

// 비밀번호 변경 (마이페이지)
export const changePassword = async (data) => {
    const response = await axiosInstance.put('/api/member/change-password', data);
    return response.data;
};

// 아이디 또는 이메일로 회원 검색 (팀 초대용)
export const searchMember = async (keyword) => {
    const response = await axiosInstance.get('/api/member/search', {
        params: { keyword }
    });
    return response.data;
};

// 회원 탈퇴
export const deleteMember = async (no) => {
    const response = await axiosInstance.delete(`/api/member/delete/${no}`);
    return response.data;
};

// 이메일 변경 (인증 완료 후)
export const changeEmail = async (data) => {
    const response = await axiosInstance.put('/api/member/change-email', data);
    return response.data;
};

// 비밀번호 변경 (이메일 인증 완료 후)
export const changePasswordVerified = async (data) => {
    const response = await axiosInstance.put('/api/member/change-password-verified', data);
    return response.data;
};

// 비밀번호 변경용 인증 코드 발송
export const sendPasswordChangeCode = async (email) => {
    const response = await axiosInstance.post('/api/email/send-password-change-code', { email });
    return response.data;
};

// 이메일 변경용 인증 코드 발송 (새 이메일로)
export const sendEmailChangeCode = async (newEmail) => {
    const response = await axiosInstance.post('/api/email/send-email-change-code', { newEmail });
    return response.data;
};

// 인증 코드 확인
export const verifyCode = async (email, code, type) => {
    const response = await axiosInstance.post('/api/email/verify-code', { email, code, type });
    return response.data;
};

// 프로필 이미지 업로드
export const uploadProfileImage = async (memberNo, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('memberNo', memberNo);

    const response = await axiosInstance.post('/api/member/profile-image/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// 프로필 이미지 삭제
export const deleteProfileImage = async (memberNo) => {
    const response = await axiosInstance.delete(`/api/member/profile-image/${memberNo}`);
    return response.data;
};

// 프로필 이미지 URL 생성
export const getProfileImageUrl = (memberNo) => {
    return `/api/member/profile-image/${memberNo}`;
};
