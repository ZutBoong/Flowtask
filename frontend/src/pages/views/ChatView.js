import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getRecentMessages, sendMessage, getMessagesBefore } from '../../api/chatApi';
import websocketService from '../../api/websocketService';
import './ChatView.css';

function ChatView({ team, teamMembers, loginMember }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const subscriptionRef = useRef(null);

    const teamId = team?.teamId;

    // 메시지 목록 로드
    const loadMessages = useCallback(async () => {
        if (!teamId) return;
        setLoading(true);
        try {
            const data = await getRecentMessages(teamId, 100);
            setMessages(data || []);
            setHasMore((data || []).length >= 100);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    // 이전 메시지 로드
    const loadMoreMessages = async () => {
        if (!hasMore || loadingMore || messages.length === 0) return;

        setLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            const olderMessages = await getMessagesBefore(teamId, oldestMessage.messageId, 50);
            if (olderMessages.length < 50) {
                setHasMore(false);
            }
            if (olderMessages.length > 0) {
                setMessages(prev => [...olderMessages, ...prev]);
            }
        } catch (error) {
            console.error('Failed to load more messages:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // 스크롤 이벤트 핸들러
    const handleScroll = (e) => {
        const { scrollTop } = e.target;
        if (scrollTop === 0 && hasMore && !loadingMore) {
            loadMoreMessages();
        }
    };

    // 맨 아래로 스크롤
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // WebSocket 구독
    useEffect(() => {
        if (!teamId) return;

        const stompClient = websocketService.getClient();
        if (!stompClient || !stompClient.connected) return;

        const destination = `/topic/team/${teamId}/chat`;
        console.log('ChatView: Subscribing to', destination);

        subscriptionRef.current = stompClient.subscribe(destination, (message) => {
            const chatMessage = JSON.parse(message.body);
            console.log('ChatView: Received message', chatMessage);
            setMessages(prev => [...prev, chatMessage]);
        });

        return () => {
            if (subscriptionRef.current) {
                console.log('ChatView: Unsubscribing');
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, [teamId]);

    // 컴포넌트 마운트 시 메시지 로드
    useEffect(() => {
        if (teamId) {
            loadMessages();
        }
    }, [teamId, loadMessages]);

    // 새 메시지 시 스크롤
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages.length]);

    // 메시지 전송
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !loginMember) return;

        try {
            await sendMessage(teamId, loginMember.no, newMessage.trim());
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('메시지 전송에 실패했습니다.');
        }
    };

    // 시간 포맷팅
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // 날짜 구분선 표시 여부
    const shouldShowDateDivider = (currentMsg, prevMsg) => {
        if (!prevMsg) return true;
        const currentDate = new Date(currentMsg.sentAt).toDateString();
        const prevDate = new Date(prevMsg.sentAt).toDateString();
        return currentDate !== prevDate;
    };

    // 날짜 포맷
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return '오늘';
        if (isYesterday) return '어제';
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // 내 메시지인지 확인
    const isMyMessage = (msg) => loginMember && msg.senderNo === loginMember.no;

    // 멤버 정보 찾기
    const getMemberInfo = (senderNo) => {
        return teamMembers?.find(m => m.memberNo === senderNo);
    };

    return (
        <div className="chat-view">
            <div className="chat-view-header">
                <div className="chat-view-title">
                    <i className="fa-solid fa-comments"></i>
                    <h2>팀 채팅</h2>
                </div>
                <span className="chat-member-count">{teamMembers?.length || 0}명 참여중</span>
            </div>

            <div
                className="chat-view-messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {loadingMore && (
                    <div className="chat-loading-more">
                        <div className="loading-spinner-small"></div>
                        이전 메시지 불러오는 중...
                    </div>
                )}

                {loading ? (
                    <div className="chat-loading">
                        <div className="loading-spinner"></div>
                        <p>메시지를 불러오는 중...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        <i className="fa-regular fa-comments"></i>
                        <p>아직 메시지가 없습니다.</p>
                        <span>첫 번째 메시지를 보내보세요!</span>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <React.Fragment key={msg.messageId || index}>
                            {shouldShowDateDivider(msg, messages[index - 1]) && (
                                <div className="chat-date-divider">
                                    <span>{formatDate(msg.sentAt)}</span>
                                </div>
                            )}
                            <div className={`chat-message ${isMyMessage(msg) ? 'mine' : ''}`}>
                                {!isMyMessage(msg) && (
                                    <div className="chat-avatar">
                                        {(msg.senderName || getMemberInfo(msg.senderNo)?.memberName || 'U').charAt(0)}
                                    </div>
                                )}
                                <div className="chat-message-content">
                                    {!isMyMessage(msg) && (
                                        <div className="chat-sender">
                                            {msg.senderName || getMemberInfo(msg.senderNo)?.memberName || msg.senderUserid}
                                        </div>
                                    )}
                                    <div className="chat-bubble-wrapper">
                                        <div className="chat-bubble">
                                            {msg.content}
                                        </div>
                                        <span className="chat-time">{formatTime(msg.sentAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-view-input" onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="메시지를 입력하세요..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={!loginMember}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || !loginMember}
                >
                    <i className="fa-solid fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
}

export default ChatView;
