package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("notification")
public class Notification {
    private int notificationId;
    private int recipientNo;
    private Integer senderNo;
    private String notificationType;
    private String title;
    private String message;
    private Integer teamId;
    private Integer columnId;
    private Integer taskId;

    @JsonProperty("isRead")
    private boolean isRead;
    private LocalDateTime createdAt;

    // 조인용 필드
    private String senderName;
    private String senderUserid;
    private String teamName;
    private String columnTitle;
    private String taskTitle;

    // 알림 타입 상수
    public static final String TYPE_TEAM_INVITE = "TEAM_INVITE";
    public static final String TYPE_TASK_ASSIGNEE = "TASK_ASSIGNEE";
    public static final String TYPE_TASK_VERIFIER = "TASK_VERIFIER";
    public static final String TYPE_COLUMN_UPDATED = "COLUMN_UPDATED";
    public static final String TYPE_TASK_UPDATED = "TASK_UPDATED";

    // 워크플로우 관련
    public static final String TYPE_TASK_REVIEW = "TASK_REVIEW";
    public static final String TYPE_TASK_APPROVED = "TASK_APPROVED";
    public static final String TYPE_TASK_REJECTED = "TASK_REJECTED";
    public static final String TYPE_TASK_ACCEPTED = "TASK_ACCEPTED";
    public static final String TYPE_TASK_DECLINED = "TASK_DECLINED";

    // 마감일 관련
    public static final String TYPE_DEADLINE_APPROACHING = "DEADLINE_APPROACHING";
    public static final String TYPE_DEADLINE_OVERDUE = "DEADLINE_OVERDUE";

    // 댓글/멘션 관련
    public static final String TYPE_COMMENT_ADDED = "COMMENT_ADDED";
    public static final String TYPE_MENTION = "MENTION";

    // GitHub 관련
    public static final String TYPE_COMMIT_LINKED = "COMMIT_LINKED";
}
