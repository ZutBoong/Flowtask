package com.example.demo.service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.dao.TaskCommitDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.dao.SynodosColumnDao;
import com.example.demo.dto.GitHubWebhookPayload;
import com.example.demo.dto.GitHubWebhookPayload.Commit;
import com.example.demo.model.Task;
import com.example.demo.model.TaskAssignee;
import com.example.demo.model.TaskCommit;
import com.example.demo.model.Team;
import com.example.demo.model.SynodosColumn;

import lombok.extern.slf4j.Slf4j;

/**
 * GitHub Webhook 처리 서비스
 * - 브랜치명에서 태스크 ID 파싱 (우선)
 * - 커밋 메시지에서 태스크 ID 파싱 (폴백)
 */
@Slf4j
@Service
public class GitHubWebhookService {

    // 태스크 ID 패턴: TASK-123, task-123, #TASK-123, #123
    private static final Pattern TASK_ID_PATTERN = Pattern.compile(
        "(?:#?TASK-|#)(\\d+)",
        Pattern.CASE_INSENSITIVE
    );

    // 브랜치명 패턴: feature/TASK-123-description, bugfix/TASK-42
    private static final Pattern BRANCH_TASK_PATTERN = Pattern.compile(
        "(?:^|/)TASK-(\\d+)",
        Pattern.CASE_INSENSITIVE
    );

    @Autowired
    private TeamDao teamDao;

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private TaskCommitDao taskCommitDao;

    @Autowired
    private TaskAssigneeDao assigneeDao;

    @Autowired
    private SynodosColumnDao columnDao;

    @Autowired
    private NotificationService notificationService;

    /**
     * GitHub Webhook push 이벤트 처리
     * @return 연결된 커밋 수
     */
    public WebhookResult processWebhook(GitHubWebhookPayload payload) {
        WebhookResult result = new WebhookResult();

        if (payload == null || payload.getCommits() == null || payload.getCommits().isEmpty()) {
            log.info("No commits to process");
            return result;
        }

        String repoFullName = payload.getRepository().getFullName();
        String repoUrl = payload.getRepository().getHtmlUrl();
        String branchName = payload.getBranchName();

        log.info("Processing webhook for repo: {}, branch: {}, commits: {}",
            repoFullName, branchName, payload.getCommits().size());

        // 저장소 URL로 팀 찾기
        Team team = findTeamByRepoUrl(repoUrl);
        if (team == null) {
            log.warn("No team found for repository: {}", repoUrl);
            result.setError("등록된 팀을 찾을 수 없습니다: " + repoUrl);
            return result;
        }

        result.setTeamId(team.getTeamId());
        result.setTeamName(team.getTeamName());

        // 1. 브랜치명에서 태스크 ID 추출 (우선순위 높음)
        Set<Integer> branchTaskIds = parseTaskIdsFromBranch(branchName);
        log.info("Task IDs from branch '{}': {}", branchName, branchTaskIds);

        // 각 커밋 처리
        for (Commit commit : payload.getCommits()) {
            CommitLinkResult linkResult = processCommit(commit, branchTaskIds, team.getTeamId(), repoUrl);
            result.addCommitResult(linkResult);
        }

        log.info("Webhook processing complete. Linked: {}, Skipped: {}, Failed: {}",
            result.getLinkedCount(), result.getSkippedCount(), result.getFailedCount());

        return result;
    }

    /**
     * 개별 커밋 처리
     */
    private CommitLinkResult processCommit(Commit commit, Set<Integer> branchTaskIds, int teamId, String repoUrl) {
        CommitLinkResult result = new CommitLinkResult();
        result.setCommitSha(commit.getId());
        result.setCommitMessage(truncateMessage(commit.getMessage()));

        // 연결할 태스크 ID 결정
        Set<Integer> taskIds = new HashSet<>();

        // 브랜치에서 추출한 태스크 ID가 있으면 사용
        if (!branchTaskIds.isEmpty()) {
            taskIds.addAll(branchTaskIds);
            result.setSource("branch");
        }

        // 커밋 메시지에서도 태스크 ID 추출 (추가로 연결)
        Set<Integer> messageTaskIds = parseTaskIdsFromMessage(commit.getMessage());
        if (!messageTaskIds.isEmpty()) {
            taskIds.addAll(messageTaskIds);
            if (result.getSource() == null) {
                result.setSource("commit");
            } else {
                result.setSource("both");
            }
        }

        if (taskIds.isEmpty()) {
            result.setStatus("skipped");
            result.setReason("태스크 ID를 찾을 수 없음");
            return result;
        }

        // 각 태스크에 커밋 연결
        List<Integer> linkedTasks = new ArrayList<>();
        for (Integer taskId : taskIds) {
            try {
                boolean linked = linkCommitToTask(commit, taskId, teamId, repoUrl, result.getSource());
                if (linked) {
                    linkedTasks.add(taskId);
                }
            } catch (Exception e) {
                log.error("Failed to link commit {} to task {}: {}",
                    commit.getId().substring(0, 7), taskId, e.getMessage());
            }
        }

        if (!linkedTasks.isEmpty()) {
            result.setStatus("linked");
            result.setLinkedTaskIds(linkedTasks);
        } else {
            result.setStatus("skipped");
            result.setReason("이미 연결되었거나 태스크가 존재하지 않음");
        }

        return result;
    }

    /**
     * 커밋을 태스크에 연결
     */
    private boolean linkCommitToTask(Commit commit, int taskId, int teamId, String repoUrl, String source) {
        // 태스크 존재 확인 (해당 팀의 태스크인지도 확인)
        Task task = taskDao.content(taskId);
        if (task == null) {
            log.debug("Task {} not found", taskId);
            return false;
        }

        // 중복 체크
        if (taskCommitDao.countByTaskAndSha(taskId, commit.getId()) > 0) {
            log.debug("Commit {} already linked to task {}", commit.getId().substring(0, 7), taskId);
            return false;
        }

        // 커밋 저장
        TaskCommit taskCommit = new TaskCommit();
        taskCommit.setTaskId(taskId);
        taskCommit.setCommitSha(commit.getId());
        taskCommit.setCommitMessage(truncateMessage(commit.getMessage()));
        taskCommit.setCommitAuthor(commit.getAuthor().getName());
        taskCommit.setGithubUrl(commit.getUrl());
        taskCommit.setLinkedBy(null);  // Webhook에 의한 자동 연결

        // 타임스탬프 파싱
        if (commit.getTimestamp() != null) {
            try {
                java.time.Instant instant = java.time.Instant.parse(commit.getTimestamp());
                taskCommit.setCommitDate(Timestamp.from(instant));
            } catch (Exception e) {
                log.debug("Failed to parse commit timestamp: {}", commit.getTimestamp());
            }
        }

        taskCommitDao.insert(taskCommit);
        log.info("Linked commit {} to task {}", commit.getId().substring(0, 7), taskId);

        // 담당자들에게 커밋 연결 알림 발송
        notifyAssigneesForCommit(task, commit, source);

        return true;
    }

    /**
     * 담당자들에게 커밋 연결 알림 발송
     */
    private void notifyAssigneesForCommit(Task task, Commit commit, String source) {
        SynodosColumn column = columnDao.content(task.getColumnId());
        if (column == null) return;

        int teamId = column.getTeamId();
        String branchName = "branch".equals(source) || "both".equals(source) ? source : null;

        // 담당자들에게 알림
        List<TaskAssignee> assignees = assigneeDao.listByTask(task.getTaskId());
        for (TaskAssignee assignee : assignees) {
            notificationService.notifyCommitLinked(
                assignee.getMemberNo(),
                task.getTaskId(),
                task.getTitle(),
                truncateMessage(commit.getMessage()),
                branchName,
                teamId
            );
        }

        // 태스크 생성자에게도 알림 (담당자가 아닌 경우)
        if (task.getCreatedBy() != null) {
            boolean isAssignee = assignees.stream()
                .anyMatch(a -> a.getMemberNo() == task.getCreatedBy());
            if (!isAssignee) {
                notificationService.notifyCommitLinked(
                    task.getCreatedBy(),
                    task.getTaskId(),
                    task.getTitle(),
                    truncateMessage(commit.getMessage()),
                    branchName,
                    teamId
                );
            }
        }
    }

    /**
     * 브랜치명에서 태스크 ID 추출
     * feature/TASK-42-login -> [42]
     * bugfix/TASK-10-TASK-20 -> [10, 20]
     */
    public Set<Integer> parseTaskIdsFromBranch(String branchName) {
        Set<Integer> taskIds = new HashSet<>();
        if (branchName == null) return taskIds;

        Matcher matcher = BRANCH_TASK_PATTERN.matcher(branchName);
        while (matcher.find()) {
            try {
                taskIds.add(Integer.parseInt(matcher.group(1)));
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        return taskIds;
    }

    /**
     * 커밋 메시지에서 태스크 ID 추출
     * "fix: 버그 수정 #TASK-42" -> [42]
     * "feat: 기능 추가 #42 #43" -> [42, 43]
     */
    public Set<Integer> parseTaskIdsFromMessage(String message) {
        Set<Integer> taskIds = new HashSet<>();
        if (message == null) return taskIds;

        Matcher matcher = TASK_ID_PATTERN.matcher(message);
        while (matcher.find()) {
            try {
                taskIds.add(Integer.parseInt(matcher.group(1)));
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        return taskIds;
    }

    /**
     * 저장소 URL로 팀 찾기
     */
    private Team findTeamByRepoUrl(String repoUrl) {
        if (repoUrl == null) return null;

        // URL 정규화 (끝에 .git 제거, 슬래시 정리)
        String normalizedUrl = repoUrl
            .replaceAll("\\.git$", "")
            .replaceAll("/$", "");

        return teamDao.findByGithubRepoUrl(normalizedUrl);
    }

    /**
     * 메시지 길이 제한
     */
    private String truncateMessage(String message) {
        if (message == null) return null;
        // 첫 줄만 사용
        String firstLine = message.split("\n")[0];
        if (firstLine.length() > 200) {
            return firstLine.substring(0, 197) + "...";
        }
        return firstLine;
    }

    // ===== Result DTOs =====

    @lombok.Data
    public static class WebhookResult {
        private int teamId;
        private String teamName;
        private String error;
        private List<CommitLinkResult> commitResults = new ArrayList<>();

        public void addCommitResult(CommitLinkResult result) {
            commitResults.add(result);
        }

        public int getLinkedCount() {
            return (int) commitResults.stream()
                .filter(r -> "linked".equals(r.getStatus()))
                .count();
        }

        public int getSkippedCount() {
            return (int) commitResults.stream()
                .filter(r -> "skipped".equals(r.getStatus()))
                .count();
        }

        public int getFailedCount() {
            return (int) commitResults.stream()
                .filter(r -> "failed".equals(r.getStatus()))
                .count();
        }
    }

    @lombok.Data
    public static class CommitLinkResult {
        private String commitSha;
        private String commitMessage;
        private String status;  // linked, skipped, failed
        private String source;  // branch, commit, both
        private String reason;
        private List<Integer> linkedTaskIds;
    }
}
