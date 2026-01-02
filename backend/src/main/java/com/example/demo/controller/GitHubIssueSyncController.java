package com.example.demo.controller;

import com.example.demo.dao.GitHubUserMappingDao;
import com.example.demo.dao.TaskGitHubIssueDao;
import com.example.demo.model.GitHubUserMapping;
import com.example.demo.model.TaskGitHubIssue;
import com.example.demo.service.GitHubIssueSyncService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GitHub Issue 동기화 REST 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/github/issue")
public class GitHubIssueSyncController {

    @Autowired
    private GitHubIssueSyncService syncService;

    @Autowired
    private TaskGitHubIssueDao taskGitHubIssueDao;

    @Autowired
    private GitHubUserMappingDao userMappingDao;

    // ==================== Issue Link Management ====================

    /**
     * Task-Issue 연결
     * POST /api/github/issue/link
     */
    @PostMapping("/link")
    public ResponseEntity<?> linkTaskToIssue(@RequestBody LinkRequest request) {
        log.info("Linking task {} to issue #{} in team {} by member {}",
            request.getTaskId(), request.getIssueNumber(), request.getTeamId(), request.getMemberNo());
        try {
            TaskGitHubIssue mapping = syncService.linkTaskToIssue(
                request.getTaskId(), request.getIssueNumber(), request.getTeamId(), request.getMemberNo()
            );
            return ResponseEntity.ok(mapping);
        } catch (Exception e) {
            log.error("Failed to link task to issue: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Task-Issue 연결 해제
     * DELETE /api/github/issue/link/{taskId}
     */
    @DeleteMapping("/link/{taskId}")
    public ResponseEntity<?> unlinkTask(@PathVariable int taskId) {
        log.info("Unlinking task {}", taskId);
        try {
            syncService.unlinkTask(taskId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to unlink task: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 동기화 상태 조회
     * GET /api/github/issue/status/{taskId}
     */
    @GetMapping("/status/{taskId}")
    public ResponseEntity<?> getSyncStatus(@PathVariable int taskId) {
        TaskGitHubIssue mapping = syncService.getSyncStatus(taskId);
        if (mapping == null) {
            return ResponseEntity.ok(Map.of("linked", false));
        }
        return ResponseEntity.ok(mapping);
    }

    // ==================== Create Operations ====================

    /**
     * Task에서 GitHub Issue 생성
     * POST /api/github/issue/create-from-task/{taskId}
     */
    @PostMapping("/create-from-task/{taskId}")
    public ResponseEntity<?> createIssueFromTask(
            @PathVariable int taskId,
            @RequestParam int teamId,
            @RequestParam int memberNo) {
        log.info("Creating GitHub issue from task {} in team {} by member {}", taskId, teamId, memberNo);
        try {
            TaskGitHubIssue mapping = syncService.createIssueFromTask(taskId, teamId, memberNo);
            return ResponseEntity.ok(mapping);
        } catch (Exception e) {
            log.error("Failed to create issue from task: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== Sync Operations ====================

    /**
     * Task를 GitHub에 동기화 (Push)
     * POST /api/github/issue/sync/push/{taskId}
     */
    @PostMapping("/sync/push/{taskId}")
    public ResponseEntity<?> syncToGitHub(
            @PathVariable int taskId,
            @RequestParam int memberNo) {
        log.info("Syncing task {} to GitHub by member {}", taskId, memberNo);
        try {
            syncService.syncTaskToGitHub(taskId, memberNo);
            TaskGitHubIssue mapping = syncService.getSyncStatus(taskId);
            return ResponseEntity.ok(Map.of("success", true, "mapping", mapping));
        } catch (Exception e) {
            log.error("Failed to sync to GitHub: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== Conflict Management ====================

    /**
     * 팀의 충돌 목록 조회
     * GET /api/github/issue/conflicts/{teamId}
     */
    @GetMapping("/conflicts/{teamId}")
    public ResponseEntity<?> getConflicts(@PathVariable int teamId) {
        List<TaskGitHubIssue> conflicts = syncService.getConflicts(teamId);
        return ResponseEntity.ok(conflicts);
    }

    /**
     * 충돌 해결
     * POST /api/github/issue/conflicts/{mappingId}/resolve
     */
    @PostMapping("/conflicts/{mappingId}/resolve")
    public ResponseEntity<?> resolveConflict(
            @PathVariable int mappingId,
            @RequestParam String resolution,
            @RequestParam int memberNo) {
        log.info("Resolving conflict {} with resolution: {} by member {}", mappingId, resolution, memberNo);
        try {
            // resolution: KEEP_SYNODOS, KEEP_GITHUB
            TaskGitHubIssue mapping = taskGitHubIssueDao.findById(mappingId);
            if (mapping == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mapping not found"));
            }

            if ("KEEP_SYNODOS".equals(resolution)) {
                syncService.syncTaskToGitHub(mapping.getTaskId(), memberNo);
            }
            // KEEP_GITHUB는 이미 적용되어 있음 (webhook에서 처리됨)

            // 충돌 상태 해제
            taskGitHubIssueDao.updateSyncStatus(mappingId, TaskGitHubIssue.STATUS_SYNCED);
            taskGitHubIssueDao.updateLastSyncedAt(mappingId);

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to resolve conflict: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== User Mapping ====================

    /**
     * GitHub 사용자 매핑 설정
     * PUT /api/github/issue/user/mapping
     */
    @PutMapping("/user/mapping")
    public ResponseEntity<?> setUserMapping(@RequestBody UserMappingRequest request) {
        log.info("Setting GitHub mapping for member {} -> {}", request.getMemberNo(), request.getGithubUsername());
        try {
            GitHubUserMapping existing = userMappingDao.findByMemberNo(request.getMemberNo());

            if (existing != null) {
                existing.setGithubUsername(request.getGithubUsername());
                userMappingDao.update(existing);
                return ResponseEntity.ok(userMappingDao.findByMemberNo(request.getMemberNo()));
            } else {
                GitHubUserMapping mapping = new GitHubUserMapping();
                mapping.setMemberNo(request.getMemberNo());
                mapping.setGithubUsername(request.getGithubUsername());
                userMappingDao.insert(mapping);
                return ResponseEntity.ok(userMappingDao.findByMemberNo(request.getMemberNo()));
            }
        } catch (Exception e) {
            log.error("Failed to set user mapping: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 사용자 매핑 조회
     * GET /api/github/issue/user/mapping/{memberNo}
     */
    @GetMapping("/user/mapping/{memberNo}")
    public ResponseEntity<?> getUserMapping(@PathVariable int memberNo) {
        GitHubUserMapping mapping = userMappingDao.findByMemberNo(memberNo);
        if (mapping == null) {
            return ResponseEntity.ok(Map.of("mapped", false));
        }
        return ResponseEntity.ok(mapping);
    }

    /**
     * 팀의 사용자 매핑 목록 조회
     * GET /api/github/issue/user/mappings/team/{teamId}
     */
    @GetMapping("/user/mappings/team/{teamId}")
    public ResponseEntity<?> getTeamUserMappings(@PathVariable int teamId) {
        List<GitHubUserMapping> mappings = userMappingDao.listByTeam(teamId);
        return ResponseEntity.ok(mappings);
    }

    /**
     * 사용자 매핑 삭제
     * DELETE /api/github/issue/user/mapping/{memberNo}
     */
    @DeleteMapping("/user/mapping/{memberNo}")
    public ResponseEntity<?> deleteUserMapping(@PathVariable int memberNo) {
        userMappingDao.deleteByMemberNo(memberNo);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ==================== Team Issue List ====================

    /**
     * 팀의 연결된 Issue 목록 조회
     * GET /api/github/issue/team/{teamId}
     */
    @GetMapping("/team/{teamId}")
    public ResponseEntity<?> getTeamIssueMappings(@PathVariable int teamId) {
        List<TaskGitHubIssue> mappings = taskGitHubIssueDao.listByTeam(teamId);
        return ResponseEntity.ok(mappings);
    }

    /**
     * 팀의 GitHub Issues 목록 조회 (연결 가능한 Issue 목록)
     * GET /api/github/issue/team/{teamId}/issues
     */
    @GetMapping("/team/{teamId}/issues")
    public ResponseEntity<?> listGitHubIssues(
            @PathVariable int teamId,
            @RequestParam int memberNo,
            @RequestParam(defaultValue = "open") String state) {
        try {
            var issues = syncService.listGitHubIssues(teamId, memberNo, state);
            return ResponseEntity.ok(issues);
        } catch (Exception e) {
            log.error("Failed to list GitHub issues: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== Bulk Sync ====================

    /**
     * GitHub Issues 일괄 가져오기
     * POST /api/github/issue/bulk/import/{teamId}
     */
    @PostMapping("/bulk/import/{teamId}")
    public ResponseEntity<?> importAllIssues(
            @PathVariable int teamId,
            @RequestParam int memberNo) {
        log.info("Bulk importing GitHub issues for team {} by member {}", teamId, memberNo);
        try {
            GitHubIssueSyncService.BulkSyncResult result = syncService.importAllIssues(teamId, memberNo);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "imported", result.getSuccessCount(),
                "skipped", result.getSkipCount(),
                "failed", result.getFailCount(),
                "errors", result.getErrors()
            ));
        } catch (Exception e) {
            log.error("Failed to bulk import issues: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Tasks 일괄 내보내기
     * POST /api/github/issue/bulk/export/{teamId}
     */
    @PostMapping("/bulk/export/{teamId}")
    public ResponseEntity<?> exportAllTasks(
            @PathVariable int teamId,
            @RequestParam int memberNo) {
        log.info("Bulk exporting tasks to GitHub for team {} by member {}", teamId, memberNo);
        try {
            GitHubIssueSyncService.BulkSyncResult result = syncService.exportAllTasks(teamId, memberNo);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "exported", result.getSuccessCount(),
                "skipped", result.getSkipCount(),
                "failed", result.getFailCount(),
                "errors", result.getErrors()
            ));
        } catch (Exception e) {
            log.error("Failed to bulk export tasks: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 연결되지 않은 Issue/Task 개수 조회
     * GET /api/github/issue/bulk/counts/{teamId}
     */
    @GetMapping("/bulk/counts/{teamId}")
    public ResponseEntity<?> getUnlinkedCounts(
            @PathVariable int teamId,
            @RequestParam int memberNo) {
        try {
            var counts = syncService.getUnlinkedCounts(teamId, memberNo);
            return ResponseEntity.ok(counts);
        } catch (Exception e) {
            log.error("Failed to get unlinked counts: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== DTOs ====================

    @Data
    public static class LinkRequest {
        private int taskId;
        private int issueNumber;
        private int teamId;
        private int memberNo;
    }

    @Data
    public static class UserMappingRequest {
        private int memberNo;
        private String githubUsername;
    }
}
