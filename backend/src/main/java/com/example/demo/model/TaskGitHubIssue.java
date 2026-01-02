package com.example.demo.model;

import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

/**
 * Synodos Task와 GitHub Issue 간의 1:1 매핑 엔티티
 */
@Data
@Alias("taskGitHubIssue")
public class TaskGitHubIssue {
    private int id;
    private int taskId;
    private int teamId;
    private int issueNumber;
    private long issueId;
    private String issueTitle;
    private String issueUrl;
    private String syncStatus;
    private LocalDateTime lastSyncedAt;
    private LocalDateTime synodosUpdatedAt;
    private LocalDateTime githubUpdatedAt;
    private LocalDateTime createdAt;

    // Join fields
    private String taskTitle;
    private String teamName;

    // 동기화 상태 상수
    public static final String STATUS_SYNCED = "SYNCED";
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_CONFLICT = "CONFLICT";
    public static final String STATUS_ERROR = "ERROR";

    // 동기화 방향 상수
    public static final String DIRECTION_PUSH = "PUSH";       // Synodos -> GitHub
    public static final String DIRECTION_PULL = "PULL";       // GitHub -> Synodos

    /**
     * 충돌 여부 확인 (5분 이내 양쪽 수정)
     */
    public boolean hasConflict() {
        if (synodosUpdatedAt == null || githubUpdatedAt == null) {
            return false;
        }
        // 5분 이내 양쪽 수정이면 충돌
        long diffMinutes = Math.abs(
            java.time.Duration.between(synodosUpdatedAt, githubUpdatedAt).toMinutes()
        );
        return diffMinutes <= 5;
    }

    /**
     * 더 최근에 수정된 쪽 반환
     */
    public String getLatestSource() {
        if (synodosUpdatedAt == null && githubUpdatedAt == null) {
            return null;
        }
        if (synodosUpdatedAt == null) {
            return "GITHUB";
        }
        if (githubUpdatedAt == null) {
            return "SYNODOS";
        }
        return synodosUpdatedAt.isAfter(githubUpdatedAt) ? "SYNODOS" : "GITHUB";
    }
}
