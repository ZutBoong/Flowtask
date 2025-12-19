import React, { useState, useEffect, useRef } from 'react';
import { taskupdate, updateTaskAssignees, updateTaskVerifiers, acceptTask, completeTask, approveTask, rejectTask, restartTask, archiveTask } from '../api/boardApi';
import { getTeamMembers } from '../api/teamApi';
import { uploadFile, getFilesByTask, deleteFile, formatFileSize, getFileIcon } from '../api/fileApi';
import CommentSection from './CommentSection';
import './TaskModal.css';

// 워크플로우 상태 상수
const WORKFLOW_STATUSES = {
    WAITING: { label: '대기', color: '#94a3b8' },
    IN_PROGRESS: { label: '진행', color: '#3b82f6' },
    REVIEW: { label: '검토', color: '#f59e0b' },
    DONE: { label: '완료', color: '#10b981' },
    REJECTED: { label: '반려', color: '#ef4444' }
};

const PRIORITIES = [
    { value: 'CRITICAL', label: '긴급', color: '#dc2626' },
    { value: 'HIGH', label: '높음', color: '#f59e0b' },
    { value: 'MEDIUM', label: '보통', color: '#3b82f6' },
    { value: 'LOW', label: '낮음', color: '#6b7280' }
];

function TaskModal({ task, teamId, onClose, onSave, loginMember }) {
    // 오늘 날짜 기본값
    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        taskId: task?.taskId || 0,
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || 'OPEN',
        assigneeNo: task?.assigneeNo || null,
        priority: task?.priority || 'MEDIUM',
        startDate: task?.startDate || today,
        dueDate: task?.dueDate || '',
        workflowStatus: task?.workflowStatus || 'WAITING',
        rejectionReason: task?.rejectionReason || ''
    });

    const [selectedAssignees, setSelectedAssignees] = useState(
        task?.assignees?.map(a => a.memberNo) || (task?.assigneeNo ? [task.assigneeNo] : [])
    );
    const [selectedVerifiers, setSelectedVerifiers] = useState(
        task?.verifiers?.map(v => v.memberNo) || []
    );
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [verifierSearch, setVerifierSearch] = useState('');
    const [startTime, setStartTime] = useState('');
    const [dueTime, setDueTime] = useState('');

    // 파일 관련 상태
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (teamId) {
            fetchTeamMembers();
        }
        if (task?.taskId) {
            fetchFiles();
        }
        // 기존 task 데이터에서 시간 추출
        if (task?.startDate) {
            setStartTime(extractTimeFromDateTime(task.startDate));
        }
        if (task?.dueDate) {
            setDueTime(extractTimeFromDateTime(task.dueDate));
        }
    }, [teamId, task?.taskId, task?.startDate, task?.dueDate]);

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(teamId);
            setTeamMembers(members || []);
        } catch (error) {
            console.error('팀 멤버 조회 실패:', error);
        }
    };

    // 파일 목록 조회
    const fetchFiles = async () => {
        if (!task?.taskId) return;
        try {
            const fileList = await getFilesByTask(task.taskId);
            setFiles(fileList || []);
        } catch (error) {
            console.error('파일 목록 조회 실패:', error);
        }
    };

    // 파일 업로드
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !task?.taskId) return;

        setUploading(true);
        try {
            const result = await uploadFile(file, teamId, task.taskId, loginMember.no);
            if (result.success) {
                await fetchFiles();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                alert(result.message || '파일 업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            alert('파일 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    // 파일 삭제
    const handleFileDelete = async (fileId) => {
        if (!window.confirm('파일을 삭제하시겠습니까?')) return;
        try {
            const result = await deleteFile(fileId);
            if (result.success) {
                await fetchFiles();
            }
        } catch (error) {
            console.error('파일 삭제 실패:', error);
            alert('파일 삭제에 실패했습니다.');
        }
    };

    // 파일 다운로드
    const handleFileDownload = (fileId, originalName) => {
        const downloadUrl = `/api/file/download/${fileId}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filterMembers = (searchTerm) => {
        if (!searchTerm.trim()) return teamMembers || [];
        return (teamMembers || []).filter(member =>
            member.memberName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value === '' ? null : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 날짜와 시간 결합
            const startDateTime = form.startDate && startTime
                ? `${formatDateForInput(form.startDate)}T${startTime}`
                : form.startDate;
            const dueDateTime = form.dueDate && dueTime
                ? `${formatDateForInput(form.dueDate)}T${dueTime}`
                : form.dueDate;

            const taskData = {
                ...form,
                assigneeNo: selectedAssignees.length > 0 ? selectedAssignees[0] : null,
                startDate: startDateTime || null,
                dueDate: dueDateTime || null
            };
            await taskupdate(taskData);

            // 복수 담당자 저장
            if (form.taskId) {
                const senderNo = loginMember?.no || null;
                await updateTaskAssignees(form.taskId, selectedAssignees, senderNo);
                await updateTaskVerifiers(form.taskId, selectedVerifiers, senderNo);
            }

            onSave && onSave(taskData);
            onClose();
        } catch (error) {
            console.error('태스크 저장 실패:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateTimeForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const extractTimeFromDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        // 시간이 00:00이면 빈 문자열 반환
        return (hours === '00' && minutes === '00') ? '' : `${hours}:${minutes}`;
    };

    // 워크플로우 액션 핸들러들
    const handleAccept = async () => {
        if (!window.confirm('이 태스크를 수락하시겠습니까?')) return;
        setLoading(true);
        try {
            await acceptTask(form.taskId, loginMember.no);
            setForm(prev => ({ ...prev, workflowStatus: 'IN_PROGRESS' }));
            onSave && onSave();
        } catch (error) {
            console.error('태스크 수락 실패:', error);
            alert(error.response?.data?.error || '수락 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!window.confirm('이 태스크의 작업을 완료 처리하시겠습니까?')) return;
        setLoading(true);
        try {
            await completeTask(form.taskId, loginMember.no);
            setForm(prev => ({ ...prev, workflowStatus: selectedVerifiers.length > 0 ? 'REVIEW' : 'DONE' }));
            onSave && onSave();
        } catch (error) {
            console.error('태스크 완료 처리 실패:', error);
            alert(error.response?.data?.error || '완료 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm('이 태스크를 승인하시겠습니까?')) return;
        setLoading(true);
        try {
            await approveTask(form.taskId, loginMember.no);
            setForm(prev => ({ ...prev, workflowStatus: 'DONE' }));
            onSave && onSave();
        } catch (error) {
            console.error('태스크 승인 실패:', error);
            alert(error.response?.data?.error || '승인 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('반려 사유를 입력해주세요.');
            return;
        }
        if (!window.confirm('이 태스크를 반려하시겠습니까?')) return;
        setLoading(true);
        try {
            await rejectTask(form.taskId, loginMember.no, rejectReason);
            setForm(prev => ({ ...prev, workflowStatus: 'REJECTED', rejectionReason: rejectReason }));
            onSave && onSave();
        } catch (error) {
            console.error('태스크 반려 실패:', error);
            alert(error.response?.data?.error || '반려 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRestart = async () => {
        if (!window.confirm('이 태스크의 재작업을 시작하시겠습니까?')) return;
        setLoading(true);
        try {
            await restartTask(form.taskId, loginMember.no);
            setForm(prev => ({ ...prev, workflowStatus: 'IN_PROGRESS' }));
            onSave && onSave();
        } catch (error) {
            console.error('태스크 재작업 시작 실패:', error);
            alert(error.response?.data?.error || '재작업 시작에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        const archiveNote = prompt('아카이브 메모를 입력하세요 (선택사항):');
        if (archiveNote === null) return; // 취소 버튼 클릭

        if (!window.confirm('이 태스크를 아카이브하시겠습니까?')) return;
        setLoading(true);
        try {
            await archiveTask(form.taskId, loginMember.no, archiveNote || '');
            alert('태스크가 아카이브되었습니다.');
            onClose();
            onSave && onSave();
        } catch (error) {
            console.error('태스크 아카이브 실패:', error);
            alert('아카이브에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 현재 사용자 역할 확인
    const isAssignee = loginMember && selectedAssignees.includes(loginMember.no);
    const isVerifier = loginMember && selectedVerifiers.includes(loginMember.no);

    // 현재 사용자의 수락/완료 상태 확인
    const currentAssignee = task?.assignees?.find(a => a.memberNo === loginMember?.no);
    const hasAccepted = currentAssignee?.accepted || false;
    const hasCompleted = currentAssignee?.completed || false;

    // 현재 사용자의 승인 상태 확인
    const currentVerifier = task?.verifiers?.find(v => v.memberNo === loginMember?.no);
    const hasApproved = currentVerifier?.approved || false;

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal-container" onClick={e => e.stopPropagation()}>
                <div className="task-modal-header">
                    <h3>태스크 수정</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="task-modal-content">
                    <div className="form-field">
                        <label>제목 *</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="태스크 제목을 입력하세요..."
                        />
                    </div>

                    <div className="form-field">
                        <label>설명</label>
                        <textarea
                            name="description"
                            value={form.description || ''}
                            onChange={handleChange}
                            placeholder="태스크에 대한 설명을 입력하세요..."
                            rows={4}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label>상태</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="OPEN">열림</option>
                                <option value="IN_PROGRESS">진행중</option>
                                <option value="RESOLVED">해결됨</option>
                                <option value="CLOSED">닫힘</option>
                                <option value="CANNOT_REPRODUCE">재현불가</option>
                                <option value="DUPLICATE">중복</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>우선순위</label>
                            <select
                                name="priority"
                                value={form.priority}
                                onChange={handleChange}
                            >
                                <option value="LOW">낮음</option>
                                <option value="MEDIUM">보통</option>
                                <option value="HIGH">높음</option>
                                <option value="URGENT">긴급</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label>시작일</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formatDateForInput(form.startDate)}
                                onChange={handleChange}
                            />
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                style={{ marginTop: '8px' }}
                            />
                        </div>

                        <div className="form-field">
                            <label>마감일</label>
                            <input
                                type="date"
                                name="dueDate"
                                value={formatDateForInput(form.dueDate)}
                                onChange={handleChange}
                            />
                            <input
                                type="time"
                                value={dueTime}
                                onChange={(e) => setDueTime(e.target.value)}
                                style={{ marginTop: '8px' }}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label>담당자</label>
                            <div className="selected-members">
                                {selectedAssignees.length > 0 && (
                                    <div className="selected-tags">
                                        {selectedAssignees.map(assigneeNo => {
                                            const member = teamMembers?.find(m => m.memberNo === assigneeNo);
                                            return member ? (
                                                <span key={assigneeNo} className="selected-tag">
                                                    {member.memberName}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedAssignees(prev => prev.filter(no => no !== assigneeNo))}
                                                        className="remove-tag-btn"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="search-wrapper">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="담당자 검색..."
                                    value={assigneeSearch}
                                    onChange={(e) => setAssigneeSearch(e.target.value)}
                                />
                                {assigneeSearch.trim() && (
                                    <div className="dropdown-list">
                                        {filterMembers(assigneeSearch).length > 0 ? (
                                            filterMembers(assigneeSearch).map(member => (
                                                <div
                                                    key={member.memberNo}
                                                    className={`dropdown-item ${selectedAssignees.includes(member.memberNo) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (selectedAssignees.includes(member.memberNo)) {
                                                            setSelectedAssignees(prev => prev.filter(no => no !== member.memberNo));
                                                        } else {
                                                            setSelectedAssignees(prev => [...prev, member.memberNo]);
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAssignees.includes(member.memberNo)}
                                                        onChange={() => {}}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span>{member.memberName}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="dropdown-empty">검색 결과가 없습니다.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-field">
                            <label>검증자</label>
                            <div className="selected-members">
                                {selectedVerifiers.length > 0 && (
                                    <div className="selected-tags">
                                        {selectedVerifiers.map(verifierNo => {
                                            const member = teamMembers?.find(m => m.memberNo === verifierNo);
                                            return member ? (
                                                <span key={verifierNo} className="selected-tag">
                                                    {member.memberName}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedVerifiers(prev => prev.filter(no => no !== verifierNo))}
                                                        className="remove-tag-btn"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="search-wrapper">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="검증자 검색..."
                                    value={verifierSearch}
                                    onChange={(e) => setVerifierSearch(e.target.value)}
                                />
                                {verifierSearch.trim() && (
                                    <div className="dropdown-list">
                                        {filterMembers(verifierSearch).length > 0 ? (
                                            filterMembers(verifierSearch).map(member => (
                                                <div
                                                    key={member.memberNo}
                                                    className={`dropdown-item ${selectedVerifiers.includes(member.memberNo) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (selectedVerifiers.includes(member.memberNo)) {
                                                            setSelectedVerifiers(prev => prev.filter(no => no !== member.memberNo));
                                                        } else {
                                                            setSelectedVerifiers(prev => [...prev, member.memberNo]);
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVerifiers.includes(member.memberNo)}
                                                        onChange={() => {}}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span>{member.memberName}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="dropdown-empty">검색 결과가 없습니다.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 워크플로우 액션 섹션 */}
                    {form.taskId > 0 && (
                        <section className="workflow-actions-section">
                            <h4>워크플로우 액션</h4>

                            {/* 담당자 액션: 수락 */}
                            {isAssignee && form.workflowStatus === 'WAITING' && !hasAccepted && (
                                <button
                                    type="button"
                                    className="btn btn-workflow btn-accept"
                                    onClick={handleAccept}
                                    disabled={loading}
                                >
                                    수락
                                </button>
                            )}

                            {/* 담당자 액션: 완료 */}
                            {isAssignee && form.workflowStatus === 'IN_PROGRESS' && !hasCompleted && (
                                <button
                                    type="button"
                                    className="btn btn-workflow btn-complete"
                                    onClick={handleComplete}
                                    disabled={loading}
                                >
                                    완료
                                </button>
                            )}

                            {/* 검증자 액션: 승인/반려 */}
                            {isVerifier && form.workflowStatus === 'REVIEW' && !hasApproved && (
                                <div className="verification-actions">
                                    <div className="form-group">
                                        <label>반려 사유 (반려 시 필수)</label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="반려 사유를 입력하세요..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="verification-buttons">
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={handleApprove}
                                            disabled={loading}
                                        >
                                            승인
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={handleReject}
                                            disabled={loading}
                                        >
                                            반려
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 담당자 액션: 재작업 시작 */}
                            {isAssignee && form.workflowStatus === 'REJECTED' && (
                                <button
                                    type="button"
                                    className="btn btn-workflow btn-restart"
                                    onClick={handleRestart}
                                    disabled={loading}
                                >
                                    재작업 시작
                                </button>
                            )}

                            {/* 상태 안내 메시지 */}
                            {form.workflowStatus === 'WAITING' && isAssignee && hasAccepted && (
                                <p className="workflow-info">다른 담당자의 수락을 기다리고 있습니다.</p>
                            )}
                            {form.workflowStatus === 'IN_PROGRESS' && isAssignee && hasCompleted && (
                                <p className="workflow-info">다른 담당자의 완료를 기다리고 있습니다.</p>
                            )}
                            {form.workflowStatus === 'REVIEW' && isVerifier && hasApproved && (
                                <p className="workflow-info">다른 검증자의 승인을 기다리고 있습니다.</p>
                            )}
                            {form.workflowStatus === 'DONE' && (
                                <p className="workflow-info success">모든 검증자가 승인하여 태스크가 완료되었습니다.</p>
                            )}
                        </section>
                    )}

                    {/* 댓글 섹션 */}
                    {form.taskId > 0 && (
                        <section className="comments-section">
                            <h2>댓글</h2>
                            <CommentSection
                                taskId={form.taskId}
                                loginMember={loginMember}
                            />
                        </section>
                    )}

                    {/* 첨부파일 섹션 */}
                    {form.taskId > 0 && (
                        <section className="files-section-wrapper">
                            <h2>첨부파일 {files.length > 0 && `(${files.length})`}</h2>

                            <div className="files-section">
                                {/* 파일 업로드 */}
                                <div className="file-upload-area">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-upload"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        {uploading ? '업로드 중...' : '📎 파일 첨부'}
                                    </button>
                                </div>

                                {/* 파일 목록 */}
                                <div className="files-list">
                                    {files.length === 0 ? (
                                        <div className="no-files">
                                            <p>첨부된 파일이 없습니다.</p>
                                        </div>
                                    ) : (
                                        files.map(file => (
                                            <div key={file.fileId} className="file-item">
                                                <div className="file-icon">
                                                    {getFileIcon(file.mimeType)}
                                                </div>
                                                <div className="file-info">
                                                    <div className="file-name" title={file.originalName}>
                                                        {file.originalName}
                                                    </div>
                                                    <div className="file-meta">
                                                        {formatFileSize(file.fileSize)} • {file.uploaderName} • {new Date(file.uploadedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="file-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        onClick={() => handleFileDownload(file.fileId, file.originalName)}
                                                        title="다운로드"
                                                    >
                                                        ⬇️
                                                    </button>
                                                    {loginMember?.no === file.uploaderNo && (
                                                        <button
                                                            type="button"
                                                            className="btn-icon btn-delete"
                                                            onClick={() => handleFileDelete(file.fileId)}
                                                            title="삭제"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </form>

                <div className="task-modal-footer">
                    <div className="footer-left">
                        {form.taskId > 0 && (
                            <button
                                type="button"
                                className="archive-btn"
                                onClick={handleArchive}
                                disabled={loading}
                                title="이 태스크를 아카이브합니다"
                            >
                                📦 아카이브
                            </button>
                        )}
                    </div>
                    <div className="footer-right">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            취소
                        </button>
                        <button type="submit" className="save-btn" disabled={loading} onClick={handleSubmit}>
                            {loading ? '저장중...' : '저장'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TaskModal;
