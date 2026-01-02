import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getCommentsByTask, createComment, updateComment, deleteComment } from '../api/commentApi';
import './CommentSection.css';

const CommentSection = forwardRef(({ taskId, loginMember }, ref) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(false);

    // 외부에서 댓글 새로고침 가능하도록 ref 노출
    useImperativeHandle(ref, () => ({
        refresh: fetchComments
    }));

    useEffect(() => {
        if (taskId) {
            fetchComments();
        }
    }, [taskId]);

    const fetchComments = async () => {
        try {
            const data = await getCommentsByTask(taskId);
            setComments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('댓글 조회 실패:', error);
            setComments([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !loginMember) return;

        setLoading(true);
        try {
            const comment = await createComment({
                taskId,
                authorNo: loginMember.no,
                content: newComment.trim()
            });
            if (comment) {
                setComments(prev => [...prev, comment]);
                setNewComment('');
            }
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            alert('댓글 작성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (comment) => {
        setEditingId(comment.commentId);
        setEditContent(comment.content);
    };

    const handleUpdate = async (commentId) => {
        if (!editContent.trim()) return;

        setLoading(true);
        try {
            await updateComment(commentId, editContent.trim());
            setComments(prev => prev.map(c =>
                c.commentId === commentId
                    ? { ...c, content: editContent.trim() }
                    : c
            ));
            setEditingId(null);
            setEditContent('');
        } catch (error) {
            console.error('댓글 수정 실패:', error);
            alert('댓글 수정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

        try {
            await deleteComment(commentId);
            setComments(prev => prev.filter(c => c.commentId !== commentId));
        } catch (error) {
            console.error('댓글 삭제 실패:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        // 1분 미만
        if (diff < 60000) return '방금 전';
        // 1시간 미만
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        // 24시간 미만
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        // 7일 미만
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="comment-section">
            <div className="comment-header">
                <h4>댓글 ({comments.length})</h4>
            </div>

            <div className="comment-list">
                {comments.length === 0 ? (
                    <div className="no-comments">
                        아직 댓글이 없습니다.
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.commentId} className="comment-item">
                            <div className="comment-author">
                                <span className="author-avatar">
                                    {comment.authorName?.charAt(0) || '?'}
                                </span>
                                <span className="author-name">{comment.authorName}</span>
                                <span className="comment-time">{formatDate(comment.createdAt)}</span>
                            </div>

                            {editingId === comment.commentId ? (
                                <div className="comment-edit">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={2}
                                    />
                                    <div className="comment-edit-actions">
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleUpdate(comment.commentId)}
                                            disabled={loading}
                                        >
                                            저장
                                        </button>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => {
                                                setEditingId(null);
                                                setEditContent('');
                                            }}
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="comment-content">
                                    <p>{comment.content}</p>
                                    {loginMember && loginMember.no === comment.authorNo && (
                                        <div className="comment-actions">
                                            <button onClick={() => handleEdit(comment)}>수정</button>
                                            <button onClick={() => handleDelete(comment.commentId)}>삭제</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="comment-form">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    rows={2}
                    disabled={!loginMember}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey && newComment.trim()) {
                            handleSubmit(e);
                        }
                    }}
                />
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading || !newComment.trim() || !loginMember}
                >
                    {loading ? '작성중...' : '댓글 작성'}
                </button>
            </div>
        </div>
    );
});

export default CommentSection;
