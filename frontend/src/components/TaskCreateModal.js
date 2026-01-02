import React, { useState } from 'react';
import './TaskModal.css';
import './TaskCreateModal.css';

function TaskCreateModal({ columnId, teamId, teamMembers, onClose, onCreate }) {
    // 오늘 날짜 기본값
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: null, // 우선순위 미설정
        startDate: today,
        dueDate: '',
        assignees: [],
        verifiers: []
    });

    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [verifierSearch, setVerifierSearch] = useState('');
    const [startTime, setStartTime] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const filterMembers = (searchTerm) => {
        if (!searchTerm.trim()) return teamMembers || [];
        return (teamMembers || []).filter(member =>
            member.memberName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleSubmit = async () => {
        if (!formData.title?.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 날짜와 시간 결합
            const startDateTime = formData.startDate && startTime
                ? `${formData.startDate}T${startTime}`
                : formData.startDate;
            const dueDateTime = formData.dueDate && dueTime
                ? `${formData.dueDate}T${dueTime}`
                : formData.dueDate;

            const taskData = {
                columnId,
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                startDate: startDateTime || null,
                dueDate: dueDateTime || null,
                assignees: formData.assignees,
                verifiers: formData.verifiers
            };

            await onCreate(taskData);
            onClose();
        } catch (error) {
            console.error('태스크 생성 실패:', error);
            alert('태스크 생성에 실패했습니다.');
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

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="task-modal-header">
                    <h3>새 태스크 만들기</h3>
                    <div className="header-actions">
                        <button
                            className={`urgent-btn ${formData.priority === 'URGENT' ? 'active' : ''}`}
                            onClick={() => handleChange('priority', formData.priority === 'URGENT' ? null : 'URGENT')}
                            title={formData.priority === 'URGENT' ? '긴급 해제' : '긴급 설정'}
                        >
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </button>
                        <button className="close-btn" onClick={onClose}>
                            <i className="fa-solid fa-x"></i>
                        </button>
                    </div>
                </div>

                <div className="task-modal-content">
                    <div className="form-field">
                        <label>제목 *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="태스크 제목을 입력하세요..."
                            autoFocus
                        />
                    </div>

                    <div className="form-field">
                        <label>설명</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="태스크에 대한 설명을 입력하세요..."
                            rows={4}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-field">
                            <label>시작일</label>
                            <input
                                type="date"
                                value={formatDateForInput(formData.startDate)}
                                onChange={(e) => handleChange('startDate', e.target.value)}
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
                                value={formatDateForInput(formData.dueDate)}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
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
                                                    className={`dropdown-item ${formData.assignees.includes(member.memberNo) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (formData.assignees.includes(member.memberNo)) {
                                                            handleChange('assignees', formData.assignees.filter(no => no !== member.memberNo));
                                                        } else {
                                                            handleChange('assignees', [...formData.assignees, member.memberNo]);
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.assignees.includes(member.memberNo)}
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
                            {formData.assignees.length > 0 && (
                                <div className="selected-members">
                                    <div className="selected-tags">
                                        {formData.assignees.map(assigneeNo => {
                                            const member = teamMembers?.find(m => m.memberNo === assigneeNo);
                                            return member ? (
                                                <span key={assigneeNo} className="selected-tag">
                                                    {member.memberName} <span className="member-id">@{member.memberUserid}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('assignees', formData.assignees.filter(no => no !== assigneeNo))}
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
                                                    className={`dropdown-item ${formData.verifiers.includes(member.memberNo) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (formData.verifiers.includes(member.memberNo)) {
                                                            handleChange('verifiers', formData.verifiers.filter(no => no !== member.memberNo));
                                                        } else {
                                                            handleChange('verifiers', [...formData.verifiers, member.memberNo]);
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.verifiers.includes(member.memberNo)}
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
                            {formData.verifiers.length > 0 && (
                                <div className="selected-members">
                                    <div className="selected-tags">
                                        {formData.verifiers.map(verifierNo => {
                                            const member = teamMembers?.find(m => m.memberNo === verifierNo);
                                            return member ? (
                                                <span key={verifierNo} className="selected-tag">
                                                    {member.memberName} <span className="member-id">@{member.memberUserid}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('verifiers', formData.verifiers.filter(no => no !== verifierNo))}
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
                </div>

                <div className="task-modal-footer">
                    <div className="footer-right">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            취소
                        </button>
                        <button type="button" className="save-btn" onClick={handleSubmit} disabled={loading}>
                            {loading ? '생성중...' : '생성'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TaskCreateModal;
