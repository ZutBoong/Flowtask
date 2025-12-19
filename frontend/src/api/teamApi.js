import axiosInstance from './axiosInstance';

const API_PATH = '/api/team';

// 팀 생성
export const createTeam = async (team) => {
    const response = await axiosInstance.post(`${API_PATH}/create`, team);
    return response.data;
};

// 팀 코드로 가입
export const joinTeam = async (teamCode, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/join`, { teamCode, memberNo });
    return response.data;
};

// 내 팀 목록
export const getMyTeams = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/my-teams/${memberNo}`);
    return response.data;
};

// 팀 정보 조회
export const getTeam = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/${teamId}`);
    return response.data;
};

// 팀 멤버 목록
export const getTeamMembers = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/${teamId}/members`);
    return response.data;
};

// 팀 탈퇴
export const leaveTeam = async (teamId, memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/${teamId}/leave/${memberNo}`);
    return response.data;
};

// 팀 삭제
export const deleteTeam = async (teamId) => {
    const response = await axiosInstance.delete(`${API_PATH}/${teamId}`);
    return response.data;
};

// 팀원 강퇴 (팀장만)
export const kickMember = async (teamId, memberNo, leaderNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/${teamId}/kick/${memberNo}`, {
        params: { leaderNo }
    });
    return response.data;
};

// 팀원 초대 (회원번호로 직접 추가)
export const inviteMember = async (teamId, memberNo, leaderNo) => {
    const response = await axiosInstance.post(`${API_PATH}/${teamId}/invite`, {
        memberNo,
        leaderNo
    });
    return response.data;
};

// 팀 정보 수정
export const updateTeam = async (teamId, team) => {
    const response = await axiosInstance.put(`${API_PATH}/${teamId}`, team);
    return response.data;
};

// 팀 설명 수정
export const updateTeamDescription = async (teamId, description) => {
    const response = await axiosInstance.put(`${API_PATH}/${teamId}/description`, { description });
    return response.data;
};

// 팀 코드 재생성
export const regenerateTeamCode = async (teamId, leaderNo) => {
    const response = await axiosInstance.post(`${API_PATH}/${teamId}/regenerate-code`, { leaderNo });
    return response.data;
};

// 모든 회원 목록 조회 (팀 생성 시 초대용)
export const getAllMembers = async () => {
    const response = await axiosInstance.get('/api/member/all');
    return response.data;
};
