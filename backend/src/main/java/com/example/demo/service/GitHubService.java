package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.core.ParameterizedTypeReference;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class GitHubService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GitHubService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 저장소 URL에서 owner와 repo를 파싱합니다.
     * 예: https://github.com/owner/repo -> RepoInfo(owner, repo)
     */
    public RepoInfo parseRepoUrl(String repoUrl) {
        if (repoUrl == null || repoUrl.trim().isEmpty()) {
            return null;
        }

        // https://github.com/owner/repo 또는 https://github.com/owner/repo.git
        Pattern pattern = Pattern.compile("https://github\\.com/([^/]+)/([^/\\.]+)(?:\\.git)?/?");
        Matcher matcher = pattern.matcher(repoUrl.trim());

        if (matcher.matches()) {
            return new RepoInfo(matcher.group(1), matcher.group(2));
        }
        return null;
    }

    /**
     * 브랜치 목록을 조회합니다.
     */
    public List<GitHubBranch> listBranches(String owner, String repo) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/branches?per_page=100", owner, repo);
        log.info("Fetching branches from: {}", apiUrl);

        try {
            HttpHeaders headers = createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubBranch> branches = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                String name = node.path("name").asText();
                String sha = node.path("commit").path("sha").asText();
                branches.add(new GitHubBranch(name, sha));
            }

            return branches;
        } catch (Exception e) {
            log.error("Failed to fetch branches: {}", e.getMessage());
            throw new RuntimeException("브랜치 목록을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * 특정 브랜치의 커밋 목록을 조회합니다.
     */
    public List<GitHubCommit> listCommits(String owner, String repo, String branch, int page) {
        String apiUrl = String.format(
            "https://api.github.com/repos/%s/%s/commits?sha=%s&per_page=20&page=%d",
            owner, repo, branch, page
        );
        log.info("Fetching commits from: {}", apiUrl);

        try {
            HttpHeaders headers = createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubCommit> commits = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                String sha = node.path("sha").asText();
                String message = node.path("commit").path("message").asText();
                String authorName = node.path("commit").path("author").path("name").asText();
                String authorLogin = node.path("author").path("login").asText("");
                String date = node.path("commit").path("author").path("date").asText();
                String htmlUrl = node.path("html_url").asText();

                // 메시지가 너무 길면 자르기
                if (message.length() > 100) {
                    message = message.substring(0, 100) + "...";
                }

                commits.add(new GitHubCommit(sha, message, authorName, authorLogin, date, htmlUrl));
            }

            return commits;
        } catch (Exception e) {
            log.error("Failed to fetch commits: {}", e.getMessage());
            throw new RuntimeException("커밋 목록을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * GitHub API 요청용 헤더를 생성합니다.
     */
    private HttpHeaders createGitHubHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Synodos-App");
        headers.set("Accept", "application/vnd.github.v3+json");
        return headers;
    }

    /**
     * GitHub URL에서 코드를 가져옵니다.
     * 지원 형식:
     * - https://github.com/owner/repo/blob/branch/path/to/file.java
     * - https://github.com/owner/repo/commit/sha
     */
    public GitHubContent fetchCodeFromUrl(String githubUrl) {
        log.info("Fetching code from GitHub URL: {}", githubUrl);

        GitHubUrlInfo urlInfo = parseGitHubUrl(githubUrl);
        if (urlInfo == null) {
            throw new IllegalArgumentException("지원하지 않는 GitHub URL 형식입니다: " + githubUrl);
        }

        String code;
        String filename;

        if ("blob".equals(urlInfo.type)) {
            // File URL - fetch raw content
            code = fetchRawFileContent(urlInfo);
            filename = urlInfo.path.substring(urlInfo.path.lastIndexOf('/') + 1);
        } else if ("commit".equals(urlInfo.type)) {
            // Commit URL - fetch commit diff
            code = fetchCommitDiff(urlInfo);
            filename = "commit_" + urlInfo.ref.substring(0, 7);
        } else {
            throw new IllegalArgumentException("지원하지 않는 URL 타입입니다: " + urlInfo.type);
        }

        return new GitHubContent(code, filename, urlInfo);
    }

    /**
     * GitHub URL을 파싱합니다.
     */
    public GitHubUrlInfo parseGitHubUrl(String url) {
        // File URL: https://github.com/owner/repo/blob/branch/path/to/file
        Pattern filePattern = Pattern.compile(
            "https://github\\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)"
        );
        Matcher fileMatcher = filePattern.matcher(url);
        if (fileMatcher.matches()) {
            return new GitHubUrlInfo(
                fileMatcher.group(1),  // owner
                fileMatcher.group(2),  // repo
                "blob",                // type
                fileMatcher.group(3),  // ref (branch/tag)
                fileMatcher.group(4)   // path
            );
        }

        // Commit URL: https://github.com/owner/repo/commit/sha
        Pattern commitPattern = Pattern.compile(
            "https://github\\.com/([^/]+)/([^/]+)/commit/([a-f0-9]+)"
        );
        Matcher commitMatcher = commitPattern.matcher(url);
        if (commitMatcher.matches()) {
            return new GitHubUrlInfo(
                commitMatcher.group(1),  // owner
                commitMatcher.group(2),  // repo
                "commit",                // type
                commitMatcher.group(3),  // ref (commit sha)
                null                     // path (not applicable)
            );
        }

        return null;
    }

    /**
     * GitHub raw 파일 내용을 가져옵니다.
     */
    private String fetchRawFileContent(GitHubUrlInfo urlInfo) {
        // Use raw.githubusercontent.com for raw file content
        String rawUrl = String.format(
            "https://raw.githubusercontent.com/%s/%s/%s/%s",
            urlInfo.owner, urlInfo.repo, urlInfo.ref, urlInfo.path
        );

        log.info("Fetching raw content from: {}", rawUrl);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Synodos-App");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                rawUrl, HttpMethod.GET, entity, String.class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to fetch raw content: {}", e.getMessage());
            throw new RuntimeException("GitHub에서 파일을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * GitHub commit diff를 가져옵니다.
     */
    private String fetchCommitDiff(GitHubUrlInfo urlInfo) {
        // GitHub API for commit
        String apiUrl = String.format(
            "https://api.github.com/repos/%s/%s/commits/%s",
            urlInfo.owner, urlInfo.repo, urlInfo.ref
        );

        log.info("Fetching commit from: {}", apiUrl);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Synodos-App");
            headers.set("Accept", "application/vnd.github.v3.diff");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            String diff = response.getBody();

            // Limit diff size to prevent token overflow
            if (diff != null && diff.length() > 10000) {
                diff = diff.substring(0, 10000) + "\n\n... (truncated, diff too large)";
            }

            return diff;
        } catch (Exception e) {
            log.error("Failed to fetch commit: {}", e.getMessage());
            throw new RuntimeException("GitHub에서 커밋을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * GitHub URL 정보를 담는 클래스
     */
    public static class GitHubUrlInfo {
        public final String owner;
        public final String repo;
        public final String type;  // "blob" or "commit"
        public final String ref;   // branch/tag or commit sha
        public final String path;  // file path (null for commits)

        public GitHubUrlInfo(String owner, String repo, String type, String ref, String path) {
            this.owner = owner;
            this.repo = repo;
            this.type = type;
            this.ref = ref;
            this.path = path;
        }
    }

    /**
     * GitHub에서 가져온 콘텐츠를 담는 클래스
     */
    public static class GitHubContent {
        public final String code;
        public final String filename;
        public final GitHubUrlInfo urlInfo;

        public GitHubContent(String code, String filename, GitHubUrlInfo urlInfo) {
            this.code = code;
            this.filename = filename;
            this.urlInfo = urlInfo;
        }
    }

    // ==================== 저장소 목록 및 Webhook 관리 ====================

    /**
     * 사용자의 GitHub 저장소 목록을 조회합니다.
     */
    public List<GitHubRepository> listUserRepositories(String accessToken) {
        String apiUrl = "https://api.github.com/user/repos?per_page=100&sort=updated";
        log.info("Fetching user repositories");

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubRepository> repos = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                GitHubRepository repo = new GitHubRepository();
                repo.setId(node.path("id").asLong());
                repo.setName(node.path("name").asText());
                repo.setFullName(node.path("full_name").asText());
                repo.setHtmlUrl(node.path("html_url").asText());
                repo.setDescription(node.path("description").asText(null));
                repo.setPrivateRepo(node.path("private").asBoolean());
                repo.setOwner(node.path("owner").path("login").asText());
                repos.add(repo);
            }

            return repos;
        } catch (Exception e) {
            log.error("Failed to fetch repositories: {}", e.getMessage());
            throw new RuntimeException("저장소 목록을 가져오는데 실패했습니다.", e);
        }
    }

    /**
     * 저장소에 Webhook을 등록합니다.
     */
    public GitHubWebhook createWebhook(String accessToken, String owner, String repo, String webhookUrl, String secret) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/hooks", owner, repo);
        log.info("Creating webhook for {}/{}", owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            // Webhook 설정
            Map<String, Object> config = Map.of(
                "url", webhookUrl,
                "content_type", "json",
                "secret", secret != null ? secret : "",
                "insecure_ssl", "0"
            );

            Map<String, Object> body = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("issues", "push", "issue_comment"),
                "config", config
            );

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            GitHubWebhook webhook = new GitHubWebhook();
            webhook.setId(node.path("id").asLong());
            webhook.setUrl(node.path("config").path("url").asText());
            webhook.setActive(node.path("active").asBoolean());

            log.info("Webhook created successfully: id={}", webhook.getId());
            return webhook;
        } catch (Exception e) {
            log.error("Failed to create webhook: {}", e.getMessage());
            // 이미 존재하는 경우 등 에러 처리
            if (e.getMessage().contains("422") || e.getMessage().contains("already exists")) {
                throw new RuntimeException("이미 Webhook이 등록되어 있습니다.", e);
            }
            throw new RuntimeException("Webhook 등록에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 저장소의 기존 Webhook 목록을 조회합니다.
     */
    public List<GitHubWebhook> listWebhooks(String accessToken, String owner, String repo) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/hooks", owner, repo);
        log.info("Listing webhooks for {}/{}", owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubWebhook> webhooks = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                GitHubWebhook webhook = new GitHubWebhook();
                webhook.setId(node.path("id").asLong());
                webhook.setUrl(node.path("config").path("url").asText());
                webhook.setActive(node.path("active").asBoolean());
                webhooks.add(webhook);
            }

            return webhooks;
        } catch (Exception e) {
            log.error("Failed to list webhooks: {}", e.getMessage());
            throw new RuntimeException("Webhook 목록을 가져오는데 실패했습니다.", e);
        }
    }

    /**
     * Webhook을 삭제합니다.
     */
    public void deleteWebhook(String accessToken, String owner, String repo, long hookId) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/hooks/%d", owner, repo, hookId);
        log.info("Deleting webhook {} for {}/{}", hookId, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            restTemplate.exchange(apiUrl, HttpMethod.DELETE, entity, String.class);
            log.info("Webhook deleted successfully");
        } catch (Exception e) {
            log.error("Failed to delete webhook: {}", e.getMessage());
            throw new RuntimeException("Webhook 삭제에 실패했습니다.", e);
        }
    }

    /**
     * 인증 헤더를 생성합니다.
     */
    private HttpHeaders createAuthHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Synodos-App");
        headers.set("Accept", "application/vnd.github.v3+json");
        headers.set("Authorization", "Bearer " + accessToken);
        return headers;
    }

    // ==================== DTO Classes ====================

    /**
     * 저장소 정보를 담는 클래스
     */
    public static class RepoInfo {
        public final String owner;
        public final String repo;

        public RepoInfo(String owner, String repo) {
            this.owner = owner;
            this.repo = repo;
        }
    }

    /**
     * 브랜치 정보를 담는 클래스
     */
    public static class GitHubBranch {
        public final String name;
        public final String sha;

        public GitHubBranch(String name, String sha) {
            this.name = name;
            this.sha = sha;
        }

        // JSON 직렬화를 위한 getter
        public String getName() { return name; }
        public String getSha() { return sha; }
    }

    /**
     * 커밋 정보를 담는 클래스
     */
    public static class GitHubCommit {
        public final String sha;
        public final String message;
        public final String authorName;
        public final String authorLogin;
        public final String date;
        public final String htmlUrl;

        public GitHubCommit(String sha, String message, String authorName, String authorLogin, String date, String htmlUrl) {
            this.sha = sha;
            this.message = message;
            this.authorName = authorName;
            this.authorLogin = authorLogin;
            this.date = date;
            this.htmlUrl = htmlUrl;
        }

        // JSON 직렬화를 위한 getter
        public String getSha() { return sha; }
        public String getMessage() { return message; }
        public String getAuthorName() { return authorName; }
        public String getAuthorLogin() { return authorLogin; }
        public String getDate() { return date; }
        public String getHtmlUrl() { return htmlUrl; }
        public String getShortSha() { return sha.substring(0, 7); }
    }

    /**
     * GitHub 저장소 정보
     */
    @lombok.Data
    public static class GitHubRepository {
        private long id;
        private String name;
        private String fullName;
        private String htmlUrl;
        private String description;
        private boolean privateRepo;
        private String owner;
    }

    /**
     * GitHub Webhook 정보
     */
    @lombok.Data
    public static class GitHubWebhook {
        private long id;
        private String url;
        private boolean active;
    }
}
