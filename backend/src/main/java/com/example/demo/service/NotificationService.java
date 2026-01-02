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

    // ============ 검증자 관련 알림 ============

    // 태스크 검증자 지정 알림
    public void notifyTaskVerifier(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_VERIFIER);
        n.setTitle("태스크 검증자 지정");
        n.setMessage("'" + taskTitle + "' 태스크의 검증자로 지정되었습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // ============ 워크플로우 관련 알림 ============

    // 태스크 수락 알림 (담당자가 수락 -> 요청자에게)
    public void notifyTaskAccepted(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_ACCEPTED);
        n.setTitle("태스크 수락됨");
        n.setMessage("'" + taskTitle + "' 태스크가 수락되었습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 태스크 거절 알림 (담당자가 거절 -> 요청자에게)
    public void notifyTaskDeclined(int recipientNo, int senderNo, int taskId, String taskTitle, String reason, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_DECLINED);
        n.setTitle("태스크 거절됨");
        n.setMessage("'" + taskTitle + "' 태스크가 거절되었습니다." + (reason != null ? " 사유: " + reason : ""));
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 태스크 검토 요청 알림 (담당자가 제출 -> 검증자에게)
    public void notifyTaskReview(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_REVIEW);
        n.setTitle("태스크 검토 요청");
        n.setMessage("'" + taskTitle + "' 태스크의 검토가 요청되었습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 태스크 승인 알림 (검증자가 승인 -> 담당자에게)
    public void notifyTaskApproved(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_APPROVED);
        n.setTitle("태스크 승인됨");
        n.setMessage("'" + taskTitle + "' 태스크가 승인되어 완료되었습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 태스크 반려 알림 (검증자가 반려 -> 담당자에게)
    public void notifyTaskRejected(int recipientNo, int senderNo, int taskId, String taskTitle, String reason, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_TASK_REJECTED);
        n.setTitle("태스크 반려됨");
        n.setMessage("'" + taskTitle + "' 태스크가 반려되었습니다." + (reason != null ? " 사유: " + reason : ""));
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // ============ 댓글/멘션 관련 알림 ============

    // 댓글 알림
    public void notifyCommentAdded(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_COMMENT_ADDED);
        n.setTitle("새 댓글");
        n.setMessage("'" + taskTitle + "' 태스크에 새 댓글이 달렸습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 멘션 알림
    public void notifyMention(int recipientNo, int senderNo, int taskId, String taskTitle, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(senderNo);
        n.setNotificationType(Notification.TYPE_MENTION);
        n.setTitle("멘션됨");
        n.setMessage("'" + taskTitle + "' 태스크에서 회원님을 멘션했습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // ============ 마감일 관련 알림 ============

    // 마감일 임박 알림
    public void notifyDeadlineApproaching(int recipientNo, int taskId, String taskTitle, String dueDate, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(null);  // 시스템 알림
        n.setNotificationType(Notification.TYPE_DEADLINE_APPROACHING);
        n.setTitle("마감일 임박");
        n.setMessage("'" + taskTitle + "' 태스크의 마감일(" + dueDate + ")이 임박했습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // 마감일 초과 알림
    public void notifyDeadlineOverdue(int recipientNo, int taskId, String taskTitle, String dueDate, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(null);  // 시스템 알림
        n.setNotificationType(Notification.TYPE_DEADLINE_OVERDUE);
        n.setTitle("마감일 초과");
        n.setMessage("'" + taskTitle + "' 태스크의 마감일(" + dueDate + ")이 지났습니다.");
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }

    // ============ GitHub 연동 관련 알림 ============

    // 커밋 연결 알림
    public void notifyCommitLinked(int recipientNo, int taskId, String taskTitle, String commitMessage, String branchName, int teamId) {
        Notification n = new Notification();
        n.setRecipientNo(recipientNo);
        n.setSenderNo(null);  // 시스템 알림
        n.setNotificationType(Notification.TYPE_COMMIT_LINKED);
        n.setTitle("커밋 연결됨");
        String msg = "'" + taskTitle + "' 태스크에 커밋이 연결되었습니다.";
        if (branchName != null) {
            msg += " (브랜치: " + branchName + ")";
        }
        n.setMessage(msg);
        n.setTaskId(taskId);
        n.setTeamId(teamId);
        dao.insert(n);
    }
}
