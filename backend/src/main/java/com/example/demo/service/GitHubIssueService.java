package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * GitHub Issues API 서비스
 */
@Slf4j
@Service
public class GitHubIssueService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String GITHUB_API_BASE = "https://api.github.com";

    public GitHubIssueService() {
        // PATCH 메서드 지원을 위해 Apache HttpClient 사용
        this.restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory());
        this.objectMapper = new ObjectMapper();
    }

    /**
     * GitHub API 헤더 생성 (토큰 포함)
     */
    private HttpHeaders createHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Synodos-App");
        headers.set("Accept", "application/vnd.github.v3+json");
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null && !token.isEmpty()) {
            headers.set("Authorization", "Bearer " + token);
        }
        return headers;
    }

    // ==================== Issue CRUD ====================

    /**
     * Issue 생성
     */
    public GitHubIssue createIssue(String owner, String repo, String token, CreateIssueRequest request) {
        String apiUrl = String.format("%s/repos/%s/%s/issues", GITHUB_API_BASE, owner, repo);
        log.info("Creating issue in {}/{}", owner, repo);

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("title", request.getTitle());
            if (request.getBody() != null) {
                body.put("body", request.getBody());
            }
            if (request.getLabels() != null && !request.getLabels().isEmpty()) {
                ArrayNode labelsArray = body.putArray("labels");
                request.getLabels().forEach(labelsArray::add);
            }
            if (request.getAssignees() != null && !request.getAssignees().isEmpty()) {
                ArrayNode assigneesArray = body.putArray("assignees");
                request.getAssignees().forEach(assigneesArray::add);
            }
            if (request.getMilestone() != null) {
                body.put("milestone", request.getMilestone());
            }

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

            return parseIssue(objectMapper.readTree(response.getBody()));
        } catch (HttpClientErrorException e) {
            log.error("Failed to create issue: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Issue 생성 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to create issue: {}", e.getMessage());
            throw new RuntimeException("Issue 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Issue 조회
     */
    public GitHubIssue getIssue(String owner, String repo, String token, int issueNumber) {
        String apiUrl = String.format("%s/repos/%s/%s/issues/%d", GITHUB_API_BASE, owner, repo, issueNumber);
        log.debug("Fetching issue #{} from {}/{}", issueNumber, owner, repo);

        try {
            HttpEntity<String> entity = new HttpEntity<>(createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);
            return parseIssue(objectMapper.readTree(response.getBody()));
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Issue #{} not found in {}/{}", issueNumber, owner, repo);
            return null;
        } catch (Exception e) {
            log.error("Failed to get issue: {}", e.getMessage());
            throw new RuntimeException("Issue 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Issue 목록 조회
     */
    public List<GitHubIssue> listIssues(String owner, String repo, String token, String state, int page) {
        String apiUrl = String.format("%s/repos/%s/%s/issues?state=%s&page=%d&per_page=30",
            GITHUB_API_BASE, owner, repo, state != null ? state : "open", page);
        log.debug("Listing issues from {}/{}", owner, repo);

        try {
            HttpEntity<String> entity = new HttpEntity<>(createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);

            List<GitHubIssue> issues = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());
            for (JsonNode node : jsonArray) {
                // PR은 제외 (pull_request 필드가 없는 것만)
                if (!node.has("pull_request")) {
                    issues.add(parseIssue(node));
                }
            }
            return issues;
        } catch (Exception e) {
            log.error("Failed to list issues: {}", e.getMessage());
            throw new RuntimeException("Issue 목록 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Issue 업데이트
     */
    public GitHubIssue updateIssue(String owner, String repo, String token, int issueNumber, UpdateIssueRequest request) {
        String apiUrl = String.format("%s/repos/%s/%s/issues/%d", GITHUB_API_BASE, owner, repo, issueNumber);
        log.info("Updating issue #{} in {}/{}", issueNumber, owner, repo);

        try {
            ObjectNode body = objectMapper.createObjectNode();
            if (request.getTitle() != null) {
                body.put("title", request.getTitle());
            }
            if (request.getBody() != null) {
                body.put("body", request.getBody());
            }
            if (request.getState() != null) {
                body.put("state", request.getState());
            }
            if (request.getLabels() != null) {
                ArrayNode labelsArray = body.putArray("labels");
                request.getLabels().forEach(labelsArray::add);
            }
            if (request.getAssignees() != null) {
                ArrayNode assigneesArray = body.putArray("assignees");
                request.getAssignees().forEach(assigneesArray::add);
            }
            if (request.getMilestone() != null) {
                body.put("milestone", request.getMilestone());
            }

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.PATCH, entity, String.class);

            return parseIssue(objectMapper.readTree(response.getBody()));
        } catch (Exception e) {
            log.error("Failed to update issue: {}", e.getMessage());
            throw new RuntimeException("Issue 업데이트 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Issue에 Label 추가
     */
    public void addLabels(String owner, String repo, String token, int issueNumber, List<String> labels) {
        String apiUrl = String.format("%s/repos/%s/%s/issues/%d/labels", GITHUB_API_BASE, owner, repo, issueNumber);
        log.debug("Adding labels {} to issue #{}", labels, issueNumber);

        try {
            ObjectNode body = objectMapper.createObjectNode();
            ArrayNode labelsArray = body.putArray("labels");
            labels.forEach(labelsArray::add);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), createHeaders(token));
            restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
        } catch (Exception e) {
            log.error("Failed to add labels: {}", e.getMessage());
            throw new RuntimeException("Label 추가 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Issue에서 Label 제거
     */
    public void removeLabel(String owner, String repo, String token, int issueNumber, String label) {
        String apiUrl = String.format("%s/repos/%s/%s/issues/%d/labels/%s",
            GITHUB_API_BASE, owner, repo, issueNumber, label);
        log.debug("Removing label {} from issue #{}", label, issueNumber);

        try {
            HttpEntity<String> entity = new HttpEntity<>(createHeaders(token));
            restTemplate.exchange(apiUrl, HttpMethod.DELETE, entity, String.class);
        } catch (HttpClientErrorException.NotFound e) {
            // Label이 없으면 무시
            log.debug("Label {} not found on issue #{}", label, issueNumber);
        } catch (Exception e) {
            log.error("Failed to remove label: {}", e.getMessage());
            throw new RuntimeException("Label 제거 실패: " + e.getMessage(), e);
        }
    }

    // ==================== Label Management ====================

    /**
     * Repository의 Label 목록 조회
     */
    public List<GitHubLabel> listLabels(String owner, String repo, String token) {
        String apiUrl = String.format("%s/repos/%s/%s/labels?per_page=100", GITHUB_API_BASE, owner, repo);
        log.debug("Listing labels from {}/{}", owner, repo);

        try {
            HttpEntity<String> entity = new HttpEntity<>(createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);

            List<GitHubLabel> labels = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());
            for (JsonNode node : jsonArray) {
                GitHubLabel label = new GitHubLabel();
                label.setName(node.path("name").asText());
                label.setColor(node.path("color").asText());
                label.setDescription(node.path("description").asText(null));
                labels.add(label);
            }
            return labels;
        } catch (Exception e) {
            log.error("Failed to list labels: {}", e.getMessage());
            throw new RuntimeException("Label 목록 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Label 생성
     */
    public GitHubLabel createLabel(String owner, String repo, String token, String name, String color, String description) {
        String apiUrl = String.format("%s/repos/%s/%s/labels", GITHUB_API_BASE, owner, repo);
        log.info("Creating label {} in {}/{}", name, owner, repo);

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("name", name);
            body.put("color", color.replace("#", ""));
            if (description != null) {
                body.put("description", description);
            }

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

            JsonNode node = objectMapper.readTree(response.getBody());
            GitHubLabel label = new GitHubLabel();
            label.setName(node.path("name").asText());
            label.setColor(node.path("color").asText());
            label.setDescription(node.path("description").asText(null));
            return label;
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY) {
                // Label already exists
                log.debug("Label {} already exists in {}/{}", name, owner, repo);
                return null;
            }
            throw new RuntimeException("Label 생성 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to create label: {}", e.getMessage());
            throw new RuntimeException("Label 생성 실패: " + e.getMessage(), e);
        }
    }

    // ==================== Milestone Management ====================

    /**
     * Milestone 목록 조회
     */
    public List<GitHubMilestone> listMilestones(String owner, String repo, String token) {
        String apiUrl = String.format("%s/repos/%s/%s/milestones?state=open&per_page=100",
            GITHUB_API_BASE, owner, repo);
        log.debug("Listing milestones from {}/{}", owner, repo);

        try {
            HttpEntity<String> entity = new HttpEntity<>(createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);

            List<GitHubMilestone> milestones = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());
            for (JsonNode node : jsonArray) {
                GitHubMilestone milestone = new GitHubMilestone();
                milestone.setNumber(node.path("number").asInt());
                milestone.setTitle(node.path("title").asText());
                milestone.setDueOn(node.path("due_on").asText(null));
                milestone.setState(node.path("state").asText());
                milestones.add(milestone);
            }
            return milestones;
        } catch (Exception e) {
            log.error("Failed to list milestones: {}", e.getMessage());
            throw new RuntimeException("Milestone 목록 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Milestone 생성
     */
    public GitHubMilestone createMilestone(String owner, String repo, String token, String title, String dueOn) {
        String apiUrl = String.format("%s/repos/%s/%s/milestones", GITHUB_API_BASE, owner, repo);
        log.info("Creating milestone {} in {}/{}", title, owner, repo);

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("title", title);
            if (dueOn != null) {
                body.put("due_on", dueOn);
            }

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), createHeaders(token));
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);

            JsonNode node = objectMapper.readTree(response.getBody());
            GitHubMilestone milestone = new GitHubMilestone();
            milestone.setNumber(node.path("number").asInt());
            milestone.setTitle(node.path("title").asText());
            milestone.setDueOn(node.path("due_on").asText(null));
            milestone.setState(node.path("state").asText());
            return milestone;
        } catch (Exception e) {
            log.error("Failed to create milestone: {}", e.getMessage());
            throw new RuntimeException("Milestone 생성 실패: " + e.getMessage(), e);
        }
    }

    // ==================== Helper Methods ====================

    private GitHubIssue parseIssue(JsonNode node) {
        GitHubIssue issue = new GitHubIssue();
        issue.setId(node.path("id").asLong());
        issue.setNumber(node.path("number").asInt());
        issue.setTitle(node.path("title").asText());
        issue.setBody(node.path("body").asText(null));
        issue.setState(node.path("state").asText());
        issue.setHtmlUrl(node.path("html_url").asText());
        issue.setCreatedAt(node.path("created_at").asText());
        issue.setUpdatedAt(node.path("updated_at").asText());

        // Labels
        List<String> labels = new ArrayList<>();
        for (JsonNode labelNode : node.path("labels")) {
            labels.add(labelNode.path("name").asText());
        }
        issue.setLabels(labels);

        // Assignees
        List<String> assignees = new ArrayList<>();
        for (JsonNode assigneeNode : node.path("assignees")) {
            assignees.add(assigneeNode.path("login").asText());
        }
        issue.setAssignees(assignees);

        // Milestone
        JsonNode milestoneNode = node.path("milestone");
        if (!milestoneNode.isMissingNode() && !milestoneNode.isNull()) {
            issue.setMilestoneNumber(milestoneNode.path("number").asInt());
            issue.setMilestoneTitle(milestoneNode.path("title").asText());
            issue.setMilestoneDueOn(milestoneNode.path("due_on").asText(null));
        }

        // User (creator)
        JsonNode userNode = node.path("user");
        if (!userNode.isMissingNode()) {
            issue.setCreatorLogin(userNode.path("login").asText());
        }

        return issue;
    }

    // ==================== DTOs ====================

    @Data
    public static class GitHubIssue {
        private long id;
        private int number;
        private String title;
        private String body;
        private String state;
        private String htmlUrl;
        private String createdAt;
        private String updatedAt;
        private List<String> labels;
        private List<String> assignees;
        private Integer milestoneNumber;
        private String milestoneTitle;
        private String milestoneDueOn;
        private String creatorLogin;
    }

    @Data
    public static class GitHubLabel {
        private String name;
        private String color;
        private String description;
    }

    @Data
    public static class GitHubMilestone {
        private int number;
        private String title;
        private String dueOn;
        private String state;
    }

    @Data
    public static class CreateIssueRequest {
        private String title;
        private String body;
        private List<String> labels;
        private List<String> assignees;
        private Integer milestone;
    }

    @Data
    public static class UpdateIssueRequest {
        private String title;
        private String body;
        private String state;
        private List<String> labels;
        private List<String> assignees;
        private Integer milestone;
    }
}
