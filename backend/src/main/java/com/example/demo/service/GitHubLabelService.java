package com.example.demo.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * GitHub Label 관리 서비스
 * - Synodos 상태/우선순위 ↔ GitHub Label 매핑
 */
@Slf4j
@Service
public class GitHubLabelService {

    @Autowired
    private GitHubIssueService gitHubIssueService;

    // ==================== Status Labels ====================

    private static final Map<String, LabelConfig> STATUS_LABELS = new LinkedHashMap<>();
    static {
        STATUS_LABELS.put("WAITING", new LabelConfig("status:waiting", "94a3b8", "Task is waiting to be started"));
        STATUS_LABELS.put("IN_PROGRESS", new LabelConfig("status:in-progress", "3b82f6", "Task is in progress"));
        STATUS_LABELS.put("REVIEW", new LabelConfig("status:review", "f59e0b", "Task is under review"));
        STATUS_LABELS.put("DONE", new LabelConfig("status:done", "10b981", "Task is completed"));
        STATUS_LABELS.put("REJECTED", new LabelConfig("status:rejected", "ef4444", "Task was rejected"));
        STATUS_LABELS.put("DECLINED", new LabelConfig("status:declined", "6b7280", "Task was declined"));
    }

    // ==================== Priority Labels ====================

    private static final Map<String, LabelConfig> PRIORITY_LABELS = new LinkedHashMap<>();
    static {
        PRIORITY_LABELS.put("CRITICAL", new LabelConfig("priority:critical", "dc2626", "Critical priority"));
        PRIORITY_LABELS.put("HIGH", new LabelConfig("priority:high", "f97316", "High priority"));
        PRIORITY_LABELS.put("MEDIUM", new LabelConfig("priority:medium", "eab308", "Medium priority"));
        PRIORITY_LABELS.put("LOW", new LabelConfig("priority:low", "22c55e", "Low priority"));
    }

    // ==================== Label Config DTO ====================

    @Data
    @AllArgsConstructor
    public static class LabelConfig {
        private String name;
        private String color;
        private String description;
    }

    // ==================== Mapping Methods ====================

    /**
     * Synodos 상태 → GitHub Label 이름
     */
    public String mapWorkflowStatusToLabel(String workflowStatus) {
        if (workflowStatus == null) return null;
        LabelConfig config = STATUS_LABELS.get(workflowStatus.toUpperCase());
        return config != null ? config.getName() : null;
    }

    /**
     * GitHub Label → Synodos 상태
     */
    public String mapLabelToWorkflowStatus(String label) {
        if (label == null) return null;
        for (Map.Entry<String, LabelConfig> entry : STATUS_LABELS.entrySet()) {
            if (entry.getValue().getName().equalsIgnoreCase(label)) {
                return entry.getKey();
            }
        }
        return null;
    }

    /**
     * Synodos 우선순위 → GitHub Label 이름
     */
    public String mapPriorityToLabel(String priority) {
        if (priority == null) return null;
        LabelConfig config = PRIORITY_LABELS.get(priority.toUpperCase());
        return config != null ? config.getName() : null;
    }

    /**
     * GitHub Label → Synodos 우선순위
     */
    public String mapLabelToPriority(String label) {
        if (label == null) return null;
        for (Map.Entry<String, LabelConfig> entry : PRIORITY_LABELS.entrySet()) {
            if (entry.getValue().getName().equalsIgnoreCase(label)) {
                return entry.getKey();
            }
        }
        return null;
    }

    /**
     * Label 목록에서 상태 Label 추출
     */
    public String extractStatusFromLabels(List<String> labels) {
        if (labels == null) return null;
        for (String label : labels) {
            if (label.startsWith("status:")) {
                String status = mapLabelToWorkflowStatus(label);
                if (status != null) return status;
            }
        }
        return null;
    }

    /**
     * Label 목록에서 우선순위 Label 추출
     */
    public String extractPriorityFromLabels(List<String> labels) {
        if (labels == null) return null;
        for (String label : labels) {
            if (label.startsWith("priority:")) {
                String priority = mapLabelToPriority(label);
                if (priority != null) return priority;
            }
        }
        return null;
    }

    // ==================== Label Management ====================

    /**
     * Repository에 필요한 모든 Label 생성 (없는 것만)
     */
    public void ensureAllLabels(String owner, String repo, String token) {
        log.info("Ensuring all status/priority labels exist in {}/{}", owner, repo);

        // 기존 Label 조회
        List<GitHubIssueService.GitHubLabel> existingLabels = gitHubIssueService.listLabels(owner, repo, token);
        Set<String> existingNames = existingLabels.stream()
            .map(GitHubIssueService.GitHubLabel::getName)
            .collect(Collectors.toSet());

        // Status Labels 생성
        for (LabelConfig config : STATUS_LABELS.values()) {
            if (!existingNames.contains(config.getName())) {
                try {
                    gitHubIssueService.createLabel(owner, repo, token, config.getName(), config.getColor(), config.getDescription());
                    log.info("Created label: {}", config.getName());
                } catch (Exception e) {
                    log.warn("Failed to create label {}: {}", config.getName(), e.getMessage());
                }
            }
        }

        // Priority Labels 생성
        for (LabelConfig config : PRIORITY_LABELS.values()) {
            if (!existingNames.contains(config.getName())) {
                try {
                    gitHubIssueService.createLabel(owner, repo, token, config.getName(), config.getColor(), config.getDescription());
                    log.info("Created label: {}", config.getName());
                } catch (Exception e) {
                    log.warn("Failed to create label {}: {}", config.getName(), e.getMessage());
                }
            }
        }
    }

    /**
     * Issue의 상태 Label 업데이트 (기존 상태 Label 제거 후 새 Label 추가)
     */
    public void updateIssueStatusLabel(String owner, String repo, String token, int issueNumber, String newStatus) {
        String newLabel = mapWorkflowStatusToLabel(newStatus);
        if (newLabel == null) {
            log.warn("Unknown status: {}", newStatus);
            return;
        }

        try {
            // 현재 Issue 조회
            GitHubIssueService.GitHubIssue issue = gitHubIssueService.getIssue(owner, repo, token, issueNumber);
            if (issue == null) {
                log.warn("Issue #{} not found", issueNumber);
                return;
            }

            // 기존 상태 Label 제거
            for (String label : issue.getLabels()) {
                if (label.startsWith("status:") && !label.equals(newLabel)) {
                    gitHubIssueService.removeLabel(owner, repo, token, issueNumber, label);
                }
            }

            // 새 상태 Label이 없으면 추가
            if (!issue.getLabels().contains(newLabel)) {
                gitHubIssueService.addLabels(owner, repo, token, issueNumber, List.of(newLabel));
            }

            log.info("Updated status label on issue #{} to {}", issueNumber, newLabel);
        } catch (Exception e) {
            log.error("Failed to update status label: {}", e.getMessage());
            throw new RuntimeException("상태 Label 업데이트 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Issue의 우선순위 Label 업데이트
     */
    public void updateIssuePriorityLabel(String owner, String repo, String token, int issueNumber, String newPriority) {
        String newLabel = mapPriorityToLabel(newPriority);
        if (newLabel == null) {
            log.warn("Unknown priority: {}", newPriority);
            return;
        }

        try {
            // 현재 Issue 조회
            GitHubIssueService.GitHubIssue issue = gitHubIssueService.getIssue(owner, repo, token, issueNumber);
            if (issue == null) {
                log.warn("Issue #{} not found", issueNumber);
                return;
            }

            // 기존 우선순위 Label 제거
            for (String label : issue.getLabels()) {
                if (label.startsWith("priority:") && !label.equals(newLabel)) {
                    gitHubIssueService.removeLabel(owner, repo, token, issueNumber, label);
                }
            }

            // 새 우선순위 Label이 없으면 추가
            if (!issue.getLabels().contains(newLabel)) {
                gitHubIssueService.addLabels(owner, repo, token, issueNumber, List.of(newLabel));
            }

            log.info("Updated priority label on issue #{} to {}", issueNumber, newLabel);
        } catch (Exception e) {
            log.error("Failed to update priority label: {}", e.getMessage());
            throw new RuntimeException("우선순위 Label 업데이트 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Task의 상태와 우선순위를 Label 목록으로 변환
     */
    public List<String> buildLabelsFromTask(String workflowStatus, String priority) {
        List<String> labels = new ArrayList<>();

        String statusLabel = mapWorkflowStatusToLabel(workflowStatus);
        if (statusLabel != null) {
            labels.add(statusLabel);
        }

        String priorityLabel = mapPriorityToLabel(priority);
        if (priorityLabel != null) {
            labels.add(priorityLabel);
        }

        return labels;
    }

    /**
     * 모든 상태 Label 이름 목록 반환
     */
    public List<String> getAllStatusLabels() {
        return STATUS_LABELS.values().stream()
            .map(LabelConfig::getName)
            .collect(Collectors.toList());
    }

    /**
     * 모든 우선순위 Label 이름 목록 반환
     */
    public List<String> getAllPriorityLabels() {
        return PRIORITY_LABELS.values().stream()
            .map(LabelConfig::getName)
            .collect(Collectors.toList());
    }
}
