package com.example.demo.model;

import org.apache.ibatis.type.Alias;
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
    public static final String TYPE_COLUMN_UPDATED = "COLUMN_UPDATED";
    public static final String TYPE_TASK_UPDATED = "TASK_UPDATED";
}
