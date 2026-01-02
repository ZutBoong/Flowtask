package com.example.demo.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * GitHub Webhook push 이벤트 페이로드
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GitHubWebhookPayload {

    private String ref;  // "refs/heads/feature/TASK-42-login"
    private String before;
    private String after;
    private Repository repository;
    private Pusher pusher;
    private List<Commit> commits;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Repository {
        private long id;
        private String name;

        @JsonProperty("full_name")
        private String fullName;  // "owner/repo"

        @JsonProperty("html_url")
        private String htmlUrl;

        @JsonProperty("clone_url")
        private String cloneUrl;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Pusher {
        private String name;
        private String email;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Commit {
        private String id;  // commit SHA
        private String message;
        private String timestamp;
        private String url;

        private Author author;
        private Author committer;

        private List<String> added;
        private List<String> removed;
        private List<String> modified;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Author {
        private String name;
        private String email;
        private String username;
    }

    /**
     * ref에서 브랜치명 추출
     * "refs/heads/feature/TASK-42" -> "feature/TASK-42"
     */
    public String getBranchName() {
        if (ref != null && ref.startsWith("refs/heads/")) {
            return ref.substring("refs/heads/".length());
        }
        return ref;
    }
}
