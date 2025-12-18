import axiosInstance from './axiosInstance';

// 파일 업로드
export const uploadFile = async (file, teamId, taskId, uploaderNo) => {
    const formData = new FormData();
    formData.append('file', file);
    if (teamId) formData.append('teamId', teamId);
    if (taskId) formData.append('taskId', taskId);
    formData.append('uploaderNo', uploaderNo);

    const response = await axiosInstance.post('/api/file/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// 팀별 파일 목록
export const getFilesByTeam = async (teamId) => {
    const response = await axiosInstance.get(`/api/file/team/${teamId}`);
    return response.data;
};

// 태스크별 파일 목록
export const getFilesByTask = async (taskId) => {
    const response = await axiosInstance.get(`/api/file/task/${taskId}`);
    return response.data;
};

// 파일 상세
export const getFile = async (fileId) => {
    const response = await axiosInstance.get(`/api/file/${fileId}`);
    return response.data;
};

// 파일 다운로드 URL
export const getDownloadUrl = (fileId) => {
    return `/api/file/download/${fileId}`;
};

// 파일 삭제
export const deleteFile = async (fileId) => {
    const response = await axiosInstance.delete(`/api/file/${fileId}`);
    return response.data;
};

// 파일 크기 포맷
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 파일 아이콘 (mime type 기반)
export const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text')) return '📝';
    return '📄';
};
