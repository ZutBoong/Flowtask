import React, { useState } from 'react';
import './FilterBar.css';

const STATUSES = [
    { value: 'OPEN', label: '열림' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'RESOLVED', label: '해결됨' },
    { value: 'CLOSED', label: '닫힘' },
    { value: 'CANNOT_REPRODUCE', label: '재현불가' },
    { value: 'DUPLICATE', label: '중복' }
];

function FilterBar({ teamId, teamMembers, filters, onFilterChange }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSearchChange = (e) => {
        onFilterChange({ ...filters, searchQuery: e.target.value });
    };

    const toggleStatus = (status) => {
        const current = filters.statuses || [];
        const updated = current.includes(status)
            ? current.filter(s => s !== status)
            : [...current, status];
        onFilterChange({ ...filters, statuses: updated });
    };

    const handleAssigneeChange = (e) => {
        const value = e.target.value ? parseInt(e.target.value) : null;
        onFilterChange({ ...filters, assigneeNo: value });
    };

    const handleDueDateFilterChange = (e) => {
        onFilterChange({ ...filters, dueDateFilter: e.target.value });
    };

    const clearFilters = () => {
        onFilterChange({
            searchQuery: '',
            statuses: [],
            assigneeNo: null,
            dueDateFilter: ''
        });
    };

    const hasActiveFilters = () => {
        return filters.searchQuery ||
            (filters.statuses && filters.statuses.length > 0) ||
            filters.assigneeNo ||
            filters.dueDateFilter;
    };

    return (
        <div className="filter-bar">
            <div className="filter-bar-main">
                <div className="search-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="검색..."
                        value={filters.searchQuery || ''}
                        onChange={handleSearchChange}
                    />
                </div>

                <button
                    className={`filter-toggle ${isExpanded ? 'active' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    필터
                    {hasActiveFilters() && <span className="filter-badge" />}
                </button>
            </div>

            {isExpanded && (
                <div className="filter-bar-expanded">
                    <div className="filter-section">
                        <label>상태</label>
                        <div className="filter-chips">
                            {STATUSES.map(s => (
                                <button
                                    key={s.value}
                                    className={`filter-chip ${(filters.statuses || []).includes(s.value) ? 'active' : ''}`}
                                    onClick={() => toggleStatus(s.value)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-section">
                        <label>담당자</label>
                        <select
                            value={filters.assigneeNo || ''}
                            onChange={handleAssigneeChange}
                        >
                            <option value="">전체</option>
                            {teamMembers.map(member => (
                                <option key={member.memberNo} value={member.memberNo}>
                                    {member.memberName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-section">
                        <label>마감일</label>
                        <select
                            value={filters.dueDateFilter || ''}
                            onChange={handleDueDateFilterChange}
                        >
                            <option value="">전체</option>
                            <option value="overdue">지난 이슈</option>
                            <option value="today">오늘 마감</option>
                            <option value="week">이번 주</option>
                            <option value="nodate">마감일 없음</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FilterBar;
