import axiosInstance from './axiosInstance';

const API_PATH = '/api/github/issue';
const OAUTH_PATH = '/api/github/oauth';

// ========== GitHub OAuth ==========

// GitHub 인증 URL 가져오기 (계정 연동용)
export const getGitHubAuthorizeUrl = async (memberNo) => {
    const response = await axiosInstance.get(`${OAUTH_PATH}/authorize?memberNo=${memberNo}`);
    return response.data;
};

// GitHub OAuth 콜백 처리 (계정 연동용)
export const handleGitHubCallback = async (code, state) => {
    const response = await axiosInstance.post(`${OAUTH_PATH}/callback`, { code, state });
    return response.data;
};

// ========== GitHub 로그인 ==========

// GitHub 로그인 URL 가져오기
export const getGitHubLoginUrl = async () => {
    const response = await axiosInstance.get(`${OAUTH_PATH}/login/authorize`);
    return response.data;
};

// GitHub 로그인 콜백 처리
export const handleGitHubLoginCallback = async (code) => {
    const response = await axiosInstance.post(`${OAUTH_PATH}/login/callback`, { code, state: 'login' });
    return response.data;
};

// GitHub 연동 해제
export const disconnectGitHub = async (memberNo) => {
    const response = await axiosInstance.delete(`${OAUTH_PATH}/disconnect/${memberNo}`);
    return response.data;
};

// GitHub 연동 상태 조회
export const getGitHubStatus = async (memberNo) => {
    const response = await axiosInstance.get(`${OAUTH_PATH}/status/${memberNo}`);
    return response.data;
};

// ========== Issue Link Management ==========

// Task-Issue 연결
export const linkTaskToIssue = async (taskId, issueNumber, teamId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/link`, {
        taskId,
        issueNumber,
        teamId,
        memberNo
    });
    return response.data;
};

// Task-Issue 연결 해제
export const unlinkTask = async (taskId) => {
    const response = await axiosInstance.delete(`${API_PATH}/link/${taskId}`);
    return response.data;
};

// 동기화 상태 조회
export const getSyncStatus = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/status/${taskId}`);
    return response.data;
};

// ========== Create Operations ==========

// Task에서 GitHub Issue 생성
export const createIssueFromTask = async (taskId, teamId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/create-from-task/${taskId}?teamId=${teamId}&memberNo=${memberNo}`);
    return response.data;
};

// ========== Sync Operations ==========

// Task를 GitHub에 동기화 (Push)
export const syncToGitHub = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/sync/push/${taskId}?memberNo=${memberNo}`);
    return response.data;
};

// ========== Conflict Management ==========

// 팀의 충돌 목록 조회
export const getConflicts = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/conflicts/${teamId}`);
    return response.data;
};

// 충돌 해결
export const resolveConflict = async (mappingId, resolution, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/conflicts/${mappingId}/resolve?resolution=${resolution}&memberNo=${memberNo}`);
    return response.data;
};

// ========== User Mapping ==========

// GitHub 사용자 매핑 설정
export const setUserMapping = async (memberNo, githubUsername) => {
    const response = await axiosInstance.put(`${API_PATH}/user/mapping`, {
        memberNo,
        githubUsername
    });
    return response.data;
};

// 사용자 매핑 조회
export const getUserMapping = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/user/mapping/${memberNo}`);
    return response.data;
};

// 팀의 사용자 매핑 목록 조회
export const getTeamUserMappings = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/user/mappings/team/${teamId}`);
    return response.data;
};

// 사용자 매핑 삭제
export const deleteUserMapping = async (memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/user/mapping/${memberNo}`);
    return response.data;
};

// ========== Team Issue List ==========

// 팀의 연결된 Issue 목록 조회
export const getTeamIssueMappings = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/team/${teamId}`);
    return response.data;
};

// ========== GitHub Issues (Direct API) ==========

// GitHub Issues 목록 조회 (연결되지 않은 Issue 선택용)
export const listGitHubIssues = async (teamId, memberNo, state = 'open') => {
    const response = await axiosInstance.get(`${API_PATH}/team/${teamId}/issues?memberNo=${memberNo}&state=${state}`);
    return response.data;
};

// ========== Repository Management ==========

// Webhook 설정 정보 조회
export const getWebhookConfig = async () => {
    const response = await axiosInstance.get(`${OAUTH_PATH}/webhook-config`);
    return response.data;
};

// 사용자의 GitHub 저장소 목록 조회
export const listUserRepositories = async (memberNo) => {
    const response = await axiosInstance.get(`${OAUTH_PATH}/repos/${memberNo}`);
    return response.data;
};

// 팀에 GitHub 저장소 연결 (자동 Webhook 등록)
export const connectRepository = async (teamId, memberNo, repoFullName, webhookUrl) => {
    const response = await axiosInstance.post(`${OAUTH_PATH}/connect-repo`, {
        teamId,
        memberNo,
        repoFullName,
        webhookUrl
    });
    return response.data;
};

// 팀의 GitHub 저장소 연결 해제
export const disconnectRepository = async (teamId, memberNo) => {
    const response = await axiosInstance.delete(`${OAUTH_PATH}/disconnect-repo/${teamId}?memberNo=${memberNo}`);
    return response.data;
};

// ========== Bulk Sync ==========

// GitHub Issues 일괄 가져오기
export const bulkImportIssues = async (teamId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/bulk/import/${teamId}?memberNo=${memberNo}`);
    return response.data;
};

// Tasks 일괄 내보내기
export const bulkExportTasks = async (teamId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/bulk/export/${teamId}?memberNo=${memberNo}`);
    return response.data;
};

// 연결되지 않은 Issue/Task 개수 조회
export const getUnlinkedCounts = async (teamId, memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/bulk/counts/${teamId}?memberNo=${memberNo}`);
    return response.data;
};
