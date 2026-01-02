import React, { useState, useEffect, useRef, useCallback } from 'react';
import { taskupdate, updateTaskAssignees, updateTaskVerifiers, archiveTask, unarchiveTask, toggleTaskFavorite, checkTaskFavorite } from '../api/boardApi';
import { getTeamMembers, getTeam } from '../api/teamApi';
import { uploadFile, getFilesByTask, deleteFile, formatFileSize, getFileIcon } from '../api/fileApi';
import CommentSection from './CommentSection';
import CommitBrowser from './CommitBrowser';
import LinkedCommits from './LinkedCommits';
import GitHubIssueLink from './GitHubIssueLink';
import './TaskDetailView.css';

// 워크플로우 상태 표시
const WORKFLOW_STATUS = {
    WAITING: { label: '대기중', color: '#94a3b8', bg: '#f1f5f9' },
    IN_PROGRESS: { label: '진행중', color: '#3b82f6', bg: '#dbeafe' },
    REVIEW: { label: '검토중', color: '#f59e0b', bg: '#fef3c7' },
    DONE: { label: '완료', color: '#10b981', bg: '#d1fae5' },
    REJECTED: { label: '반려', color: '#ef4444', bg: '#fee2e2' },
    DECLINED: { label: '거부됨', color: '#6b7280', bg: '#f3f4f6' }
};


function TaskDetailView({ task, teamId, onClose, onUpdate, loginMember }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [files, setFiles] = useState([]);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isArchived, setIsArchived] = useState(false);
    const [hasGithubRepo, setHasGithubRepo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // 편집용 폼 상태
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: null, // 우선순위 미설정
        startDate: '',
        startTime: '',
        dueDate: '',
        dueTime: ''
    });
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [selectedVerifiers, setSelectedVerifiers] = useState([]);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [verifierSearch, setVerifierSearch] = useState('');

    const [showCommitBrowser, setShowCommitBrowser] = useState(false);
    const commentSectionRef = useRef(null);
    const linkedCommitsRef = useRef(null);
    const fileInputRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const initialLoadRef = useRef(true);

    // task 변경 시 폼 초기화
    useEffect(() => {
        if (task) {
            initialLoadRef.current = true;
            setForm({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || null, // 우선순위 미설정이면 null
                startDate: formatDateForInput(task.startDate),
                startTime: extractTimeFromDateTime(task.startDate),
                dueDate: formatDateForInput(task.dueDate),
                dueTime: extractTimeFromDateTime(task.dueDate)
            });
            setSelectedAssignees(task.assignees?.map(a => a.memberNo) || []);
            setSelectedVerifiers(task.verifiers?.map(v => v.memberNo) || []);
            // 초기 로드 후 플래그 해제
            setTimeout(() => {
                initialLoadRef.current = false;
            }, 100);
        }
    }, [task]);

    useEffect(() => {
        if (teamId) {
            fetchTeamMembers();
            checkGithubRepo();
        }
        if (task?.taskId) {
            fetchFiles();
            fetchFavoriteStatus();
        }
    }, [teamId, task?.taskId]);

    // 자동 저장 함수
    const autoSave = useCallback(async (updatedForm, updatedAssignees, updatedVerifiers) => {
        if (!task?.taskId || initialLoadRef.current) return;

        setSaving(true);
        try {
            const startDateTime = updatedForm.startDate && updatedForm.startTime
                ? `${updatedForm.startDate}T${updatedForm.startTime}`
                : updatedForm.startDate || null;
            const dueDateTime = updatedForm.dueDate && updatedForm.dueTime
                ? `${updatedForm.dueDate}T${updatedForm.dueTime}`
                : updatedForm.dueDate || null;

            const taskData = {
                taskId: task.taskId,
                title: updatedForm.title,
                description: updatedForm.description,
                priority: updatedForm.priority,
                startDate: startDateTime,
                dueDate: dueDateTime,
                assigneeNo: updatedAssignees.length > 0 ? updatedAssignees[0] : null
            };

            await taskupdate(taskData);

            const senderNo = loginMember?.no || null;
            await updateTaskAssignees(task.taskId, updatedAssignees, senderNo);
            await updateTaskVerifiers(task.taskId, updatedVerifiers, senderNo);

            // onUpdate는 패널 닫을 때만 호출 (자동저장 시에는 호출하지 않음)
        } catch (error) {
            console.error('자동 저장 실패:', error);
        } finally {
            setSaving(false);
        }
    }, [task?.taskId, loginMember?.no]);

    // 디바운스된 자동 저장
    const debouncedSave = useCallback((updatedForm, updatedAssignees, updatedVerifiers) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            autoSave(updatedForm, updatedAssignees, updatedVerifiers);
        }, 800);
    }, [autoSave]);

    // 컴포넌트 언마운트 시 타임아웃 정리
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const extractTimeFromDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return (hours === '00' && minutes === '00') ? '' : `${hours}:${minutes}`;
    };

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(teamId);
            setTeamMembers(members || []);
        } catch (error) {
            console.error('팀 멤버 조회 실패:', error);
        }
    };

    const checkGithubRepo = async () => {
        try {
            const team = await getTeam(teamId);
            setHasGithubRepo(!!team?.githubRepoUrl);
        } catch (error) {
            console.error('팀 정보 조회 실패:', error);
        }
    };

    const fetchFiles = async () => {
        try {
            const fileList = await getFilesByTask(task.taskId);
            setFiles(fileList || []);
        } catch (error) {
            console.error('파일 목록 조회 실패:', error);
        }
    };

    const fetchFavoriteStatus = async () => {
        if (!loginMember?.no) return;
        try {
            const result = await checkTaskFavorite(task.taskId, loginMember.no);
            setIsFavorite(result.isFavorite);
        } catch (error) {
            console.error('즐겨찾기 상태 확인 실패:', error);
        }
    };

    const handleToggleFavorite = async () => {
        if (!loginMember?.no) return;
        try {
            const result = await toggleTaskFavorite(task.taskId, loginMember.no);
            setIsFavorite(result.isFavorite);
        } catch (error) {
            console.error('즐겨찾기 토글 실패:', error);
        }
    };

    const handleArchiveToggle = async () => {
        if (!loginMember) return;
        try {
            if (isArchived) {
                await unarchiveTask(task.taskId, loginMember.no);
                setIsArchived(false);
            } else {
                await archiveTask(task.taskId, loginMember.no, '');
                setIsArchived(true);
            }
        } catch (error) {
            console.error('아카이브 토글 실패:', error);
        }
    };

    const handleFileDownload = (fileId, originalName) => {
        const downloadUrl = `/api/file/download/${fileId}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getMemberInfo = (memberNo) => {
        return teamMembers.find(m => m.memberNo === memberNo);
    };

    const filterMembers = (searchTerm) => {
        if (!searchTerm.trim()) return teamMembers || [];
        return (teamMembers || []).filter(member =>
            member.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.memberUserid.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const newForm = { ...form, [name]: value };
        setForm(newForm);
        debouncedSave(newForm, selectedAssignees, selectedVerifiers);
    };

    const handleAssigneeToggle = (memberNo) => {
        const newAssignees = selectedAssignees.includes(memberNo)
            ? selectedAssignees.filter(no => no !== memberNo)
            : [...selectedAssignees, memberNo];
        setSelectedAssignees(newAssignees);
        debouncedSave(form, newAssignees, selectedVerifiers);
    };

    const handleVerifierToggle = (memberNo) => {
        const newVerifiers = selectedVerifiers.includes(memberNo)
            ? selectedVerifiers.filter(no => no !== memberNo)
            : [...selectedVerifiers, memberNo];
        setSelectedVerifiers(newVerifiers);
        debouncedSave(form, selectedAssignees, newVerifiers);
    };

    const status = WORKFLOW_STATUS[task?.workflowStatus] || WORKFLOW_STATUS.WAITING;

    return (
        <div className="task-detail-view">
            {/* 헤더 */}
            <div className="task-detail-view-header">
                <div className="task-detail-view-header-inner">
                    <div className="header-left">
                        <button className="back-btn" onClick={() => {
                            if (onUpdate) onUpdate();
                            onClose();
                        }}>
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <span className="task-id-badge">#{task?.taskId}</span>
                        <button
                            type="button"
                            className="copy-btn"
                            onClick={() => {
                                navigator.clipboard.writeText(`#${task?.taskId}`);
                            }}
                            title="태스크 ID 복사"
                        >
                            <i className="fa-regular fa-copy"></i>
                        </button>
                        <button
                            type="button"
                            className="copy-btn"
                            onClick={() => {
                                const branchName = `feature/TASK-${task?.taskId}-${form.title?.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').substring(0, 30)}`;
                                navigator.clipboard.writeText(branchName);
                            }}
                            title="브랜치명 복사"
                        >
                            <i className="fa-solid fa-code-branch"></i>
                        </button>
                        {saving && (
                            <span className="saving-indicator">
                                <i className="fa-solid fa-circle-notch fa-spin"></i>
                                저장중...
                            </span>
                        )}
                    </div>
                    <div className="header-right">
                        <button
                            className={`action-btn urgent-btn ${form.priority === 'URGENT' ? 'active' : ''}`}
                            onClick={() => {
                                const newPriority = form.priority === 'URGENT' ? null : 'URGENT';
                                const updatedForm = { ...form, priority: newPriority };
                                setForm(updatedForm);
                                debouncedSave(updatedForm, selectedAssignees, selectedVerifiers);
                            }}
                            title={form.priority === 'URGENT' ? '긴급 해제' : '긴급 설정'}
                        >
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </button>
                        <button
                            className={`action-btn favorite-btn ${isFavorite ? 'active' : ''}`}
                            onClick={handleToggleFavorite}
                            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        >
                            <i className={isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                        </button>
                        <button
                            className={`action-btn archive-btn ${isArchived ? 'active' : ''}`}
                            onClick={handleArchiveToggle}
                            title={isArchived ? '아카이브 해제' : '아카이브'}
                        >
                            <i className={isArchived ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="task-detail-view-scroll">
                <div className="task-detail-view-content">
                    {/* 제목 & 상태 */}
                    <div className="task-title-section">
                        <input
                            type="text"
                            name="title"
                            className="title-input"
                            value={form.title}
                            onChange={handleFormChange}
                            placeholder="태스크 제목을 입력하세요..."
                        />
                        <div className="task-badges">
                            <span
                                className="status-badge"
                                style={{ background: status.bg, color: status.color }}
                            >
                                {status.label}
                            </span>
                        </div>
                    </div>

                    {/* 반려 사유 */}
                    {task?.workflowStatus === 'REJECTED' && task?.rejectionReason && (
                        <div className="rejection-notice">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <div>
                                <strong>반려 사유</strong>
                                <p>{task.rejectionReason}</p>
                            </div>
                        </div>
                    )}

                    {/* 메타 정보 */}
                    <div className="task-meta-grid">
                        <div className="meta-item">
                            <label><i className="fa-regular fa-calendar"></i> 시작일</label>
                            <div className="date-time-inputs">
                                <input
                                    type="date"
                                    name="startDate"
                                    value={form.startDate}
                                    onChange={handleFormChange}
                                />
                                <input
                                    type="time"
                                    name="startTime"
                                    value={form.startTime}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>
                        <div className="meta-item">
                            <label><i className="fa-regular fa-calendar-check"></i> 마감일</label>
                            <div className="date-time-inputs">
                                <input
                                    type="date"
                                    name="dueDate"
                                    value={form.dueDate}
                                    onChange={handleFormChange}
                                />
                                <input
                                    type="time"
                                    name="dueTime"
                                    value={form.dueTime}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>
                        <div className="meta-item">
                            <label><i className="fa-regular fa-clock"></i> 생성일</label>
                            <span>{formatDate(task?.createdAt)}</span>
                        </div>
                    </div>

                    {/* 담당자 & 검증자 */}
                    <div className="task-people-section">
                        <div className="people-group">
                            <label><i className="fa-solid fa-user"></i> 담당자</label>
                            <div className="member-selector">
                                <input
                                    type="text"
                                    className="member-search"
                                    placeholder="담당자 검색..."
                                    value={assigneeSearch}
                                    onChange={(e) => setAssigneeSearch(e.target.value)}
                                />
                                {assigneeSearch.trim() && (
                                    <div className="member-dropdown">
                                        {filterMembers(assigneeSearch).map(member => (
                                            <div
                                                key={member.memberNo}
                                                className={`member-option ${selectedAssignees.includes(member.memberNo) ? 'selected' : ''}`}
                                                onClick={() => handleAssigneeToggle(member.memberNo)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAssignees.includes(member.memberNo)}
                                                    onChange={() => {}}
                                                />
                                                <span>{member.memberName}</span>
                                                <span className="member-id">@{member.memberUserid}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="selected-members">
                                    {selectedAssignees.map(memberNo => {
                                        const member = getMemberInfo(memberNo);
                                        const assignee = task?.assignees?.find(a => a.memberNo === memberNo);
                                        return member ? (
                                            <span key={memberNo} className="selected-tag">
                                                {member.memberName}
                                                {assignee?.accepted && <i className="fa-solid fa-check status-check"></i>}
                                                {assignee?.completed && <i className="fa-solid fa-check-double status-check"></i>}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAssigneeToggle(memberNo)}
                                                >×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="people-group">
                            <label><i className="fa-solid fa-user-check"></i> 검증자</label>
                            <div className="member-selector">
                                <input
                                    type="text"
                                    className="member-search"
                                    placeholder="검증자 검색..."
                                    value={verifierSearch}
                                    onChange={(e) => setVerifierSearch(e.target.value)}
                                />
                                {verifierSearch.trim() && (
                                    <div className="member-dropdown">
                                        {filterMembers(verifierSearch).map(member => (
                                            <div
                                                key={member.memberNo}
                                                className={`member-option ${selectedVerifiers.includes(member.memberNo) ? 'selected' : ''}`}
                                                onClick={() => handleVerifierToggle(member.memberNo)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedVerifiers.includes(member.memberNo)}
                                                    onChange={() => {}}
                                                />
                                                <span>{member.memberName}</span>
                                                <span className="member-id">@{member.memberUserid}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="selected-members">
                                    {selectedVerifiers.map(memberNo => {
                                        const member = getMemberInfo(memberNo);
                                        const verifier = task?.verifiers?.find(v => v.memberNo === memberNo);
                                        return member ? (
                                            <span key={memberNo} className="selected-tag verifier">
                                                {member.memberName}
                                                {verifier?.approved && <i className="fa-solid fa-check status-check"></i>}
                                                <button
                                                    type="button"
                                                    onClick={() => handleVerifierToggle(memberNo)}
                                                >×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 설명 */}
                    <div className="task-description-section">
                        <label><i className="fa-solid fa-align-left"></i> 설명</label>
                        <textarea
                            name="description"
                            className="description-textarea"
                            value={form.description}
                            onChange={handleFormChange}
                            placeholder="태스크에 대한 설명을 입력하세요..."
                            rows={5}
                        />
                    </div>

                    {/* GitHub 커밋 */}
                    {hasGithubRepo && (
                        <div className="task-section">
                            <div className="section-header-row">
                                <label><i className="fa-brands fa-github"></i> 연결된 커밋</label>
                                <button
                                    type="button"
                                    className="link-commit-btn"
                                    onClick={() => setShowCommitBrowser(true)}
                                >
                                    <i className="fa-solid fa-plus"></i> 커밋 연결
                                </button>
                            </div>
                            <LinkedCommits
                                ref={linkedCommitsRef}
                                taskId={task?.taskId}
                                canEdit={true}
                            />
                        </div>
                    )}

                    {/* GitHub Issue 연동 */}
                    {hasGithubRepo && (
                        <div className="task-section">
                            <label><i className="fa-brands fa-github"></i> GitHub Issue</label>
                            <GitHubIssueLink
                                taskId={task?.taskId}
                                teamId={teamId}
                                taskTitle={form.title}
                                taskDescription={form.description}
                                loginMember={loginMember}
                            />
                        </div>
                    )}

                    {/* 첨부파일 */}
                    <div className="task-section">
                        <div className="section-header-row">
                            <label><i className="fa-solid fa-paperclip"></i> 첨부파일 {files.length > 0 && `(${files.length})`}</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                type="button"
                                className="upload-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                <i className="fa-solid fa-upload"></i>
                                {uploading ? '업로드중...' : '파일 추가'}
                            </button>
                        </div>
                        {files.length > 0 ? (
                            <div className="files-list">
                                {files.map(file => (
                                    <div key={file.fileId} className="file-item">
                                        <div className="file-icon">
                                            {getFileIcon(file.mimeType)}
                                        </div>
                                        <div className="file-info">
                                            <div className="file-name">{file.originalName}</div>
                                            <div className="file-meta">
                                                {formatFileSize(file.fileSize)} · {file.uploaderName} · {formatDate(file.uploadedAt)}
                                            </div>
                                        </div>
                                        <button
                                            className="download-btn"
                                            onClick={() => handleFileDownload(file.fileId, file.originalName)}
                                            title="다운로드"
                                        >
                                            <i className="fa-solid fa-download"></i>
                                        </button>
                                        {loginMember?.no === file.uploaderNo && (
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleFileDelete(file.fileId)}
                                                title="삭제"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">첨부된 파일이 없습니다.</p>
                        )}
                    </div>

                    {/* 댓글 */}
                    <div className="task-section comments-section">
                        <label><i className="fa-solid fa-comments"></i> 댓글</label>
                        <CommentSection
                            ref={commentSectionRef}
                            taskId={task?.taskId}
                            loginMember={loginMember}
                        />
                    </div>
                </div>
            </div>

            {/* CommitBrowser 모달 */}
            {showCommitBrowser && (
                <CommitBrowser
                    teamId={teamId}
                    taskId={task?.taskId}
                    loginMember={loginMember}
                    onClose={() => setShowCommitBrowser(false)}
                    onCommitLinked={() => {
                        if (linkedCommitsRef.current) {
                            linkedCommitsRef.current.refresh();
                        }
                    }}
                />
            )}
        </div>
    );
}

export default TaskDetailView;
