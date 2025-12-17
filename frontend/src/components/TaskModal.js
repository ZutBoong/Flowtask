import React, { useState, useEffect, useRef } from 'react';
import { taskupdate, updateTaskVerifier, approveTask, rejectTask, updateTaskAssignees } from '../api/boardApi';
import { getTeamMembers } from '../api/teamApi';
import { updateTaskTags } from '../api/tagApi';
import TagInput from './TagInput';
import CommentSection from './CommentSection';
import TaskCommits from './TaskCommits';
import './TaskModal.css';

const VERIFICATION_STATUSES = {
    NONE: { label: '미지정', color: '#6c757d' },
    PENDING: { label: '검증 대기', color: '#ffc107' },
    APPROVED: { label: '승인됨', color: '#198754' },
    REJECTED: { label: '반려됨', color: '#dc3545' }
};

const PRIORITIES = [
    { value: 'CRITICAL', label: '긴급', color: '#dc3545' },
    { value: 'HIGH', label: '높음', color: '#fd7e14' },
    { value: 'MEDIUM', label: '보통', color: '#0d6efd' },
    { value: 'LOW', label: '낮음', color: '#6c757d' }
];

const STATUSES = [
    { value: 'OPEN', label: '열림' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'RESOLVED', label: '해결됨' },
    { value: 'CLOSED', label: '닫힘' },
    { value: 'CANNOT_REPRODUCE', label: '재현불가' },
    { value: 'DUPLICATE', label: '중복' }
];

function TaskModal({ task, teamId, onClose, onSave, loginMember }) {
    const [form, setForm] = useState({
        taskId: task?.taskId || 0,
        title: task?.title || '',
        description: task?.description || '',
        assigneeNo: task?.assigneeNo || null,
        priority: task?.priority || 'MEDIUM',
        dueDate: task?.dueDate || '',
        status: task?.status || 'OPEN',
        verifierNo: task?.verifierNo || null,
        verifierName: task?.verifierName || '',
        verificationStatus: task?.verificationStatus || 'NONE',
        verificationNotes: task?.verificationNotes || ''
    });
    const [selectedTags, setSelectedTags] = useState(task?.tags || []);
    const [selectedAssignees, setSelectedAssignees] = useState(
        task?.assignees?.map(a => a.memberNo) || (task?.assigneeNo ? [task.assigneeNo] : [])
    );
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [verifyNotes, setVerifyNotes] = useState('');
    const [activeTab, setActiveTab] = useState('details'); // 'details', 'comments', or 'commits'
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const assigneeDropdownRef = useRef(null);

    useEffect(() => {
        if (teamId) {
            fetchTeamMembers();
        }
    }, [teamId]);

    // 드롭다운 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) {
                setAssigneeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTeamMembers = async () => {
        try {
            const members = await getTeamMembers(teamId);
            setTeamMembers(members || []);
        } catch (error) {
            console.error('팀 멤버 조회 실패:', error);
        }
    };

    // 담당자 선택/해제 토글
    const toggleAssignee = (memberNo) => {
        setSelectedAssignees(prev => {
            if (prev.includes(memberNo)) {
                return prev.filter(no => no !== memberNo);
            } else {
                return [...prev, memberNo];
            }
        });
    };

    // 선택된 담당자 이름 목록 가져오기
    const getSelectedAssigneeNames = () => {
        if (selectedAssignees.length === 0) return '담당자 선택';
        const names = selectedAssignees
            .map(no => teamMembers.find(m => m.memberNo === no))
            .filter(m => m)
            .map(m => m.memberName);
        if (names.length <= 2) return names.join(', ');
        return `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`;
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
            const taskData = {
                ...form,
                assigneeNo: selectedAssignees.length > 0 ? selectedAssignees[0] : null,
                dueDate: form.dueDate || null
            };
            await taskupdate(taskData);

            // 태그 저장
            if (form.taskId) {
                const tagIds = selectedTags.map(t => t.tagId);
                await updateTaskTags(form.taskId, tagIds);
                taskData.tags = selectedTags;

                // 복수 담당자 저장
                const senderNo = loginMember?.no || null;
                await updateTaskAssignees(form.taskId, selectedAssignees, senderNo);
                taskData.assignees = selectedAssignees.map(no => {
                    const member = teamMembers.find(m => m.memberNo === no);
                    return { memberNo: no, memberName: member?.memberName || '' };
                });
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

    const formatDateTimeForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // datetime-local 형식: YYYY-MM-DDTHH:MM
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // 검증자 변경 핸들러
    const handleVerifierChange = async (e) => {
        const verifierNo = e.target.value ? parseInt(e.target.value) : null;
        setForm(prev => ({ ...prev, verifierNo }));

        if (form.taskId) {
            try {
                await updateTaskVerifier(form.taskId, verifierNo);
                const newStatus = verifierNo ? 'PENDING' : 'NONE';
                setForm(prev => ({ ...prev, verificationStatus: newStatus }));
            } catch (error) {
                console.error('검증자 지정 실패:', error);
                alert('검증자 지정에 실패했습니다.');
            }
        }
    };

    // 검증 승인 핸들러
    const handleApprove = async () => {
        if (!window.confirm('이 이슈를 승인하시겠습니까?')) return;

        setLoading(true);
        try {
            await approveTask(form.taskId, verifyNotes);
            setForm(prev => ({
                ...prev,
                verificationStatus: 'APPROVED',
                status: 'CLOSED',
                verificationNotes: verifyNotes
            }));
            onSave && onSave();
            onClose();
        } catch (error) {
            console.error('검증 승인 실패:', error);
            alert('승인 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 검증 반려 핸들러
    const handleReject = async () => {
        if (!verifyNotes.trim()) {
            alert('반려 사유를 입력해주세요.');
            return;
        }
        if (!window.confirm('이 이슈를 반려하시겠습니까?')) return;

        setLoading(true);
        try {
            await rejectTask(form.taskId, verifyNotes);
            setForm(prev => ({
                ...prev,
                verificationStatus: 'REJECTED',
                status: 'IN_PROGRESS',
                verificationNotes: verifyNotes
            }));
            onSave && onSave();
            onClose();
        } catch (error) {
            console.error('검증 반려 실패:', error);
            alert('반려 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 현재 사용자가 검증자인지 확인
    const isVerifier = loginMember && form.verifierNo === loginMember.no;
    const canVerify = isVerifier && form.verificationStatus === 'PENDING';

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <div className="task-modal-header">
                    <h3>이슈 상세</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="task-modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                        type="button"
                    >
                        상세 정보
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('comments')}
                        type="button"
                    >
                        댓글
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'commits' ? 'active' : ''}`}
                        onClick={() => setActiveTab('commits')}
                        type="button"
                    >
                        커밋
                    </button>
                </div>

                {activeTab === 'details' ? (
                <form onSubmit={handleSubmit} className="task-modal-body">
                    <div className="form-group">
                        <label>제목</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="이슈 제목"
                        />
                    </div>

                    <div className="form-group">
                        <label>설명</label>
                        <textarea
                            name="description"
                            value={form.description || ''}
                            onChange={handleChange}
                            placeholder="이슈 설명"
                            rows={4}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>담당자</label>
                            <div className="multi-select-dropdown" ref={assigneeDropdownRef}>
                                <div
                                    className="multi-select-trigger"
                                    onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                                >
                                    <span className={selectedAssignees.length === 0 ? 'placeholder' : ''}>
                                        {getSelectedAssigneeNames()}
                                    </span>
                                    <span className="dropdown-arrow">{assigneeDropdownOpen ? '▲' : '▼'}</span>
                                </div>
                                {assigneeDropdownOpen && (
                                    <div className="multi-select-options">
                                        {teamMembers.length === 0 ? (
                                            <div className="no-options">팀 멤버가 없습니다</div>
                                        ) : (
                                            teamMembers.map(member => (
                                                <label key={member.memberNo} className="multi-select-option">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAssignees.includes(member.memberNo)}
                                                        onChange={() => toggleAssignee(member.memberNo)}
                                                    />
                                                    <span className="member-info">
                                                        <span className="member-name">{member.memberName}</span>
                                                        <span className="member-userid">({member.memberUserid})</span>
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            {selectedAssignees.length > 0 && (
                                <div className="selected-assignees-chips">
                                    {selectedAssignees.map(no => {
                                        const member = teamMembers.find(m => m.memberNo === no);
                                        return member ? (
                                            <span key={no} className="assignee-chip">
                                                {member.memberName}
                                                <button
                                                    type="button"
                                                    className="chip-remove"
                                                    onClick={() => toggleAssignee(no)}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>우선순위</label>
                            <select
                                name="priority"
                                value={form.priority || 'MEDIUM'}
                                onChange={handleChange}
                            >
                                {PRIORITIES.map(p => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>마감일</label>
                            <input
                                type="datetime-local"
                                name="dueDate"
                                value={formatDateTimeForInput(form.dueDate)}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>상태</label>
                            <select
                                name="status"
                                value={form.status || 'OPEN'}
                                onChange={handleChange}
                            >
                                {STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {teamId && (
                        <div className="form-group">
                            <label>태그</label>
                            <TagInput
                                teamId={teamId}
                                selectedTags={selectedTags}
                                onChange={setSelectedTags}
                            />
                        </div>
                    )}

                    {/* 검증자 섹션 */}
                    <div className="verification-section">
                        <div className="section-header">
                            <h4>검증</h4>
                            {form.verificationStatus && form.verificationStatus !== 'NONE' && (
                                <span
                                    className="verification-badge"
                                    style={{ backgroundColor: VERIFICATION_STATUSES[form.verificationStatus]?.color }}
                                >
                                    {VERIFICATION_STATUSES[form.verificationStatus]?.label}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>검증자</label>
                            <select
                                value={form.verifierNo || ''}
                                onChange={handleVerifierChange}
                                disabled={form.verificationStatus === 'APPROVED'}
                            >
                                <option value="">미지정</option>
                                {teamMembers.map(member => (
                                    <option key={member.memberNo} value={member.memberNo}>
                                        {member.memberName} ({member.memberUserid})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {form.verificationNotes && (
                            <div className="verification-notes-display">
                                <label>검증 메모</label>
                                <p>{form.verificationNotes}</p>
                            </div>
                        )}

                        {canVerify && (
                            <div className="verification-actions">
                                <div className="form-group">
                                    <label>검증 메모 (반려 시 필수)</label>
                                    <textarea
                                        value={verifyNotes}
                                        onChange={(e) => setVerifyNotes(e.target.value)}
                                        placeholder="검증 결과에 대한 메모를 입력하세요..."
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
                    </div>

                    <div className="task-modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            취소
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? '저장중...' : '저장'}
                        </button>
                    </div>
                </form>
                ) : activeTab === 'comments' ? (
                <div className="task-modal-body">
                    <CommentSection
                        taskId={form.taskId}
                        loginMember={loginMember}
                    />
                </div>
                ) : (
                <div className="task-modal-body">
                    <TaskCommits taskId={form.taskId} />
                </div>
                )}
            </div>
        </div>
    );
}

export default TaskModal;
