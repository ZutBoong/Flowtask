import React, { useState, useEffect, useRef } from 'react';
import { taskupdate, updateTaskAssignees, updateTaskVerifiers } from '../api/boardApi';
import { getTeamMembers, getTeam } from '../api/teamApi';
import { uploadFile, getFilesByTask, deleteFile, formatFileSize, getFileIcon } from '../api/fileApi';
import CommentSection from './CommentSection';
import CommitBrowser from './CommitBrowser';
import LinkedCommits from './LinkedCommits';
import './TaskModal.css';

function TaskModal({ task, teamId, onClose, onSave, loginMember }) {
    // 오늘 날짜 기본값
    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        taskId: task?.taskId || 0,
        title: task?.title || '',
        description: task?.description || '',
        assigneeNo: task?.assigneeNo || null,
        priority: task?.priority || null, // 우선순위 미설정이면 null
        startDate: task?.startDate || today,
        dueDate: task?.dueDate || ''
    });

    const [selectedAssignees, setSelectedAssignees] = useState(
        task?.assignees?.map(a => a.memberNo) || (task?.assigneeNo ? [task.assigneeNo] : [])
    );
    const [selectedVerifiers, setSelectedVerifiers] = useState(
        task?.verifiers?.map(v => v.memberNo) || []
    );
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [verifierSearch, setVerifierSearch] = useState('');
    const [startTime, setStartTime] = useState('');
    const [dueTime, setDueTime] = useState('');

    // 파일 관련 상태
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const commentSectionRef = useRef(null);  // CommentSection 새로고침용

    // GitHub 커밋 연결 상태
    const [showCommitBrowser, setShowCommitBrowser] = useState(false);
    const [hasGithubRepo, setHasGithubRepo] = useState(false);
    const linkedCommitsRef = useRef(null);

    useEffect(() => {
        if (teamId) {
            fetchTeamMembers();
            checkGithubRepo();
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

    // 팀의 GitHub 저장소 설정 확인
    const checkGithubRepo = async () => {
        if (!teamId) return;
        try {
            const team = await getTeam(teamId);
            setHasGithubRepo(!!team?.githubRepoUrl);
        } catch (error) {
            console.error('팀 정보 조회 실패:', error);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(teamId);
            setTeamMembers(Array.isArray(members) ? members : []);
        } catch (error) {
            console.error('팀 멤버 조회 실패:', error);
            setTeamMembers([]);
        }
    };

    // 파일 목록 조회
    const fetchFiles = async () => {
        if (!task?.taskId) return;
        try {
            const fileList = await getFilesByTask(task.taskId);
            setFiles(Array.isArray(fileList) ? fileList : []);
        } catch (error) {
            console.error('파일 목록 조회 실패:', error);
            setFiles([]);
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

    // 모달 모드
    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal-container" onClick={e => e.stopPropagation()}>
                <div className="task-modal-header">
                    <div className="header-title-row">
                        <h3>태스크 수정</h3>
                        {form.taskId > 0 && (
                            <span className="task-id-badge">#{form.taskId}</span>
                        )}
                    </div>
                    <div className="header-actions">
                        <button
                            className={`urgent-btn ${form.priority === 'URGENT' ? 'active' : ''}`}
                            onClick={() => setForm(prev => ({ ...prev, priority: prev.priority === 'URGENT' ? null : 'URGENT' }))}
                            title={form.priority === 'URGENT' ? '긴급 해제' : '긴급 설정'}
                        >
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </button>
                        <button className="close-btn" onClick={onClose}><i className="fa-solid fa-x"></i></button>
                    </div>
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
                                                    <span>{member.memberName} <span className="member-id">@{member.memberUserid}</span></span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="dropdown-empty">검색 결과가 없습니다.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {selectedAssignees.length > 0 && (
                                <div className="selected-members">
                                    <div className="selected-tags">
                                        {selectedAssignees.map(assigneeNo => {
                                            const member = teamMembers?.find(m => m.memberNo === assigneeNo);
                                            return member ? (
                                                <span key={assigneeNo} className="selected-tag">
                                                    {member.memberName} <span className="member-id">@{member.memberUserid}</span>
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
                                </div>
                            )}
                        </div>

                        <div className="form-field">
                            <label>검증자</label>
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
                                                    <span>{member.memberName} <span className="member-id">@{member.memberUserid}</span></span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="dropdown-empty">검색 결과가 없습니다.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {selectedVerifiers.length > 0 && (
                                <div className="selected-members">
                                    <div className="selected-tags">
                                        {selectedVerifiers.map(verifierNo => {
                                            const member = teamMembers?.find(m => m.memberNo === verifierNo);
                                            return member ? (
                                                <span key={verifierNo} className="selected-tag">
                                                    {member.memberName} <span className="member-id">@{member.memberUserid}</span>
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
                                </div>
                            )}
                        </div>
                    </div>

                    {/* GitHub 커밋 연결 섹션 */}
                    {form.taskId > 0 && hasGithubRepo && (
                        <section className="commits-section">
                            <div className="section-header">
                                <h2><i className="fa-brands fa-github"></i> 연결된 커밋</h2>
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
                                taskId={form.taskId}
                                canEdit={true}
                            />
                        </section>
                    )}

                    {/* 댓글 섹션 */}
                    {form.taskId > 0 && (
                        <section className="comments-section">
                            <h2>댓글</h2>
                            <CommentSection
                                ref={commentSectionRef}
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

            {/* CommitBrowser 모달 */}
            {showCommitBrowser && (
                <CommitBrowser
                    teamId={teamId}
                    taskId={form.taskId}
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

export default TaskModal;
