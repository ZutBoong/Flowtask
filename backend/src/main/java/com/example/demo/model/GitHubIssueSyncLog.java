package com.example.demo.model;

import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

/**
 * GitHub Issue 동기화 로그 엔티티
 */
@Data
@Alias("githubIssueSyncLog")
public class GitHubIssueSyncLog {
    private int id;
    private Integer taskGitHubIssueId;
    private Integer taskId;
    private Integer issueNumber;
    private Integer teamId;
    private String syncDirection;     // PUSH, PULL
    private String syncType;          // CREATE, UPDATE, LINK, UNLINK
    private String fieldChanged;      // workflow_status, priority, assignees, etc.
    private String oldValue;
    private String newValue;
    private String syncStatus;        // SUCCESS, FAILED, CONFLICT
    private String errorMessage;
    private String triggeredBy;       // WEBHOOK, MANUAL, AUTO
    private String webhookDeliveryId;
    private LocalDateTime createdAt;

    // 동기화 방향 상수
    public static final String DIRECTION_PUSH = "PUSH";
    public static final String DIRECTION_PULL = "PULL";

    // 동기화 타입 상수
    public static final String TYPE_CREATE = "CREATE";
    public static final String TYPE_UPDATE = "UPDATE";
    public static final String TYPE_LINK = "LINK";
    public static final String TYPE_UNLINK = "UNLINK";

    // 동기화 상태 상수
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_CONFLICT = "CONFLICT";

    // 트리거 상수
    public static final String TRIGGER_WEBHOOK = "WEBHOOK";
    public static final String TRIGGER_MANUAL = "MANUAL";
    public static final String TRIGGER_AUTO = "AUTO";

    /**
     * 빌더 스타일 팩토리 메서드
     */
    public static GitHubIssueSyncLog createLog(
            Integer taskId, Integer issueNumber, Integer teamId,
            String direction, String type, String field,
            String oldVal, String newVal, String status, String trigger) {
        GitHubIssueSyncLog log = new GitHubIssueSyncLog();
        log.setTaskId(taskId);
        log.setIssueNumber(issueNumber);
        log.setTeamId(teamId);
        log.setSyncDirection(direction);
        log.setSyncType(type);
        log.setFieldChanged(field);
        log.setOldValue(oldVal);
        log.setNewValue(newVal);
        log.setSyncStatus(status);
        log.setTriggeredBy(trigger);
        return log;
    }
}
