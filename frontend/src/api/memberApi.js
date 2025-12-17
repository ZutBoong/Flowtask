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
