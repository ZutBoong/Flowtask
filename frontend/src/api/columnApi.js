import axiosInstance from './axiosInstance';

// ============================================
// 컬럼 즐겨찾기 API
// ============================================

// 즐겨찾기 추가
export const addColumnFavorite = async (columnId, memberNo) => {
    const response = await axiosInstance.post(`/api/column/${columnId}/favorite/${memberNo}`);
    return response.data;
};

// 즐겨찾기 삭제
export const removeColumnFavorite = async (columnId, memberNo) => {
    const response = await axiosInstance.delete(`/api/column/${columnId}/favorite/${memberNo}`);
    return response.data;
};

// 즐겨찾기 토글
export const toggleColumnFavorite = async (columnId, memberNo) => {
    const response = await axiosInstance.post(`/api/column/${columnId}/favorite/${memberNo}/toggle`);
    return response.data;
};

// 즐겨찾기 여부 확인
export const checkColumnFavorite = async (columnId, memberNo) => {
    const response = await axiosInstance.get(`/api/column/${columnId}/favorite/${memberNo}`);
    return response.data;
};

// 멤버별 즐겨찾기 목록
export const getColumnFavorites = async (memberNo) => {
    const response = await axiosInstance.get(`/api/column/favorites/member/${memberNo}`);
    return response.data;
};

// ============================================
// 컬럼 아카이브 API
// ============================================

// 컬럼 아카이브 생성
export const archiveColumn = async (columnId, memberNo, archiveNote = '') => {
    const response = await axiosInstance.post(`/api/column/${columnId}/archive`, {
        memberNo,
        archiveNote
    });
    return response.data;
};

// 아카이브 삭제
export const deleteColumnArchive = async (archiveId) => {
    const response = await axiosInstance.delete(`/api/column/archive/${archiveId}`);
    return response.data;
};

// 아카이브 상세 조회
export const getColumnArchive = async (archiveId) => {
    const response = await axiosInstance.get(`/api/column/archive/${archiveId}`);
    return response.data;
};

// 멤버별 아카이브 목록
export const getColumnArchives = async (memberNo) => {
    const response = await axiosInstance.get(`/api/column/archives/member/${memberNo}`);
    return response.data;
};

// 멤버의 아카이브 수
export const countColumnArchives = async (memberNo) => {
    const response = await axiosInstance.get(`/api/column/archives/member/${memberNo}/count`);
    return response.data;
};
