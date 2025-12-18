import React, { useState, useEffect, useRef } from 'react';
import { taskupdate, updateTaskAssignees, updateTaskVerifiers, acceptTask, completeTask, approveTask, rejectTask, restartTask } from '../api/boardApi';
import { getTeamMembers } from '../api/teamApi';
import CommentSection from './CommentSection';
import TaskCommits from './TaskCommits';
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
    const [activeTab, setActiveTab] = useState('details');
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const [verifierDropdownOpen, setVerifierDropdownOpen] = useState(false);
    const assigneeDropdownRef = useRef(null);
    const verifierDropdownRef = useRef(null);

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
            if (verifierDropdownRef.current && !verifierDropdownRef.current.contains(event.target)) {
                setVerifierDropdownOpen(false);
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

    // 검증자 선택/해제 토글
    const toggleVerifier = (memberNo) => {
        setSelectedVerifiers(prev => {
            if (prev.includes(memberNo)) {
                return prev.filter(no => no !== memberNo);
            } else {
                return [...prev, memberNo];
            }
        });
    };

    // 선택된 멤버 이름 목록 가져오기
    const getSelectedNames = (selectedNos) => {
        if (selectedNos.length === 0) return '';
        const names = selectedNos
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
                startDate: form.startDate || null,
                dueDate: form.dueDate || null
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
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <div className="task-modal-header">
                    <h3>태스크 상세</h3>
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
                    {/* 워크플로우 상태 표시 */}
                    <div className="workflow-status-section">
                        <span
                            className="workflow-status-badge"
                            style={{ backgroundColor: WORKFLOW_STATUSES[form.workflowStatus]?.color }}
                        >
                            {WORKFLOW_STATUSES[form.workflowStatus]?.label}
                        </span>
                        {form.workflowStatus === 'REJECTED' && form.rejectionReason && (
                            <div className="rejection-reason">
                                <strong>반려 사유:</strong> {form.rejectionReason}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>제목</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="태스크 제목"
                        />
                    </div>

                    <div className="form-group">
                        <label>설명</label>
                        <textarea
                            name="description"
                            value={form.description || ''}
                            onChange={handleChange}
                            placeholder="태스크 설명"
                            rows={4}
                        />
                    </div>

                    {/* 담당자 선택 */}
                    <div className="form-group">
                        <label>담당자</label>
                        <div className="multi-select-dropdown" ref={assigneeDropdownRef}>
                            <div
                                className="multi-select-trigger"
                                onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                            >
                                <span className={selectedAssignees.length === 0 ? 'placeholder' : ''}>
                                    {selectedAssignees.length === 0 ? '담당자 선택' : getSelectedNames(selectedAssignees)}
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
                                    const assignee = task?.assignees?.find(a => a.memberNo === no);
                                    return member ? (
                                        <span key={no} className={`assignee-chip ${assignee?.accepted ? 'accepted' : ''} ${assignee?.completed ? 'completed' : ''}`}>
                                            {member.memberName}
                                            {assignee?.accepted && <span className="status-icon">✓</span>}
                                            {assignee?.completed && <span className="status-icon">✓✓</span>}
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

                    {/* 검증자 선택 */}
                    <div className="form-group">
                        <label>검증자</label>
                        <div className="multi-select-dropdown" ref={verifierDropdownRef}>
                            <div
                                className="multi-select-trigger"
                                onClick={() => setVerifierDropdownOpen(!verifierDropdownOpen)}
                            >
                                <span className={selectedVerifiers.length === 0 ? 'placeholder' : ''}>
                                    {selectedVerifiers.length === 0 ? '검증자 선택' : getSelectedNames(selectedVerifiers)}
                                </span>
                                <span className="dropdown-arrow">{verifierDropdownOpen ? '▲' : '▼'}</span>
                            </div>
                            {verifierDropdownOpen && (
                                <div className="multi-select-options">
                                    {teamMembers.length === 0 ? (
                                        <div className="no-options">팀 멤버가 없습니다</div>
                                    ) : (
                                        teamMembers.map(member => (
                                            <label key={member.memberNo} className="multi-select-option">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedVerifiers.includes(member.memberNo)}
                                                    onChange={() => toggleVerifier(member.memberNo)}
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
                        {selectedVerifiers.length > 0 && (
                            <div className="selected-assignees-chips">
                                {selectedVerifiers.map(no => {
                                    const member = teamMembers.find(m => m.memberNo === no);
                                    const verifier = task?.verifiers?.find(v => v.memberNo === no);
                                    return member ? (
                                        <span key={no} className={`assignee-chip verifier ${verifier?.approved ? 'approved' : ''}`}>
                                            {member.memberName}
                                            {verifier?.approved && <span className="status-icon">✓</span>}
                                            <button
                                                type="button"
                                                className="chip-remove"
                                                onClick={() => toggleVerifier(no)}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>시작일</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formatDateForInput(form.startDate)}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>마감일</label>
                            <input
                                type="datetime-local"
                                name="dueDate"
                                value={formatDateTimeForInput(form.dueDate)}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>우선순위</label>
                        <div className="priority-selector">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    className={`priority-option ${form.priority === p.value ? 'selected' : ''}`}
                                    style={{
                                        '--priority-color': p.color,
                                        backgroundColor: form.priority === p.value ? p.color : 'transparent',
                                        borderColor: p.color,
                                        color: form.priority === p.value ? 'white' : p.color
                                    }}
                                    onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 워크플로우 액션 섹션 */}
                    {form.taskId > 0 && (
                        <div className="workflow-actions-section">
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
                        </div>
                    )}

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
