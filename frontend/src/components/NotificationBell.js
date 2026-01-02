import React, { useState, useEffect, useRef } from 'react';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
} from '../api/notificationApi';
import './NotificationBell.css';

function NotificationBell({ memberNo }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // 읽지 않은 알림 수 가져오기 (주기적으로)
    useEffect(() => {
        if (memberNo) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 30000); // 30초마다 갱신
            return () => clearInterval(interval);
        }
    }, [memberNo]);

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadCount(memberNo);
            setUnreadCount(count);
        } catch (error) {
            console.error('알림 수 조회 실패:', error);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getNotifications(memberNo);
            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('알림 목록 조회 실패:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleBellClick = () => {
        if (!isOpen) {
            fetchNotifications();
        }
        setIsOpen(!isOpen);
    };

    const handleMarkAsRead = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await markAsRead(notificationId);
            setNotifications(notifications.map(n =>
                n.notificationId === notificationId ? { ...n, read: true } : n
            ));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error('읽음 처리 실패:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead(memberNo);
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('모두 읽음 처리 실패:', error);
        }
    };

    const handleDelete = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await deleteNotification(notificationId);
            const deletedNotif = notifications.find(n => n.notificationId === notificationId);
            setNotifications(notifications.filter(n => n.notificationId !== notificationId));
            if (deletedNotif && !deletedNotif.read) {
                setUnreadCount(Math.max(0, unreadCount - 1));
            }
        } catch (error) {
            console.error('알림 삭제 실패:', error);
        }
    };

    const handleDeleteAll = async () => {
        if (window.confirm('모든 알림을 삭제하시겠습니까?')) {
            try {
                await deleteAllNotifications(memberNo);
                setNotifications([]);
                setUnreadCount(0);
            } catch (error) {
                console.error('모든 알림 삭제 실패:', error);
            }
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'TEAM_INVITE':
                return '👥';
            case 'COLUMN_ASSIGNEE':
                return '📋';
            case 'TASK_ASSIGNEE':
                return '✅';
            case 'COLUMN_UPDATED':
                return '📝';
            case 'TASK_UPDATED':
                return '🔄';
            default:
                return '🔔';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return date.toLocaleDateString('ko-KR');
    };

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button className="bell-button" onClick={handleBellClick}>
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>알림</h3>
                        <div className="header-actions">
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllAsRead} className="action-btn">
                                    모두 읽음
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={handleDeleteAll} className="action-btn delete">
                                    모두 삭제
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">로딩 중...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">알림이 없습니다.</div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.notificationId}
                                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                    onClick={(e) => !notification.read && handleMarkAsRead(notification.notificationId, e)}
                                >
                                    <span className="notification-icon">
                                        {getNotificationIcon(notification.notificationType)}
                                    </span>
                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        <div className="notification-meta">
                                            {notification.senderName && (
                                                <span className="sender">{notification.senderName}</span>
                                            )}
                                            <span className="time">{formatTime(notification.createdAt)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => handleDelete(notification.notificationId, e)}
                                        title="삭제"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
