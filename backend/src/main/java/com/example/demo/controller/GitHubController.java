package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Team;
import com.example.demo.model.TaskCommit;
import com.example.demo.service.GitHubService;
import com.example.demo.service.GitHubService.GitHubBranch;
import com.example.demo.service.GitHubService.GitHubCommit;
import com.example.demo.service.GitHubService.RepoInfo;
import com.example.demo.service.TaskCommitService;
import com.example.demo.service.TeamService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/github")
public class GitHubController {

    @Autowired
    private GitHubService gitHubService;

    @Autowired
    private TeamService teamService;

    @Autowired
    private TaskCommitService taskCommitService;

    /**
     * 팀 저장소의 브랜치 목록을 조회합니다.
     * GET /api/github/branches/{teamId}
     */
    @GetMapping("/branches/{teamId}")
    public ResponseEntity<?> getBranches(@PathVariable int teamId) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            List<GitHubBranch> branches = gitHubService.listBranches(repoInfo.owner, repoInfo.repo);
            return ResponseEntity.ok(branches);

        } catch (Exception e) {
            log.error("Failed to get branches: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * 팀 저장소의 커밋 목록을 조회합니다.
     * GET /api/github/commits/{teamId}?branch=main&page=1
     */
    @GetMapping("/commits/{teamId}")
    public ResponseEntity<?> getCommits(
            @PathVariable int teamId,
            @RequestParam(defaultValue = "main") String branch,
            @RequestParam(defaultValue = "1") int page) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            List<GitHubCommit> commits = gitHubService.listCommits(repoInfo.owner, repoInfo.repo, branch, page);
            return ResponseEntity.ok(commits);

        } catch (Exception e) {
            log.error("Failed to get commits: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * 태스크에 커밋을 연결합니다.
     * POST /api/github/task/{taskId}/commit
     */
    @PostMapping("/task/{taskId}/commit")
    public ResponseEntity<?> linkCommit(
            @PathVariable int taskId,
            @RequestBody Map<String, Object> request) {
        try {
            String commitSha = (String) request.get("commitSha");
            String commitMessage = (String) request.get("commitMessage");
            String commitAuthor = (String) request.get("commitAuthor");
            String commitDate = (String) request.get("commitDate");
            String githubUrl = (String) request.get("githubUrl");
            Integer linkedBy = (Integer) request.get("linkedBy");

            if (commitSha == null || commitSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("커밋 SHA가 필요합니다.");
            }
            if (linkedBy == null) {
                return ResponseEntity.badRequest().body("사용자 정보가 필요합니다.");
            }

            TaskCommit taskCommit = taskCommitService.linkCommit(
                taskId, commitSha.trim(), commitMessage, commitAuthor, commitDate, githubUrl, linkedBy
            );

            return ResponseEntity.ok(taskCommit);

        } catch (RuntimeException e) {
            log.error("Failed to link commit: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 태스크에서 커밋 연결을 해제합니다.
     * DELETE /api/github/task/{taskId}/commit/{commitId}
     */
    @DeleteMapping("/task/{taskId}/commit/{commitId}")
    public ResponseEntity<?> unlinkCommit(
            @PathVariable int taskId,
            @PathVariable int commitId) {
        try {
            TaskCommit existing = taskCommitService.findById(commitId);
            if (existing == null) {
                return ResponseEntity.badRequest().body("커밋 연결을 찾을 수 없습니다.");
            }
            if (existing.getTaskId() != taskId) {
                return ResponseEntity.badRequest().body("해당 태스크의 커밋이 아닙니다.");
            }

            taskCommitService.unlinkCommit(commitId);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "커밋 연결이 해제되었습니다.");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to unlink commit: {}", e.getMessage());
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    /**
     * 태스크에 연결된 커밋 목록을 조회합니다.
     * GET /api/github/task/{taskId}/commits
     */
    @GetMapping("/task/{taskId}/commits")
    public ResponseEntity<?> getTaskCommits(@PathVariable int taskId) {
        try {
            List<TaskCommit> commits = taskCommitService.listByTask(taskId);
            return ResponseEntity.ok(commits);
        } catch (Exception e) {
            log.error("Failed to get task commits: {}", e.getMessage());
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
