import axiosInstance from './axiosInstance';

// 섹션 생성
export const createSection = async (section) => {
    const response = await axiosInstance.post('/api/section', section);
    return response.data;
};

// 팀별 섹션 목록
export const getSectionsByTeam = async (teamId) => {
    const response = await axiosInstance.get(`/api/section/team/${teamId}`);
    return response.data;
};

// 팀별 섹션 목록 (태스크 포함)
export const getSectionsWithTasks = async (teamId) => {
    const response = await axiosInstance.get(`/api/section/team/${teamId}/with-tasks`);
    return response.data;
};

// 섹션 상세
export const getSection = async (sectionId) => {
    const response = await axiosInstance.get(`/api/section/${sectionId}`);
    return response.data;
};

// 섹션 수정
export const updateSection = async (sectionId, section) => {
    const response = await axiosInstance.put(`/api/section/${sectionId}`, section);
    return response.data;
};

// 섹션 위치 변경
export const updateSectionPosition = async (sectionId, position) => {
    const response = await axiosInstance.put(`/api/section/${sectionId}/position`, { position });
    return response.data;
};

// 섹션 삭제
export const deleteSection = async (sectionId) => {
    const response = await axiosInstance.delete(`/api/section/${sectionId}`);
    return response.data;
};
