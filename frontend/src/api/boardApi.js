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

// 태스크 담당자 변경 (senderNo가 있으면 알림 발송)
export const updateTaskAssignee = async (taskId, assigneeNo, senderNo = null) => {
    const url = senderNo
        ? `${API_PATH}/task/${taskId}/assignee?senderNo=${senderNo}`
        : `${API_PATH}/task/${taskId}/assignee`;
    const response = await axiosInstance.put(url, { assigneeNo });
    return response.data;
};

// ========== Task Workflow API (NEW) ==========

// 담당자가 태스크 수락
export const acceptTask = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/task/workflow/${taskId}/accept?memberNo=${memberNo}`);
    return response.data;
};

// 담당자가 태스크 완료 처리
export const completeTask = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/task/workflow/${taskId}/complete?memberNo=${memberNo}`);
    return response.data;
};

// 검증자가 태스크 승인
export const approveTask = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/task/workflow/${taskId}/approve?memberNo=${memberNo}`);
    return response.data;
};

// 검증자가 태스크 반려
export const rejectTask = async (taskId, memberNo, reason) => {
    const response = await axiosInstance.post(`${API_PATH}/task/workflow/${taskId}/reject?memberNo=${memberNo}`, { reason });
    return response.data;
};

// 반려된 태스크 재작업 시작
export const declineTask = async (taskId, memberNo, reason) => {
    const response = await axiosInstance.post(`${API_PATH}/task/workflow/${taskId}/decline?memberNo=${memberNo}`, { reason });
    return response.data;
};

export const restartTask = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/task/workflow/${taskId}/restart?memberNo=${memberNo}`);
    return response.data;
};

// ========== Task Verifiers (복수 검증자) API (NEW) ==========

// 태스크별 검증자 목록 조회
export const getTaskVerifiers = async (taskId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/${taskId}/verifiers`);
    return response.data;
};

// 검증자 추가
export const addTaskVerifier = async (taskId, memberNo, senderNo = null) => {
    const url = senderNo
        ? `${API_PATH}/task/${taskId}/verifier?senderNo=${senderNo}`
        : `${API_PATH}/task/${taskId}/verifier`;
    const response = await axiosInstance.post(url, { memberNo });
    return response.data;
};

// 검증자 삭제
export const removeTaskVerifier = async (taskId, memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/${taskId}/verifier/${memberNo}`);
    return response.data;
};

// 검증자 일괄 변경
export const updateTaskVerifiers = async (taskId, memberNos, senderNo = null) => {
    const url = senderNo
        ? `${API_PATH}/task/${taskId}/verifiers?senderNo=${senderNo}`
        : `${API_PATH}/task/${taskId}/verifiers`;
    const response = await axiosInstance.put(url, { memberNos });
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

// ========== Timeline API ==========

// 태스크 날짜 변경 (타임라인용)
export const updateTaskDates = async (taskId, startDate, dueDate) => {
    const response = await axiosInstance.put(`${API_PATH}/task/${taskId}/dates`, { startDate, dueDate });
    return response.data;
};

// ========== Task Favorites API ==========

// 태스크 즐겨찾기 추가
export const addTaskFavorite = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/favorite/${memberNo}`);
    return response.data;
};

// 태스크 즐겨찾기 삭제
export const removeTaskFavorite = async (taskId, memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/${taskId}/favorite/${memberNo}`);
    return response.data;
};

// 태스크 즐겨찾기 토글
export const toggleTaskFavorite = async (taskId, memberNo) => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/favorite/${memberNo}/toggle`);
    return response.data;
};

// 태스크 즐겨찾기 여부 확인
export const checkTaskFavorite = async (taskId, memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/task/${taskId}/favorite/${memberNo}`);
    return response.data;
};

// 멤버별 즐겨찾기한 태스크 목록
export const getTaskFavorites = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/task/favorites/member/${memberNo}`);
    return response.data;
};

// 멤버별 팀 내 즐겨찾기한 태스크 목록
export const getTaskFavoritesByTeam = async (memberNo, teamId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/favorites/member/${memberNo}/team/${teamId}`);
    return response.data;
};

// ========== Task Archives API ==========

// 태스크 아카이브 생성
export const archiveTask = async (taskId, memberNo, archiveNote = '') => {
    const response = await axiosInstance.post(`${API_PATH}/task/${taskId}/archive`, {
        memberNo,
        archiveNote
    });
    return response.data;
};

// 아카이브 삭제 (archiveId로)
export const deleteTaskArchive = async (archiveId) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/archive/${archiveId}`);
    return response.data;
};

// 아카이브 해제 (taskId와 memberNo로)
export const unarchiveTask = async (taskId, memberNo) => {
    const response = await axiosInstance.delete(`${API_PATH}/task/${taskId}/archive?memberNo=${memberNo}`);
    return response.data;
};

// 아카이브 상세 조회
export const getTaskArchive = async (archiveId) => {
    const response = await axiosInstance.get(`${API_PATH}/task/archive/${archiveId}`);
    return response.data;
};

// 멤버별 아카이브 목록
export const getTaskArchives = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/task/archives/member/${memberNo}`);
    return response.data;
};

// 멤버의 아카이브 수
export const countTaskArchives = async (memberNo) => {
    const response = await axiosInstance.get(`${API_PATH}/task/archives/member/${memberNo}/count`);
    return response.data;
};
