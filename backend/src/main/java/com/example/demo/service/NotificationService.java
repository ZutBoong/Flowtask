package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.NotificationDao;
import com.example.demo.model.Notification;

@Service
public class NotificationService {

    @Autowired
    private NotificationDao dao;

    // 알림 생성
    public int createNotification(Notification notification) {
        return dao.insert(notification);
    }

    // 팀 초대 알림
    public void notifyTeamInvite(int recipientNo, int senderNo, int teamId, String teamName) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TEAM_INVITE);
        n.setTitle("팀 초대");
        n.setMessage(teamName + " 팀에 초대되었습니다.");
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 태스크 담당자 지정 알림
    public void notifyTaskAssignee(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_ASSIGNEE);
        n.setTitle("태스크 담당자 지정");
        n.setMessage("'" + taskTitle + "' 태스크의 담당자로 지정되었습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 컬럼 변경 알림 (담당자들에게)
    public void notifyColumnUpdated(int recipientNo, int senderNo, int columnId, String columnTitle, String changeDescription) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_COLUMN_UPDATED);
        n.setTitle("컬럼 변경");
        n.setMessage("'" + columnTitle + "' 컬럼이 변경되었습니다: " + changeDescription);
        n.setColumnId(columnId);
        dao.insert(n);
    }

    // 태스크 변경 알림 (담당자에게)
    public void notifyTaskUpdated(int recipientNo, int senderNo, int taskId, String taskTitle, String changeDescription) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_UPDATED);
        n.setTitle("태스크 변경");
        n.setMessage("'" + taskTitle + "' 태스크가 변경되었습니다: " + changeDescription);
        n.setTaskId(taskId);
        dao.insert(n);
    }

    // 범용 알림 발송 (워크플로우용)
    public void sendNotification(int recipientNo, int senderNo, String type, String title, String message, int teamId, int columnId, int taskId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setTeamId(teamId);
        n.setColumnId(columnId);
        n.setTaskId(taskId);
        dao.insert(n);
    }

    // 알림 목록 조회
    public List<Notification> getNotifications(int recipientNo, int limit) {
        return dao.listByRecipient(recipientNo, limit);
    }

    // 읽지 않은 알림 목록
    public List<Notification> getUnreadNotifications(int recipientNo) {
        return dao.listUnreadByRecipient(recipientNo);
    }

    // 읽지 않은 알림 수
    public int getUnreadCount(int recipientNo) {
        return dao.countUnread(recipientNo);
    }

    // 읽음 처리
    public int markAsRead(int notificationId) {
        return dao.markAsRead(notificationId);
    }

    // 모두 읽음 처리
    public int markAllAsRead(int recipientNo) {
        return dao.markAllAsRead(recipientNo);
    }

    // 알림 삭제
    public int deleteNotification(int notificationId) {
        return dao.delete(notificationId);
    }

    // 모든 알림 삭제
    public int deleteAllNotifications(int recipientNo) {
        return dao.deleteAllByRecipient(recipientNo);
    }
}
