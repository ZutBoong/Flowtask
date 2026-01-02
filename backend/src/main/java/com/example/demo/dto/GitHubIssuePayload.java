package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * GitHub Issues Webhook 페이로드 DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GitHubIssuePayload {

    private String action;  // opened, edited, closed, reopened, labeled, unlabeled, assigned, unassigned, milestoned, demilestoned
    private Issue issue;
    private Repository repository;
    private Label label;        // for labeled/unlabeled events
    private User assignee;      // for assigned/unassigned events
    private Sender sender;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Issue {
        private long id;
        private int number;
        private String title;
        private String body;
        private String state;  // open, closed
        private User user;
        private List<Label> labels;
        private List<User> assignees;
        private Milestone milestone;

        @JsonProperty("html_url")
        private String htmlUrl;

        @JsonProperty("created_at")
        private String createdAt;

        @JsonProperty("updated_at")
        private String updatedAt;

        @JsonProperty("closed_at")
        private String closedAt;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Repository {
        private long id;
        private String name;

        @JsonProperty("full_name")
        private String fullName;

        @JsonProperty("html_url")
        private String htmlUrl;

        private Owner owner;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Owner {
        private String login;
        private long id;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class User {
        private String login;
        private long id;

        @JsonProperty("avatar_url")
        private String avatarUrl;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Label {
        private long id;
        private String name;
        private String color;
        private String description;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Milestone {
        private int number;
        private String title;
        private String description;
        private String state;  // open, closed

        @JsonProperty("due_on")
        private String dueOn;  // ISO 8601 date (e.g., "2025-01-31T00:00:00Z")

        @JsonProperty("created_at")
        private String createdAt;

        @JsonProperty("updated_at")
        private String updatedAt;

        @JsonProperty("closed_at")
        private String closedAt;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Sender {
        private String login;
        private long id;
    }

    /**
     * Repository 정보에서 owner 추출
     */
    public String getOwner() {
        if (repository != null && repository.getOwner() != null) {
            return repository.getOwner().getLogin();
        }
        return null;
    }

    /**
     * Repository 정보에서 repo 이름 추출
     */
    public String getRepo() {
        if (repository != null) {
            return repository.getName();
        }
        return null;
    }
}
