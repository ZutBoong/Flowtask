import React, { useState, useEffect } from 'react';
import {
    getFilesByTeam, deleteFile,
    getDownloadUrl, formatFileSize, getFileIcon
} from '../../api/fileApi';
import './FilesView.css';

function FilesView({ team, teamMembers, loginMember, filters }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (team) {
            fetchFiles();
        }
    }, [team]);

    const fetchFiles = async () => {
        if (!team) return;

        setLoading(true);
        try {
            const data = await getFilesByTeam(team.teamId);
            setFiles(data || []);
        } catch (error) {
            console.error('파일 목록 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 파일 삭제
    const handleDelete = async (fileId) => {
        if (!window.confirm('이 파일을 삭제하시겠습니까?')) return;

        try {
            await deleteFile(fileId);
            setFiles(prev => prev.filter(f => f.fileId !== fileId));
        } catch (error) {
            console.error('파일 삭제 실패:', error);
            alert('파일 삭제에 실패했습니다.');
        }
    };

    // 파일 다운로드
    const handleDownload = (file) => {
        const url = getDownloadUrl(file.fileId);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 업로더 이름 가져오기
    const getUploaderName = (uploaderNo) => {
        const member = teamMembers.find(m => m.memberNo === uploaderNo);
        return member?.memberName || '알 수 없음';
    };

    // 날짜 포맷
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // 필터 적용 (파일명 검색)
    const filteredFiles = files.filter(file => {
        if (!filters?.searchQuery) return true;
        const query = filters.searchQuery.toLowerCase();
        return file.originalName?.toLowerCase().includes(query);
    });

    return (
        <div className="files-view">
            {/* 파일 목록 */}
            <div className="files-section">
                <div className="section-header">
                    <h2>파일 목록</h2>
                    <span className="file-count">{filteredFiles.length}개{filters?.searchQuery && ` (전체 ${files.length}개)`}</span>
                </div>

                {loading ? (
                    <div className="files-loading">
                        <p>로딩 중...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="files-empty">
                        <i className="fa-regular fa-file empty-icon"></i>
                        <p>{filters?.searchQuery ? '검색 결과가 없습니다' : '업로드된 파일이 없습니다'}</p>
                    </div>
                ) : (
                    <div className="files-grid">
                        {filteredFiles.map(file => (
                            <div key={file.fileId} className="file-card">
                                <div className="file-icon">
                                    {getFileIcon(file.mimeType)}
                                </div>
                                <div className="file-info">
                                    <span className="file-name" title={file.originalName}>
                                        {file.originalName}
                                    </span>
                                    <div className="file-meta">
                                        <span className="file-size">{formatFileSize(file.fileSize)}</span>
                                        <span className="file-date">{formatDate(file.uploadedAt)}</span>
                                    </div>
                                    <span className="file-uploader">
                                        업로더: {getUploaderName(file.uploaderNo)}
                                    </span>
                                </div>
                                <div className="file-actions">
                                    <button
                                        className="download-btn"
                                        onClick={() => handleDownload(file)}
                                        title="다운로드"
                                    >
                                        ⬇
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(file.fileId)}
                                        title="삭제"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FilesView;
