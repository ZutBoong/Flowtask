package com.example.demo.service;

import com.example.demo.dao.*;
import com.example.demo.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Synodos 댓글 → GitHub Issue 댓글 동기화 서비스
 */
@Slf4j
@Service
public class GitHubCommentSyncService {

    @Autowired
    private TaskGitHubIssueDao taskGitHubIssueDao;

    @Autowired
    private TeamDao teamDao;

    @Autowired
    private MemberDao memberDao;

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private SynodosColumnDao columnDao;

    @Autowired
    private CommentDao commentDao;

    @Autowired
    private GitHubIssueService gitHubIssueService;

    /**
     * Synodos 댓글을 GitHub Issue에 동기화
     */
    public void syncCommentToGitHub(Comment comment) {
        if (comment == null) return;

        // Task 조회
        Task task = taskDao.content(comment.getTaskId());
        if (task == null) {
            log.debug("Task not found for comment #{}", comment.getCommentId());
            return;
        }

        // Column에서 TeamId 조회
        SynodosColumn column = columnDao.content(task.getColumnId());
        if (column == null) {
            log.debug("Column not found for task #{}", task.getTaskId());
            return;
        }

        int teamId = column.getTeamId();

        // Task-Issue 매핑 조회
        TaskGitHubIssue mapping = taskGitHubIssueDao.findByTaskId(comment.getTaskId());
        if (mapping == null) {
            log.debug("No GitHub issue linked to task #{}", comment.getTaskId());
            return;
        }

        // 팀 정보 조회 (GitHub 토큰용)
        Team team = teamDao.findById(teamId);
        if (team == null || team.getGithubRepoUrl() == null) {
            log.debug("Team {} has no GitHub repo configured", teamId);
            return;
        }

        // 팀 리더의 GitHub 토큰 조회
        Member leader = memberDao.findByNo(team.getLeaderNo());
        if (leader == null || leader.getGithubAccessToken() == null) {
            log.debug("Team leader has no GitHub access token");
            return;
        }

        // GitHub repo URL에서 owner/repo 추출
        String[] ownerRepo = parseRepoUrl(team.getGithubRepoUrl());
        if (ownerRepo == null) {
            log.warn("Invalid GitHub repo URL: {}", team.getGithubRepoUrl());
            return;
        }

        // 댓글 작성자 정보 조회
        Member author = memberDao.findByNo(comment.getAuthorNo());
        String authorName = author != null ? author.getName() : "Unknown";

        // GitHub 댓글 본문 생성
        String body = comment.getContent();
        if (!body.contains("*From Synodos*")) {
            body = body + "\n\n---\n*From Synodos - " + authorName + "*";
        }

        try {
            // GitHub에 댓글 생성
            GitHubIssueService.GitHubComment githubComment = gitHubIssueService.createComment(
                ownerRepo[0], ownerRepo[1], leader.getGithubAccessToken(),
                mapping.getIssueNumber(), body
            );

            // GitHub 댓글 ID 저장
            commentDao.updateGithubCommentId(comment.getCommentId(), githubComment.getId());
            log.info("Synced Synodos comment #{} to GitHub comment {}", comment.getCommentId(), githubComment.getId());

        } catch (Exception e) {
            log.error("Failed to create GitHub comment: {}", e.getMessage());
            throw new RuntimeException("GitHub 댓글 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * GitHub repo URL에서 owner/repo 추출
     */
    private String[] parseRepoUrl(String repoUrl) {
        if (repoUrl == null) return null;

        // https://github.com/owner/repo 형식
        String normalized = repoUrl
            .replaceAll("\\.git$", "")
            .replaceAll("/$", "");

        if (normalized.contains("github.com/")) {
            String path = normalized.substring(normalized.indexOf("github.com/") + 11);
            String[] parts = path.split("/");
            if (parts.length >= 2) {
                return new String[]{parts[0], parts[1]};
            }
        }
        return null;
    }
}
