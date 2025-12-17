import axiosInstance from './axiosInstance';

const API_PATH = '/api';

// ========== Column API ==========

// 컬럼 생성
export const columnwrite = async (column) => {
    const response = await axiosInstance.post(`${API_PATH}/columnwrite`, column);
    return response.data;
};

// 컬럼 목록
export const columnlist = async () => {
    const response = await axiosInstance.get(`${API_PATH}/columnlist`);
    return response.data;
};

// 팀별 컬럼 목록
export const columnlistByTeam = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/columnlist/team/${teamId}`);
    return response.data;
};

// 컬럼 상세
export const columncontent = async (columnId) => {
    const response = await axiosInstance.get(`${API_PATH}/columncontent/${columnId}`);
    return response.data;
};

// 컬럼 수정
export const columnupdate = async (column) => {
    const response = await axiosInstance.put(`${API_PATH}/columnupdate`, column);
    return response.data;
};

// 컬럼 삭제
export const columndelete = async (columnId) => {
    const response = await axiosInstance.delete(`${API_PATH}/columndelete/${columnId}`);
    return response.data;
};

// 컬럼 위치 변경
export const columnposition = async (column) => {
    const response = await axiosInstance.put(`${API_PATH}/columnposition`, column);
    return response.data;
};

// ========== Task API ==========

// 태스크 생성
export const taskwrite = async (task) => {
    const response = await axiosInstance.post(`${API_PATH}/taskwrite`, task);
    return response.data;
};

// 전체 태스크 목록
export const tasklist = async () => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist`);
    return response.data;
};

// 팀별 태스크 목록
export const tasklistByTeam = async (teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/team/${teamId}`);
    return response.data;
};

// 프로젝트별 컬럼 목록
export const columnlistByProject = async (projectId) => {
    const response = await axiosInstance.get(`${API_PATH}/columnlist/project/${projectId}`);
    return response.data;
};

// 프로젝트별 태스크 목록
export const tasklistByProject = async (projectId) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/project/${projectId}`);
    return response.data;
};

// 컬럼별 태스크 목록
export const tasklistByColumn = async (columnId) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/${columnId}`);
    return response.data;
};

// 태스크 상세
export const taskcontent = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/taskcontent/${taskId}`);
    return response.data;
};

// 태스크 수정
export const taskupdate = async (task) => {
    const response = await axiosInstance.put(`${API_PATH}/taskupdate`, task);
    return response.data;
};

// 태스크 삭제
export const taskdelete = async (taskId) => {
    const response = await axiosInstance.delete(`${API_PATH}/taskdelete/${taskId}`);
    return response.data;
};

// 태스크 위치 변경
export const taskposition = async (task) => {
    const response = await axiosInstance.put(`${API_PATH}/taskposition`, task);
    return response.data;
};

// ========== Issue Tracker API ==========

// 담당자별 태스크 목록 (내 이슈)
export const tasklistByAssignee = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/assignee/${memberNo}`);
    return response.data;
};

// 상태별 태스크 목록 (팀 내)
export const tasklistByStatusAndTeam = async (teamId, status) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/team/${teamId}/status/${status}`);
    return response.data;
};

// 태스크 상태 변경
export const updateTaskStatus = async (taskId, status) => {
    const response = await axiosInstance.put(`${API_PATH}/task/${taskId}/status`, { status });
    return response.data;
};

// 태스크 담당자 변경 (senderNo가 있으면 알림 발송)
export const updateTaskAssignee = async (taskId, assigneeNo, senderNo = null) => {
    const url = senderNo
        ? `${API_PATH}/task/${taskId}/assignee?senderNo=${senderNo}`
        : `${API_PATH}/task/${taskId}/assignee`;
    const response = await axiosInstance.put(url, { assigneeNo });
    return response.data;
};

// ========== Verifier (검증자) API ==========

// 검증자 지정
export const updateTaskVerifier = async (taskId, verifierNo) => {
    const response = await axiosInstance.put(`${API_PATH}/task/${taskId}/verifier`, { verifierNo });
    return response.data;
};

// 검증 승인
export const approveTask = async (taskId, verificationNotes = '') => {
    const response = await axiosInstance.put(`${API_PATH}/task/${taskId}/verify/approve`, { verificationNotes });
    return response.data;
};

// 검증 반려
export const rejectTask = async (taskId, verificationNotes = '') => {
    const response = await axiosInstance.put(`${API_PATH}/task/${taskId}/verify/reject`, { verificationNotes });
    return response.data;
};

// 내 검증 대기 목록
export const tasklistPendingVerification = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/verification/pending/${memberNo}`);
    return response.data;
};

// ========== Calendar API ==========

// 날짜 범위별 태스크 조회 (캘린더용)
export const tasklistByDateRange = async (teamId, startDate, endDate) => {
    const response = await axiosInstance.get(`${API_PATH}/tasklist/team/${teamId}/calendar`, {
        params: { start: startDate, end: endDate }
    });
    return response.data;
};

// ========== Task Assignees (복수 담당자) API ==========

// 태스크별 담당자 목록 조회
export const getTaskAssignees = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/${taskId}/assignees`);
    return response.data;
};

// 담당자 추가
export const addTaskAssignee = async (taskId, memberNo, senderNo = null) => {
    const url = senderNo
        ? `${API_PATH}/task/${taskId}/assignees?senderNo=${senderNo}`
        : `${API_PATH}/task/${taskId}/assignees`;
    const response = await axiosInstance.post(url, { memberNo });
    return response.data;
};

// 담당자 삭제
export const removeTaskAssignee = async (taskId, memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/${taskId}/assignees/${memberNo}`);
    return response.data;
};

// 담당자 일괄 변경
export const updateTaskAssignees = async (taskId, memberNos, senderNo = null) => {
    const url = senderNo
        ? `${API_PATH}/task/${taskId}/assignees?senderNo=${senderNo}`
        : `${API_PATH}/task/${taskId}/assignees`;
    const response = await axiosInstance.put(url, { memberNos });
    return response.data;
};
