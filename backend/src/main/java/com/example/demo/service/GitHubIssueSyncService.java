package com.example.demo.service;

import com.example.demo.dao.*;
import com.example.demo.model.*;
import com.example.demo.dto.GitHubIssuePayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * GitHub Issue ↔ Synodos Task 양방향 동기화 서비스
 */
@Slf4j
@Service
public class GitHubIssueSyncService {

    @Autowired
    private TaskGitHubIssueDao taskGitHubIssueDao;

    @Autowired
    private GitHubUserMappingDao gitHubUserMappingDao;

    @Autowired
    private GitHubIssueSyncLogDao syncLogDao;

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private TeamDao teamDao;

    @Autowired
    private SynodosColumnDao columnDao;

    @Autowired
    private TaskAssigneeDao taskAssigneeDao;

    @Autowired
    private TaskVerifierDao taskVerifierDao;

    @Autowired
    private GitHubService gitHubService;

    @Autowired
    private GitHubIssueService gitHubIssueService;

    @Autowired
    private GitHubLabelService labelService;

    @Autowired
    private BoardNotificationService boardNotificationService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private MemberDao memberDao;

    // ==================== Synodos → GitHub ====================

    /**
     * Task에서 GitHub Issue 생성
     */
    @Transactional
    public TaskGitHubIssue createIssueFromTask(int taskId, int teamId, int memberNo) {
        Task task = taskDao.content(taskId);
        if (task == null) {
            throw new RuntimeException("Task를 찾을 수 없습니다: " + taskId);
        }

        Team team = teamDao.findById(teamId);
        if (team == null || team.getGithubRepoUrl() == null) {
            throw new RuntimeException("팀 또는 GitHub 저장소 설정을 찾을 수 없습니다.");
        }

        // 멤버의 GitHub 토큰 확인
        Member member = memberDao.findByNo(memberNo);
        if (member == null || member.getGithubAccessToken() == null) {
            throw new RuntimeException("GitHub 계정이 연결되지 않았습니다. 먼저 GitHub 계정을 연결해주세요.");
        }

        // 이미 연결된 Issue가 있는지 확인
        if (taskGitHubIssueDao.countByTaskId(taskId) > 0) {
            throw new RuntimeException("이미 GitHub Issue가 연결되어 있습니다.");
        }

        GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());
        if (repoInfo == null) {
            throw new RuntimeException("잘못된 GitHub 저장소 URL입니다.");
        }

        String token = member.getGithubAccessToken();

        // Label 자동 생성 확인
        labelService.ensureAllLabels(repoInfo.owner, repoInfo.repo, token);

        // Issue 생성 요청 구성
        GitHubIssueService.CreateIssueRequest request = new GitHubIssueService.CreateIssueRequest();
        request.setTitle(task.getTitle());
        request.setBody(buildIssueBody(task));
        request.setLabels(labelService.buildLabelsFromTask(task.getWorkflowStatus(), task.getPriority()));

        // Assignees 매핑
        List<TaskAssignee> assignees = taskAssigneeDao.listByTask(taskId);
        if (!assignees.isEmpty()) {
            List<String> githubAssignees = mapMembersToGitHubUsers(
                assignees.stream().map(TaskAssignee::getMemberNo).collect(Collectors.toList())
            );
            if (!githubAssignees.isEmpty()) {
                request.setAssignees(githubAssignees);
            }
        }

        // GitHub Issue 생성
        GitHubIssueService.GitHubIssue issue = gitHubIssueService.createIssue(
            repoInfo.owner, repoInfo.repo, token, request
        );

        // 매핑 저장
        TaskGitHubIssue mapping = new TaskGitHubIssue();
        mapping.setTaskId(taskId);
        mapping.setTeamId(teamId);
        mapping.setIssueNumber(issue.getNumber());
        mapping.setIssueId(issue.getId());
        mapping.setIssueTitle(issue.getTitle());
        mapping.setIssueUrl(issue.getHtmlUrl());
        mapping.setSyncStatus(TaskGitHubIssue.STATUS_SYNCED);
        mapping.setLastSyncedAt(LocalDateTime.now());
        mapping.setSynodosUpdatedAt(LocalDateTime.now());
        mapping.setGithubUpdatedAt(LocalDateTime.now());

        taskGitHubIssueDao.insert(mapping);

        // 로그 기록
        logSync(mapping.getId(), taskId, issue.getNumber(), teamId,
            GitHubIssueSyncLog.DIRECTION_PUSH, GitHubIssueSyncLog.TYPE_CREATE,
            null, null, issue.getTitle(), GitHubIssueSyncLog.STATUS_SUCCESS, null);

        log.info("Created GitHub Issue #{} from Task #{}", issue.getNumber(), taskId);
        return taskGitHubIssueDao.findById(mapping.getId());
    }

    /**
     * Task 변경을 GitHub Issue에 동기화
     */
    @Transactional
    public void syncTaskToGitHub(int taskId, int memberNo) {
        TaskGitHubIssue mapping = taskGitHubIssueDao.findByTaskId(taskId);
        if (mapping == null) {
            log.debug("No GitHub issue linked to task #{}", taskId);
            return;
        }

        Task task = taskDao.content(taskId);
        if (task == null) {
            log.warn("Task #{} not found", taskId);
            return;
        }

        // 멤버의 GitHub 토큰 확인
        Member member = memberDao.findByNo(memberNo);
        if (member == null || member.getGithubAccessToken() == null) {
            throw new RuntimeException("GitHub 계정이 연결되지 않았습니다.");
        }

        Team team = teamDao.findById(mapping.getTeamId());
        if (team == null || team.getGithubRepoUrl() == null) {
            log.warn("Team or GitHub repo not configured for task #{}", taskId);
            return;
        }

        GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());
        String token = member.getGithubAccessToken();

        try {
            // 상태 Label 업데이트
            labelService.updateIssueStatusLabel(repoInfo.owner, repoInfo.repo, token,
                mapping.getIssueNumber(), task.getWorkflowStatus());

            // 우선순위 Label 업데이트
            labelService.updateIssuePriorityLabel(repoInfo.owner, repoInfo.repo, token,
                mapping.getIssueNumber(), task.getPriority());

            // Issue 제목/본문 업데이트
            GitHubIssueService.UpdateIssueRequest request = new GitHubIssueService.UpdateIssueRequest();
            request.setTitle(task.getTitle());
            request.setBody(buildIssueBody(task));

            // DONE 상태면 Issue 닫기
            if ("DONE".equals(task.getWorkflowStatus())) {
                request.setState("closed");
            } else {
                request.setState("open");
            }

            gitHubIssueService.updateIssue(repoInfo.owner, repoInfo.repo, token,
                mapping.getIssueNumber(), request);

            // 동기화 시간 갱신
            mapping.setLastSyncedAt(LocalDateTime.now());
            mapping.setSynodosUpdatedAt(LocalDateTime.now());
            mapping.setSyncStatus(TaskGitHubIssue.STATUS_SYNCED);
            taskGitHubIssueDao.update(mapping);

            log.info("Synced Task #{} to GitHub Issue #{}", taskId, mapping.getIssueNumber());
        } catch (Exception e) {
            log.error("Failed to sync task #{} to GitHub: {}", taskId, e.getMessage());
            mapping.setSyncStatus(TaskGitHubIssue.STATUS_ERROR);
            taskGitHubIssueDao.update(mapping);
            throw e;
        }
    }

    // ==================== GitHub → Synodos ====================

    /**
     * GitHub Issue Webhook 이벤트 처리
     */
    @Transactional
    public void processIssueWebhook(GitHubIssuePayload payload, int teamId, String webhookDeliveryId) {
        // 중복 처리 방지
        if (webhookDeliveryId != null && syncLogDao.countByWebhookDeliveryId(webhookDeliveryId) > 0) {
            log.debug("Webhook {} already processed, skipping", webhookDeliveryId);
            return;
        }

        String action = payload.getAction();
        int issueNumber = payload.getIssue().getNumber();

        log.info("Processing issue webhook: action={}, issue=#{}, team={}", action, issueNumber, teamId);

        // 매핑 조회
        TaskGitHubIssue mapping = taskGitHubIssueDao.findByTeamAndIssue(teamId, issueNumber);

        switch (action) {
            case "opened":
                handleIssueOpened(payload, teamId, mapping, webhookDeliveryId);
                break;
            case "edited":
                handleIssueEdited(payload, mapping, webhookDeliveryId);
                break;
            case "closed":
                handleIssueClosed(payload, mapping, webhookDeliveryId);
                break;
            case "reopened":
                handleIssueReopened(payload, mapping, webhookDeliveryId);
                break;
            case "labeled":
            case "unlabeled":
                handleIssueLabelChanged(payload, mapping, webhookDeliveryId);
                break;
            case "assigned":
            case "unassigned":
                handleIssueAssignmentChanged(payload, mapping, webhookDeliveryId);
                break;
            case "milestoned":
            case "demilestoned":
                handleIssueMilestoneChanged(payload, mapping, webhookDeliveryId);
                break;
            default:
                log.debug("Ignoring issue action: {}", action);
        }
    }

    /**
     * Issue 생성 → Task 자동 생성
     */
    private void handleIssueOpened(GitHubIssuePayload payload, int teamId, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping != null) {
            log.debug("Issue #{} already linked to task", payload.getIssue().getNumber());
            return;
        }

        Team team = teamDao.findById(teamId);
        if (team == null || !Boolean.TRUE.equals(team.getGithubIssueSyncEnabled())) {
            log.debug("Issue sync not enabled for team {}", teamId);
            return;
        }

        // 팀의 컬럼 목록 로드 (github_prefix 포함)
        List<SynodosColumn> columns = columnDao.listByTeam(teamId);
        if (columns.isEmpty()) {
            log.warn("No columns found for team {}", teamId);
            return;
        }

        // 기본 컬럼 확인
        Integer defaultColumnId = team.getGithubDefaultColumnId();
        if (defaultColumnId == null) {
            defaultColumnId = columns.get(0).getColumnId();
        }

        // 제목에서 명령어로 컬럼 결정
        String issueTitle = payload.getIssue().getTitle();
        Integer targetColumnId = findColumnByTitlePrefix(issueTitle, columns);
        if (targetColumnId == null) {
            targetColumnId = defaultColumnId;
        }

        // Task 생성 (명령어가 있으면 제거)
        Task task = createTaskFromIssue(payload, teamId, targetColumnId, columns);

        // 매핑 생성
        TaskGitHubIssue newMapping = new TaskGitHubIssue();
        newMapping.setTaskId(task.getTaskId());
        newMapping.setTeamId(teamId);
        newMapping.setIssueNumber(payload.getIssue().getNumber());
        newMapping.setIssueId(payload.getIssue().getId());
        newMapping.setIssueTitle(payload.getIssue().getTitle());
        newMapping.setIssueUrl(payload.getIssue().getHtmlUrl());
        newMapping.setSyncStatus(TaskGitHubIssue.STATUS_SYNCED);
        newMapping.setLastSyncedAt(LocalDateTime.now());
        newMapping.setGithubUpdatedAt(LocalDateTime.now());

        taskGitHubIssueDao.insert(newMapping);

        // 로그
        logSync(newMapping.getId(), task.getTaskId(), payload.getIssue().getNumber(), teamId,
            GitHubIssueSyncLog.DIRECTION_PULL, GitHubIssueSyncLog.TYPE_CREATE,
            null, null, task.getTitle(), GitHubIssueSyncLog.STATUS_SUCCESS, webhookDeliveryId);

        // WebSocket 알림
        boardNotificationService.notifyTaskCreated(task, teamId);

        log.info("Created Task #{} from GitHub Issue #{}", task.getTaskId(), payload.getIssue().getNumber());
    }

    /**
     * Issue에서 Task 생성
     */
    private Task createTaskFromIssue(GitHubIssuePayload payload, int teamId, int columnId, List<SynodosColumn> columns) {
        GitHubIssuePayload.Issue issue = payload.getIssue();

        // 제목에서 명령어 제거
        String cleanTitle = removePrefixFromTitle(issue.getTitle(), columns);

        Task task = new Task();
        task.setColumnId(columnId);
        task.setTitle(cleanTitle);
        task.setDescription(issue.getBody());
        task.setPosition(taskDao.getMaxPosition(columnId) + 1);

        // Label에서 상태/우선순위 추출
        List<String> labels = issue.getLabels().stream()
            .map(GitHubIssuePayload.Label::getName)
            .collect(Collectors.toList());

        String status = labelService.extractStatusFromLabels(labels);
        task.setWorkflowStatus(status != null ? status : "WAITING");

        String priority = labelService.extractPriorityFromLabels(labels);
        task.setPriority(priority); // null이면 우선순위 미설정

        // Milestone에서 마감일 추출
        if (issue.getMilestone() != null && issue.getMilestone().getDueOn() != null) {
            try {
                task.setDueDate(java.sql.Date.valueOf(issue.getMilestone().getDueOn().substring(0, 10)));
            } catch (Exception e) {
                log.warn("Failed to parse milestone due date: {}", issue.getMilestone().getDueOn());
            }
        }

        taskDao.insert(task);

        // Assignees 매핑
        List<String> githubAssignees = issue.getAssignees().stream()
            .map(GitHubIssuePayload.User::getLogin)
            .collect(Collectors.toList());

        if (!githubAssignees.isEmpty()) {
            List<GitHubUserMapping> mappings = gitHubUserMappingDao.findByGithubUsernames(githubAssignees);
            for (GitHubUserMapping mapping : mappings) {
                TaskAssignee assignee = new TaskAssignee();
                assignee.setTaskId(task.getTaskId());
                assignee.setMemberNo(mapping.getMemberNo());
                // accepted, completed는 기본값 false
                taskAssigneeDao.insert(assignee);
            }
        }

        return task;
    }

    /**
     * Issue 편집 → Task 업데이트
     */
    private void handleIssueEdited(GitHubIssuePayload payload, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping == null) return;

        Task task = taskDao.content(mapping.getTaskId());
        if (task == null) return;

        GitHubIssuePayload.Issue issue = payload.getIssue();
        boolean changed = false;

        // 제목 변경
        if (!Objects.equals(task.getTitle(), issue.getTitle())) {
            String oldTitle = task.getTitle();
            task.setTitle(issue.getTitle());
            changed = true;
            logSync(mapping.getId(), task.getTaskId(), issue.getNumber(), mapping.getTeamId(),
                GitHubIssueSyncLog.DIRECTION_PULL, GitHubIssueSyncLog.TYPE_UPDATE,
                "title", oldTitle, issue.getTitle(), GitHubIssueSyncLog.STATUS_SUCCESS, webhookDeliveryId);
        }

        // 본문 변경
        if (!Objects.equals(task.getDescription(), issue.getBody())) {
            task.setDescription(issue.getBody());
            changed = true;
        }

        if (changed) {
            taskDao.update(task);
            taskGitHubIssueDao.updateGithubTimestamp(mapping.getTeamId(), issue.getNumber());
            taskGitHubIssueDao.updateLastSyncedAt(mapping.getId());

            // WebSocket 알림
            boardNotificationService.notifyTaskUpdated(task, mapping.getTeamId());
        }
    }

    /**
     * Issue 닫힘 → DONE 상태
     */
    private void handleIssueClosed(GitHubIssuePayload payload, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping == null) return;

        Task task = taskDao.content(mapping.getTaskId());
        if (task == null) return;

        if (!"DONE".equals(task.getWorkflowStatus())) {
            String oldStatus = task.getWorkflowStatus();
            task.setWorkflowStatus("DONE");
            taskDao.updateWorkflowStatus(task);

            taskGitHubIssueDao.updateGithubTimestamp(mapping.getTeamId(), payload.getIssue().getNumber());
            taskGitHubIssueDao.updateLastSyncedAt(mapping.getId());

            logSync(mapping.getId(), task.getTaskId(), payload.getIssue().getNumber(), mapping.getTeamId(),
                GitHubIssueSyncLog.DIRECTION_PULL, GitHubIssueSyncLog.TYPE_UPDATE,
                "workflow_status", oldStatus, "DONE", GitHubIssueSyncLog.STATUS_SUCCESS, webhookDeliveryId);

            boardNotificationService.notifyTaskUpdated(task, mapping.getTeamId());
        }
    }

    /**
     * Issue 재오픈 → WAITING 상태
     */
    private void handleIssueReopened(GitHubIssuePayload payload, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping == null) return;

        Task task = taskDao.content(mapping.getTaskId());
        if (task == null) return;

        if ("DONE".equals(task.getWorkflowStatus())) {
            String oldStatus = task.getWorkflowStatus();
            task.setWorkflowStatus("WAITING");
            taskDao.updateWorkflowStatus(task);

            taskGitHubIssueDao.updateGithubTimestamp(mapping.getTeamId(), payload.getIssue().getNumber());
            taskGitHubIssueDao.updateLastSyncedAt(mapping.getId());

            logSync(mapping.getId(), task.getTaskId(), payload.getIssue().getNumber(), mapping.getTeamId(),
                GitHubIssueSyncLog.DIRECTION_PULL, GitHubIssueSyncLog.TYPE_UPDATE,
                "workflow_status", oldStatus, "WAITING", GitHubIssueSyncLog.STATUS_SUCCESS, webhookDeliveryId);

            boardNotificationService.notifyTaskUpdated(task, mapping.getTeamId());
        }
    }

    /**
     * Label 변경 → 상태/우선순위 동기화
     */
    private void handleIssueLabelChanged(GitHubIssuePayload payload, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping == null) return;

        Task task = taskDao.content(mapping.getTaskId());
        if (task == null) return;

        GitHubIssuePayload.Issue issue = payload.getIssue();
        List<String> labels = issue.getLabels().stream()
            .map(GitHubIssuePayload.Label::getName)
            .collect(Collectors.toList());

        boolean changed = false;

        // 상태 Label 확인
        String newStatus = labelService.extractStatusFromLabels(labels);
        if (newStatus != null && !newStatus.equals(task.getWorkflowStatus())) {
            // 충돌 체크 (최신 우선)
            if (shouldApplyGitHubChange(mapping)) {
                String oldStatus = task.getWorkflowStatus();
                task.setWorkflowStatus(newStatus);
                taskDao.updateWorkflowStatus(task);
                changed = true;

                logSync(mapping.getId(), task.getTaskId(), issue.getNumber(), mapping.getTeamId(),
                    GitHubIssueSyncLog.DIRECTION_PULL, GitHubIssueSyncLog.TYPE_UPDATE,
                    "workflow_status", oldStatus, newStatus, GitHubIssueSyncLog.STATUS_SUCCESS, webhookDeliveryId);
            }
        }

        // 우선순위 Label 확인
        String newPriority = labelService.extractPriorityFromLabels(labels);
        if (newPriority != null && !newPriority.equals(task.getPriority())) {
            if (shouldApplyGitHubChange(mapping)) {
                String oldPriority = task.getPriority();
                task.setPriority(newPriority);
                taskDao.update(task);
                changed = true;

                logSync(mapping.getId(), task.getTaskId(), issue.getNumber(), mapping.getTeamId(),
                    GitHubIssueSyncLog.DIRECTION_PULL, GitHubIssueSyncLog.TYPE_UPDATE,
                    "priority", oldPriority, newPriority, GitHubIssueSyncLog.STATUS_SUCCESS, webhookDeliveryId);
            }
        }

        if (changed) {
            taskGitHubIssueDao.updateGithubTimestamp(mapping.getTeamId(), issue.getNumber());
            taskGitHubIssueDao.updateLastSyncedAt(mapping.getId());
            boardNotificationService.notifyTaskUpdated(task, mapping.getTeamId());
        }
    }

    /**
     * Assignee 변경 → 담당자 동기화
     */
    private void handleIssueAssignmentChanged(GitHubIssuePayload payload, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping == null) return;

        GitHubIssuePayload.Issue issue = payload.getIssue();
        List<String> githubAssignees = issue.getAssignees().stream()
            .map(GitHubIssuePayload.User::getLogin)
            .collect(Collectors.toList());

        // GitHub 사용자 → Synodos 멤버 매핑
        List<GitHubUserMapping> mappings = gitHubUserMappingDao.findByGithubUsernames(githubAssignees);
        Set<Integer> newAssigneeNos = mappings.stream()
            .map(GitHubUserMapping::getMemberNo)
            .collect(Collectors.toSet());

        // 기존 담당자 조회
        List<TaskAssignee> currentAssignees = taskAssigneeDao.listByTask(mapping.getTaskId());
        Set<Integer> currentAssigneeNos = currentAssignees.stream()
            .map(TaskAssignee::getMemberNo)
            .collect(Collectors.toSet());

        // 추가된 담당자
        for (Integer memberNo : newAssigneeNos) {
            if (!currentAssigneeNos.contains(memberNo)) {
                TaskAssignee assignee = new TaskAssignee();
                assignee.setTaskId(mapping.getTaskId());
                assignee.setMemberNo(memberNo);
                // accepted, completed는 기본값 false
                taskAssigneeDao.insert(assignee);
            }
        }

        // 제거된 담당자
        for (TaskAssignee assignee : currentAssignees) {
            if (!newAssigneeNos.contains(assignee.getMemberNo())) {
                taskAssigneeDao.delete(assignee.getTaskId(), assignee.getMemberNo());
            }
        }

        taskGitHubIssueDao.updateGithubTimestamp(mapping.getTeamId(), issue.getNumber());
        taskGitHubIssueDao.updateLastSyncedAt(mapping.getId());

        Task task = taskDao.content(mapping.getTaskId());
        if (task != null) {
            boardNotificationService.notifyTaskUpdated(task, mapping.getTeamId());
        }
    }

    /**
     * Milestone 변경 → 마감일 동기화
     */
    private void handleIssueMilestoneChanged(GitHubIssuePayload payload, TaskGitHubIssue mapping, String webhookDeliveryId) {
        if (mapping == null) return;

        Task task = taskDao.content(mapping.getTaskId());
        if (task == null) return;

        GitHubIssuePayload.Milestone milestone = payload.getIssue().getMilestone();
        java.sql.Date newDueDate = null;

        if (milestone != null && milestone.getDueOn() != null) {
            try {
                newDueDate = java.sql.Date.valueOf(milestone.getDueOn().substring(0, 10));
            } catch (Exception e) {
                log.warn("Failed to parse milestone due date: {}", milestone.getDueOn());
            }
        }

        if (!Objects.equals(task.getDueDate(), newDueDate)) {
            task.setDueDate(newDueDate);
            taskDao.updateDates(task);

            taskGitHubIssueDao.updateGithubTimestamp(mapping.getTeamId(), payload.getIssue().getNumber());
            taskGitHubIssueDao.updateLastSyncedAt(mapping.getId());

            boardNotificationService.notifyTaskUpdated(task, mapping.getTeamId());
        }
    }

    // ==================== Helper Methods ====================

    /**
     * GitHub 변경을 적용할지 확인 (최신 우선 정책)
     */
    private boolean shouldApplyGitHubChange(TaskGitHubIssue mapping) {
        if (mapping.getSynodosUpdatedAt() == null) {
            return true;
        }
        // GitHub이 더 최근이면 적용
        return mapping.getGithubUpdatedAt() == null ||
               mapping.getGithubUpdatedAt().isAfter(mapping.getSynodosUpdatedAt()) ||
               mapping.getGithubUpdatedAt().equals(mapping.getSynodosUpdatedAt());
    }

    /**
     * Task에서 Issue 본문 생성
     */
    private String buildIssueBody(Task task) {
        StringBuilder sb = new StringBuilder();
        if (task.getDescription() != null && !task.getDescription().isEmpty()) {
            sb.append(task.getDescription());
        }
        sb.append("\n\n---\n");
        sb.append("*Synced from Synodos Task #").append(task.getTaskId()).append("*");
        return sb.toString();
    }

    /**
     * Synodos 멤버 → GitHub 사용자명 변환
     */
    private List<String> mapMembersToGitHubUsers(List<Integer> memberNos) {
        List<String> githubUsers = new ArrayList<>();
        for (Integer memberNo : memberNos) {
            Member member = memberDao.findByNo(memberNo);
            if (member != null && member.getGithubUsername() != null) {
                githubUsers.add(member.getGithubUsername());
            }
        }
        return githubUsers;
    }

    /**
     * GitHub 사용자명 → Synodos 멤버 변환
     */
    private List<Member> mapGitHubUsersToMembers(List<String> githubUsernames) {
        List<Member> members = new ArrayList<>();
        for (String username : githubUsernames) {
            Member member = memberDao.findByGithubUsername(username);
            if (member != null) {
                members.add(member);
            }
        }
        return members;
    }

    /**
     * 동기화 로그 기록
     */
    private void logSync(Integer mappingId, Integer taskId, Integer issueNumber, Integer teamId,
                         String direction, String type, String field, String oldValue, String newValue,
                         String status, String webhookDeliveryId) {
        GitHubIssueSyncLog log = new GitHubIssueSyncLog();
        log.setTaskGitHubIssueId(mappingId);
        log.setTaskId(taskId);
        log.setIssueNumber(issueNumber);
        log.setTeamId(teamId);
        log.setSyncDirection(direction);
        log.setSyncType(type);
        log.setFieldChanged(field);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setSyncStatus(status);
        log.setTriggeredBy(webhookDeliveryId != null ? GitHubIssueSyncLog.TRIGGER_WEBHOOK : GitHubIssueSyncLog.TRIGGER_MANUAL);
        log.setWebhookDeliveryId(webhookDeliveryId);
        syncLogDao.insert(log);
    }

    // ==================== Link Management ====================

    /**
     * 기존 Task와 Issue 연결
     */
    @Transactional
    public TaskGitHubIssue linkTaskToIssue(int taskId, int issueNumber, int teamId, int memberNo) {
        // 멤버의 GitHub 토큰 확인
        Member member = memberDao.findByNo(memberNo);
        if (member == null || member.getGithubAccessToken() == null) {
            throw new RuntimeException("GitHub 계정이 연결되지 않았습니다.");
        }

        // 중복 체크
        if (taskGitHubIssueDao.countByTaskId(taskId) > 0) {
            throw new RuntimeException("이미 다른 Issue가 연결되어 있습니다.");
        }
        if (taskGitHubIssueDao.countByTeamAndIssue(teamId, issueNumber) > 0) {
            throw new RuntimeException("이 Issue는 이미 다른 Task에 연결되어 있습니다.");
        }

        Team team = teamDao.findById(teamId);
        GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());

        // Issue 조회
        GitHubIssueService.GitHubIssue issue = gitHubIssueService.getIssue(
            repoInfo.owner, repoInfo.repo, member.getGithubAccessToken(), issueNumber
        );
        if (issue == null) {
            throw new RuntimeException("GitHub Issue를 찾을 수 없습니다: #" + issueNumber);
        }

        TaskGitHubIssue mapping = new TaskGitHubIssue();
        mapping.setTaskId(taskId);
        mapping.setTeamId(teamId);
        mapping.setIssueNumber(issueNumber);
        mapping.setIssueId(issue.getId());
        mapping.setIssueTitle(issue.getTitle());
        mapping.setIssueUrl(issue.getHtmlUrl());
        mapping.setSyncStatus(TaskGitHubIssue.STATUS_SYNCED);
        mapping.setLastSyncedAt(LocalDateTime.now());

        taskGitHubIssueDao.insert(mapping);

        logSync(mapping.getId(), taskId, issueNumber, teamId,
            GitHubIssueSyncLog.DIRECTION_PUSH, GitHubIssueSyncLog.TYPE_LINK,
            null, null, null, GitHubIssueSyncLog.STATUS_SUCCESS, null);

        return taskGitHubIssueDao.findById(mapping.getId());
    }

    /**
     * Task-Issue 연결 해제
     */
    @Transactional
    public void unlinkTask(int taskId) {
        TaskGitHubIssue mapping = taskGitHubIssueDao.findByTaskId(taskId);
        if (mapping == null) {
            throw new RuntimeException("연결된 Issue가 없습니다.");
        }

        logSync(mapping.getId(), taskId, mapping.getIssueNumber(), mapping.getTeamId(),
            GitHubIssueSyncLog.DIRECTION_PUSH, GitHubIssueSyncLog.TYPE_UNLINK,
            null, null, null, GitHubIssueSyncLog.STATUS_SUCCESS, null);

        taskGitHubIssueDao.deleteByTaskId(taskId);
    }

    /**
     * 동기화 상태 조회
     */
    public TaskGitHubIssue getSyncStatus(int taskId) {
        return taskGitHubIssueDao.findByTaskId(taskId);
    }

    /**
     * 팀의 충돌 목록 조회
     */
    public List<TaskGitHubIssue> getConflicts(int teamId) {
        return taskGitHubIssueDao.listConflicts(teamId);
    }

    /**
     * 팀의 GitHub Issues 목록 조회
     */
    public List<GitHubIssueService.GitHubIssue> listGitHubIssues(int teamId, int memberNo, String state) {
        // 멤버의 GitHub 토큰 확인
        Member member = memberDao.findByNo(memberNo);
        if (member == null || member.getGithubAccessToken() == null) {
            throw new RuntimeException("GitHub 계정이 연결되지 않았습니다.");
        }

        Team team = teamDao.findById(teamId);
        if (team == null || team.getGithubRepoUrl() == null) {
            throw new RuntimeException("팀 또는 GitHub 저장소 설정을 찾을 수 없습니다.");
        }

        GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());
        if (repoInfo == null) {
            throw new RuntimeException("잘못된 GitHub 저장소 URL입니다.");
        }

        return gitHubIssueService.listIssues(
            repoInfo.owner, repoInfo.repo, member.getGithubAccessToken(), state, 1
        );
    }

    // ==================== Bulk Sync ====================

    /**
     * 결과 DTO
     */
    public static class BulkSyncResult {
        private int successCount;
        private int skipCount;
        private int failCount;
        private List<String> errors = new ArrayList<>();

        public int getSuccessCount() { return successCount; }
        public void setSuccessCount(int successCount) { this.successCount = successCount; }
        public int getSkipCount() { return skipCount; }
        public void setSkipCount(int skipCount) { this.skipCount = skipCount; }
        public int getFailCount() { return failCount; }
        public void setFailCount(int failCount) { this.failCount = failCount; }
        public List<String> getErrors() { return errors; }
        public void setErrors(List<String> errors) { this.errors = errors; }
        public void addError(String error) { this.errors.add(error); }
    }

    /**
     * 제목에서 명령어(prefix)를 찾아 해당하는 컬럼 ID 반환
     * 예: "[버그] 로그인 오류" → github_prefix가 "[버그]"인 컬럼 ID 반환
     */
    private Integer findColumnByTitlePrefix(String title, List<SynodosColumn> columns) {
        if (title == null || columns == null || columns.isEmpty()) {
            return null;
        }

        String trimmedTitle = title.trim();

        // 각 컬럼의 github_prefix 확인 (대소문자 구분 없이)
        for (SynodosColumn column : columns) {
            String prefix = column.getGithubPrefix();
            if (prefix == null || prefix.trim().isEmpty()) continue;
            prefix = prefix.trim();

            // 제목이 해당 prefix로 시작하는지 확인 (대소문자 무시)
            if (trimmedTitle.toLowerCase().startsWith(prefix.toLowerCase())) {
                log.debug("Title '{}' matched prefix '{}' -> column {}", title, prefix, column.getColumnId());
                return column.getColumnId();
            }
        }

        return null;
    }

    /**
     * 제목에서 명령어를 제거한 실제 제목 반환
     * 예: "[버그] 로그인 오류" → "로그인 오류"
     */
    private String removePrefixFromTitle(String title, List<SynodosColumn> columns) {
        if (title == null || columns == null || columns.isEmpty()) {
            return title;
        }

        String trimmedTitle = title.trim();

        for (SynodosColumn column : columns) {
            String prefix = column.getGithubPrefix();
            if (prefix == null || prefix.trim().isEmpty()) continue;
            String trimmedPrefix = prefix.trim();

            if (trimmedTitle.toLowerCase().startsWith(trimmedPrefix.toLowerCase())) {
                // prefix 제거 후 앞뒤 공백 제거
                String result = trimmedTitle.substring(trimmedPrefix.length()).trim();
                return result.isEmpty() ? title : result;
            }
        }

        return title;
    }

    /**
     * GitHub의 모든 Issues를 Synodos Tasks로 가져오기
     * (이미 연결된 Issue는 건너뜀)
     */
    @Transactional
    public BulkSyncResult importAllIssues(int teamId, int memberNo) {
        BulkSyncResult result = new BulkSyncResult();

        // 멤버 및 팀 검증
        Member member = memberDao.findByNo(memberNo);
        if (member == null || member.getGithubAccessToken() == null) {
            result.addError("GitHub 계정이 연결되지 않았습니다.");
            return result;
        }

        Team team = teamDao.findById(teamId);
        if (team == null || team.getGithubRepoUrl() == null) {
            result.addError("팀 또는 GitHub 저장소 설정을 찾을 수 없습니다.");
            return result;
        }

        GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());
        if (repoInfo == null) {
            result.addError("잘못된 GitHub 저장소 URL입니다.");
            return result;
        }

        // 팀의 컬럼 목록 로드 (github_prefix 포함)
        List<SynodosColumn> columns = columnDao.listByTeam(teamId);
        if (columns.isEmpty()) {
            result.addError("팀에 컬럼이 없습니다. 먼저 컬럼을 생성해주세요.");
            return result;
        }
        log.info("Columns for team {}: {}", teamId, columns.stream()
            .map(c -> c.getTitle() + "=" + c.getGithubPrefix())
            .collect(Collectors.joining(", ")));

        // 기본 컬럼 확인
        Integer defaultColumnId = team.getGithubDefaultColumnId();
        if (defaultColumnId == null) {
            defaultColumnId = columns.get(0).getColumnId();
        }

        String token = member.getGithubAccessToken();

        // 모든 open issues 가져오기 (여러 페이지)
        List<GitHubIssueService.GitHubIssue> allIssues = new ArrayList<>();
        int page = 1;
        while (true) {
            List<GitHubIssueService.GitHubIssue> issues =
                gitHubIssueService.listIssues(repoInfo.owner, repoInfo.repo, token, "all", page);
            if (issues.isEmpty()) break;
            allIssues.addAll(issues);
            if (issues.size() < 30) break; // GitHub API default per_page
            page++;
            if (page > 10) break; // 최대 300개 제한
        }

        log.info("Found {} GitHub issues for team {}", allIssues.size(), teamId);

        for (GitHubIssueService.GitHubIssue issue : allIssues) {
            try {
                // 이미 연결된 Issue인지 확인
                if (taskGitHubIssueDao.countByTeamAndIssue(teamId, issue.getNumber()) > 0) {
                    result.setSkipCount(result.getSkipCount() + 1);
                    continue;
                }

                // 제목에서 명령어로 컬럼 결정
                Integer targetColumnId = findColumnByTitlePrefix(issue.getTitle(), columns);
                if (targetColumnId == null) {
                    targetColumnId = defaultColumnId;
                }

                // 제목에서 명령어 제거 (선택적)
                String cleanTitle = removePrefixFromTitle(issue.getTitle(), columns);

                // Task 생성
                Task task = new Task();
                task.setColumnId(targetColumnId);
                task.setTitle(cleanTitle);
                task.setDescription(issue.getBody());
                task.setPosition(taskDao.getMaxPosition(targetColumnId) + 1);
                task.setWorkflowStatus("closed".equals(issue.getState()) ? "DONE" : "WAITING");
                // Label에서 우선순위 추출 (없으면 null)
                String priority = labelService.extractPriorityFromLabels(issue.getLabels());
                task.setPriority(priority);

                taskDao.insert(task);

                // 매핑 생성
                TaskGitHubIssue mapping = new TaskGitHubIssue();
                mapping.setTaskId(task.getTaskId());
                mapping.setTeamId(teamId);
                mapping.setIssueNumber(issue.getNumber());
                mapping.setIssueId(issue.getId());
                mapping.setIssueTitle(issue.getTitle());
                mapping.setIssueUrl(issue.getHtmlUrl());
                mapping.setSyncStatus(TaskGitHubIssue.STATUS_SYNCED);
                mapping.setLastSyncedAt(LocalDateTime.now());
                mapping.setGithubUpdatedAt(LocalDateTime.now());

                taskGitHubIssueDao.insert(mapping);

                // WebSocket 알림
                boardNotificationService.notifyTaskCreated(task, teamId);

                result.setSuccessCount(result.getSuccessCount() + 1);
                log.info("Imported GitHub Issue #{} as Task #{}", issue.getNumber(), task.getTaskId());

            } catch (Exception e) {
                result.setFailCount(result.getFailCount() + 1);
                result.addError("Issue #" + issue.getNumber() + ": " + e.getMessage());
                log.error("Failed to import issue #{}: {}", issue.getNumber(), e.getMessage());
            }
        }

        return result;
    }

    /**
     * Synodos의 모든 Tasks를 GitHub Issues로 내보내기
     * (이미 연결된 Task는 건너뜀)
     */
    @Transactional
    public BulkSyncResult exportAllTasks(int teamId, int memberNo) {
        BulkSyncResult result = new BulkSyncResult();

        // 멤버 및 팀 검증
        Member member = memberDao.findByNo(memberNo);
        if (member == null || member.getGithubAccessToken() == null) {
            result.addError("GitHub 계정이 연결되지 않았습니다.");
            return result;
        }

        Team team = teamDao.findById(teamId);
        if (team == null || team.getGithubRepoUrl() == null) {
            result.addError("팀 또는 GitHub 저장소 설정을 찾을 수 없습니다.");
            return result;
        }

        GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());
        if (repoInfo == null) {
            result.addError("잘못된 GitHub 저장소 URL입니다.");
            return result;
        }

        String token = member.getGithubAccessToken();

        // Label 자동 생성 확인
        labelService.ensureAllLabels(repoInfo.owner, repoInfo.repo, token);

        // 팀의 모든 태스크 조회
        List<Task> tasks = taskDao.listByTeam(teamId);
        log.info("Found {} tasks for team {}", tasks.size(), teamId);

        for (Task task : tasks) {
            try {
                // 이미 연결된 Task인지 확인
                if (taskGitHubIssueDao.countByTaskId(task.getTaskId()) > 0) {
                    result.setSkipCount(result.getSkipCount() + 1);
                    continue;
                }

                // Issue 생성 요청 구성
                GitHubIssueService.CreateIssueRequest request = new GitHubIssueService.CreateIssueRequest();
                request.setTitle(task.getTitle());
                request.setBody(buildIssueBody(task));
                request.setLabels(labelService.buildLabelsFromTask(task.getWorkflowStatus(), task.getPriority()));

                // Assignees 매핑
                List<TaskAssignee> assignees = taskAssigneeDao.listByTask(task.getTaskId());
                if (!assignees.isEmpty()) {
                    List<String> githubAssignees = mapMembersToGitHubUsers(
                        assignees.stream().map(TaskAssignee::getMemberNo).collect(Collectors.toList())
                    );
                    if (!githubAssignees.isEmpty()) {
                        request.setAssignees(githubAssignees);
                    }
                }

                // GitHub Issue 생성
                GitHubIssueService.GitHubIssue issue = gitHubIssueService.createIssue(
                    repoInfo.owner, repoInfo.repo, token, request
                );

                // DONE 상태면 Issue 닫기
                if ("DONE".equals(task.getWorkflowStatus())) {
                    GitHubIssueService.UpdateIssueRequest closeRequest = new GitHubIssueService.UpdateIssueRequest();
                    closeRequest.setState("closed");
                    gitHubIssueService.updateIssue(repoInfo.owner, repoInfo.repo, token, issue.getNumber(), closeRequest);
                }

                // 매핑 저장
                TaskGitHubIssue mapping = new TaskGitHubIssue();
                mapping.setTaskId(task.getTaskId());
                mapping.setTeamId(teamId);
                mapping.setIssueNumber(issue.getNumber());
                mapping.setIssueId(issue.getId());
                mapping.setIssueTitle(issue.getTitle());
                mapping.setIssueUrl(issue.getHtmlUrl());
                mapping.setSyncStatus(TaskGitHubIssue.STATUS_SYNCED);
                mapping.setLastSyncedAt(LocalDateTime.now());
                mapping.setSynodosUpdatedAt(LocalDateTime.now());
                mapping.setGithubUpdatedAt(LocalDateTime.now());

                taskGitHubIssueDao.insert(mapping);

                result.setSuccessCount(result.getSuccessCount() + 1);
                log.info("Exported Task #{} as GitHub Issue #{}", task.getTaskId(), issue.getNumber());

            } catch (Exception e) {
                result.setFailCount(result.getFailCount() + 1);
                result.addError("Task #" + task.getTaskId() + ": " + e.getMessage());
                log.error("Failed to export task #{}: {}", task.getTaskId(), e.getMessage());
            }
        }

        return result;
    }

    /**
     * 연결되지 않은 Issue/Task 개수 조회
     */
    public Map<String, Integer> getUnlinkedCounts(int teamId, int memberNo) {
        Map<String, Integer> counts = new HashMap<>();

        try {
            // 연결되지 않은 Tasks 수
            List<Task> allTasks = taskDao.listByTeam(teamId);
            int unlinkedTasks = 0;
            for (Task task : allTasks) {
                if (taskGitHubIssueDao.countByTaskId(task.getTaskId()) == 0) {
                    unlinkedTasks++;
                }
            }
            counts.put("unlinkedTasks", unlinkedTasks);

            // 연결되지 않은 Issues 수
            Member member = memberDao.findByNo(memberNo);
            Team team = teamDao.findById(teamId);
            if (member != null && member.getGithubAccessToken() != null &&
                team != null && team.getGithubRepoUrl() != null) {

                GitHubService.RepoInfo repoInfo = gitHubService.parseRepoUrl(team.getGithubRepoUrl());
                if (repoInfo != null) {
                    List<GitHubIssueService.GitHubIssue> issues =
                        gitHubIssueService.listIssues(repoInfo.owner, repoInfo.repo,
                            member.getGithubAccessToken(), "all", 1);

                    int unlinkedIssues = 0;
                    for (GitHubIssueService.GitHubIssue issue : issues) {
                        if (taskGitHubIssueDao.countByTeamAndIssue(teamId, issue.getNumber()) == 0) {
                            unlinkedIssues++;
                        }
                    }
                    counts.put("unlinkedIssues", unlinkedIssues);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get unlinked counts: {}", e.getMessage());
        }

        counts.putIfAbsent("unlinkedTasks", 0);
        counts.putIfAbsent("unlinkedIssues", 0);
        return counts;
    }
}
