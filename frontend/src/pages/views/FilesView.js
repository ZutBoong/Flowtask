import React, { useState, useEffect, useRef } from 'react';
import {
    uploadFile, getFilesByTeam, deleteFile,
    getDownloadUrl, formatFileSize, getFileIcon
} from '../../api/fileApi';
import './FilesView.css';

function FilesView({ team, teamMembers, loginMember, filters }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

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

    // 파일 업로드
    const handleUpload = async (fileList) => {
        if (!fileList || fileList.length === 0 || !team || !loginMember) return;

        setUploading(true);
        try {
            for (const file of fileList) {
                await uploadFile(file, team.teamId, null, loginMember.no);
            }
            await fetchFiles();
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            alert('파일 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    // 파일 선택
    const handleFileSelect = (e) => {
        handleUpload(e.target.files);
        e.target.value = '';
    };

    // 드래그 앤 드롭
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files);
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
            {/* 업로드 영역 */}
            <div
                className={`upload-zone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    hidden
                />
                <div className="upload-content">
                    {uploading ? (
                        <>
                            <div className="upload-spinner"></div>
                            <p>업로드 중...</p>
                        </>
                    ) : (
                        <>
                            <span className="upload-icon">📁</span>
                            <p>파일을 드래그하거나 클릭하여 업로드</p>
                            <span className="upload-hint">모든 파일 형식 지원</span>
                        </>
                    )}
                </div>
            </div>

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
                        <span className="empty-icon">📂</span>
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
