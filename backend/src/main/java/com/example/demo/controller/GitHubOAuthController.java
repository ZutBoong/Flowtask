package com.example.demo.controller;

import com.example.demo.dao.MemberDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.model.Member;
import com.example.demo.model.Team;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.service.GitHubService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/**
 * GitHub OAuth 연동 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/github/oauth")
public class GitHubOAuthController {

    @Autowired
    private MemberDao memberDao;

    @Autowired
    private TeamDao teamDao;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private GitHubService gitHubService;

    @Value("${github.oauth.client-id:}")
    private String clientId;

    @Value("${github.oauth.client-secret:}")
    private String clientSecret;

    @Value("${github.oauth.redirect-uri:http://localhost:3000/github/callback}")
    private String redirectUri;

    @Value("${github.webhook.secret:}")
    private String webhookSecret;

    @Value("${github.webhook.base-url:}")
    private String webhookBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * GitHub OAuth 인증 URL 반환
     * GET /api/github/oauth/authorize
     */
    @GetMapping("/authorize")
    public ResponseEntity<?> getAuthorizeUrl(@RequestParam int memberNo) {
        if (clientId == null || clientId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "GitHub OAuth가 설정되지 않았습니다. 관리자에게 문의하세요."
            ));
        }

        String scope = "repo";  // repo 권한 (issues 읽기/쓰기 포함)
        String state = String.valueOf(memberNo);  // state에 memberNo 저장

        String authorizeUrl = String.format(
            "https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&state=%s",
            clientId,
            URLEncoder.encode(redirectUri, StandardCharsets.UTF_8),
            scope,
            state
        );

        return ResponseEntity.ok(Map.of("url", authorizeUrl));
    }

    /**
     * GitHub OAuth 콜백 처리
     * POST /api/github/oauth/callback
     */
    @PostMapping("/callback")
    public ResponseEntity<?> handleCallback(@RequestBody CallbackRequest request) {
        log.info("GitHub OAuth callback - code: {}, state: {}",
            request.getCode() != null ? "received" : "null", request.getState());

        if (clientId == null || clientId.isEmpty() || clientSecret == null || clientSecret.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "GitHub OAuth가 설정되지 않았습니다."
            ));
        }

        try {
            // 1. code로 access token 교환
            String accessToken = exchangeCodeForToken(request.getCode());
            if (accessToken == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "토큰 교환 실패"));
            }

            // 2. GitHub 사용자 정보 조회
            GitHubUser githubUser = getGitHubUser(accessToken);
            if (githubUser == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "GitHub 사용자 정보 조회 실패"));
            }

            // 3. memberNo 추출
            int memberNo;
            try {
                memberNo = Integer.parseInt(request.getState());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "잘못된 state 값"));
            }

            // 4. 이미 다른 계정에 연결된 GitHub 사용자인지 확인
            Member existingMember = memberDao.findByGithubUsername(githubUser.login);
            if (existingMember != null && existingMember.getNo() != memberNo) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "이 GitHub 계정은 이미 다른 사용자에게 연결되어 있습니다."
                ));
            }

            // 5. 회원 정보 업데이트
            Member member = memberDao.findByNo(memberNo);
            if (member == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "회원을 찾을 수 없습니다."));
            }

            member.setGithubUsername(githubUser.login);
            member.setGithubAccessToken(accessToken);
            memberDao.updateGitHubConnection(member);

            // 업데이트된 member 다시 조회해서 connectedAt 가져오기
            Member updatedMember = memberDao.findByNo(memberNo);

            log.info("GitHub connected: member={} -> github={}", memberNo, githubUser.login);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "githubUsername", githubUser.login,
                "avatarUrl", githubUser.avatarUrl != null ? githubUser.avatarUrl : "",
                "connectedAt", updatedMember.getGithubConnectedAt() != null ?
                    updatedMember.getGithubConnectedAt().toString() : ""
            ));

        } catch (Exception e) {
            log.error("GitHub OAuth callback failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", "GitHub 연동 실패: " + e.getMessage()));
        }
    }

    /**
     * GitHub 연동 해제
     * DELETE /api/github/oauth/disconnect/{memberNo}
     */
    @DeleteMapping("/disconnect/{memberNo}")
    public ResponseEntity<?> disconnect(@PathVariable int memberNo) {
        try {
            Member member = memberDao.findByNo(memberNo);
            if (member == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "회원을 찾을 수 없습니다."));
            }

            memberDao.disconnectGitHub(memberNo);
            log.info("GitHub disconnected: member={}", memberNo);

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("GitHub disconnect failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "GitHub 연동 해제 실패"));
        }
    }

    /**
     * GitHub 연동 상태 조회
     * GET /api/github/oauth/status/{memberNo}
     *
     * GitHub 연동 상태를 확인합니다.
     * 1. member 테이블의 github_username 확인 (GitHubOAuthController를 통한 연동)
     * 2. member_social_link 테이블 확인 (소셜 로그인을 통한 연동)
     *
     * 둘 중 하나라도 연동되어 있으면 connected=true를 반환합니다.
     * repo scope가 필요한 경우 hasRepoAccess 필드도 확인해야 합니다.
     */
    @GetMapping("/status/{memberNo}")
    public ResponseEntity<?> getStatus(@PathVariable int memberNo) {
        Member member = memberDao.findByNo(memberNo);
        if (member == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "회원을 찾을 수 없습니다."));
        }

        // 1. member 테이블에서 GitHub 연동 확인 (repo 권한 포함)
        boolean hasGithubInMember = member.getGithubUsername() != null && !member.getGithubUsername().isEmpty();
        boolean hasAccessToken = member.getGithubAccessToken() != null && !member.getGithubAccessToken().isEmpty();

        // GitHub 연동됨 = username이 있고 access token도 있음
        boolean connected = hasGithubInMember && hasAccessToken;

        String githubUsername = member.getGithubUsername() != null ? member.getGithubUsername() : "";
        String connectedAt = member.getGithubConnectedAt() != null ? member.getGithubConnectedAt().toString() : "";

        log.debug("GitHub status for member {}: hasUsername={}, hasAccessToken={}, connected={}",
            memberNo, hasGithubInMember, hasAccessToken, connected);

        return ResponseEntity.ok(Map.of(
            "connected", connected,
            "githubUsername", githubUsername,
            "connectedAt", connectedAt,
            "hasRepoAccess", hasAccessToken  // repo 접근 가능 여부
        ));
    }

    // ==================== 저장소 관리 (팀 연동용) ====================

    /**
     * Webhook 설정 정보 조회
     * GET /api/github/oauth/webhook-config
     */
    @GetMapping("/webhook-config")
    public ResponseEntity<?> getWebhookConfig() {
        boolean configured = webhookBaseUrl != null && !webhookBaseUrl.trim().isEmpty();
        return ResponseEntity.ok(Map.of(
            "configured", configured,
            "baseUrl", configured ? webhookBaseUrl : ""
        ));
    }

    /**
     * 사용자의 GitHub 저장소 목록 조회
     * GET /api/github/oauth/repos/{memberNo}
     */
    @GetMapping("/repos/{memberNo}")
    public ResponseEntity<?> listRepositories(@PathVariable int memberNo) {
        try {
            Member member = memberDao.findByNo(memberNo);
            if (member == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "회원을 찾을 수 없습니다."));
            }

            if (member.getGithubAccessToken() == null || member.getGithubAccessToken().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "GitHub 계정이 연결되지 않았습니다."));
            }

            var repos = gitHubService.listUserRepositories(member.getGithubAccessToken());
            return ResponseEntity.ok(repos);
        } catch (Exception e) {
            log.error("Failed to list repositories: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 팀에 GitHub 저장소 연결 (자동 Webhook 등록)
     * POST /api/github/oauth/connect-repo
     */
    @PostMapping("/connect-repo")
    public ResponseEntity<?> connectRepository(@RequestBody ConnectRepoRequest request) {
        log.info("Connecting repo {} to team {} by member {}",
            request.getRepoFullName(), request.getTeamId(), request.getMemberNo());

        try {
            // 1. 멤버 확인
            Member member = memberDao.findByNo(request.getMemberNo());
            if (member == null || member.getGithubAccessToken() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "GitHub 계정이 연결되지 않았습니다."));
            }

            // 2. 팀 확인
            Team team = teamDao.findById(request.getTeamId());
            if (team == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "팀을 찾을 수 없습니다."));
            }

            // 3. 팀장 권한 확인
            if (team.getLeaderNo() != request.getMemberNo()) {
                return ResponseEntity.badRequest().body(Map.of("error", "팀장만 저장소를 연결할 수 있습니다."));
            }

            // 4. 저장소 URL 파싱
            String[] parts = request.getRepoFullName().split("/");
            if (parts.length != 2) {
                return ResponseEntity.badRequest().body(Map.of("error", "잘못된 저장소 형식입니다."));
            }
            String owner = parts[0];
            String repo = parts[1];
            String repoUrl = "https://github.com/" + request.getRepoFullName();

            // 5. Webhook URL 결정 (설정된 URL 우선, 없으면 request에서)
            String webhookUrl = request.getWebhookUrl();
            if ((webhookUrl == null || webhookUrl.isEmpty()) && webhookBaseUrl != null && !webhookBaseUrl.isEmpty()) {
                webhookUrl = webhookBaseUrl;
            }
            if (webhookUrl == null || webhookUrl.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Webhook URL이 필요합니다. 서버 설정을 확인하세요."));
            }

            // 6. 기존 Webhook 확인 및 삭제 (Synodos용)
            try {
                var existingWebhooks = gitHubService.listWebhooks(member.getGithubAccessToken(), owner, repo);
                for (var hook : existingWebhooks) {
                    if (hook.getUrl() != null && hook.getUrl().contains("/api/webhook/github")) {
                        gitHubService.deleteWebhook(member.getGithubAccessToken(), owner, repo, hook.getId());
                        log.info("Deleted existing Synodos webhook: {}", hook.getId());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to check/delete existing webhooks: {}", e.getMessage());
            }

            // 7. 새 Webhook 등록
            GitHubService.GitHubWebhook webhook;
            try {
                webhook = gitHubService.createWebhook(
                    member.getGithubAccessToken(),
                    owner,
                    repo,
                    webhookUrl + "/api/webhook/github",
                    webhookSecret
                );
            } catch (Exception e) {
                log.error("Failed to create webhook: {}", e.getMessage());
                // Webhook 실패해도 저장소 연결은 진행
                webhook = null;
            }

            // 8. 팀 정보 업데이트
            team.setGithubRepoUrl(repoUrl);
            team.setGithubIssueSyncEnabled(true);
            teamDao.updateTeam(team);

            log.info("Repository connected successfully: {} -> team {}", repoUrl, request.getTeamId());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "repoUrl", repoUrl,
                "webhookCreated", webhook != null,
                "webhookId", webhook != null ? webhook.getId() : 0
            ));

        } catch (Exception e) {
            log.error("Failed to connect repository: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", "저장소 연결 실패: " + e.getMessage()));
        }
    }

    /**
     * 팀의 GitHub 저장소 연결 해제
     * DELETE /api/github/oauth/disconnect-repo/{teamId}
     */
    @DeleteMapping("/disconnect-repo/{teamId}")
    public ResponseEntity<?> disconnectRepository(
            @PathVariable int teamId,
            @RequestParam int memberNo) {
        log.info("Disconnecting repo from team {} by member {}", teamId, memberNo);

        try {
            // 1. 팀 확인
            Team team = teamDao.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "팀을 찾을 수 없습니다."));
            }

            // 2. 팀장 권한 확인
            if (team.getLeaderNo() != memberNo) {
                return ResponseEntity.badRequest().body(Map.of("error", "팀장만 저장소를 연결 해제할 수 있습니다."));
            }

            // 3. 팀 정보 업데이트
            team.setGithubRepoUrl(null);
            team.setGithubIssueSyncEnabled(false);
            teamDao.updateTeam(team);

            log.info("Repository disconnected from team {}", teamId);

            return ResponseEntity.ok(Map.of("success", true));

        } catch (Exception e) {
            log.error("Failed to disconnect repository: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "저장소 연결 해제 실패: " + e.getMessage()));
        }
    }

    // ==================== GitHub 로그인 ====================

    /**
     * GitHub 로그인용 OAuth 인증 URL 반환
     * GET /api/github/oauth/login/authorize
     */
    @GetMapping("/login/authorize")
    public ResponseEntity<?> getLoginAuthorizeUrl() {
        if (clientId == null || clientId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "GitHub OAuth가 설정되지 않았습니다."
            ));
        }

        String scope = "user:email";  // 로그인용: 이메일 정보만 필요
        String state = "login";  // 로그인 모드 표시

        String authorizeUrl = String.format(
            "https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&state=%s",
            clientId,
            URLEncoder.encode(redirectUri, StandardCharsets.UTF_8),
            scope,
            state
        );

        return ResponseEntity.ok(Map.of("url", authorizeUrl));
    }

    /**
     * GitHub 로그인 콜백 처리
     * POST /api/github/oauth/login/callback
     */
    @PostMapping("/login/callback")
    public ResponseEntity<?> handleLoginCallback(@RequestBody CallbackRequest request) {
        log.info("GitHub Login callback - code: {}", request.getCode() != null ? "received" : "null");

        if (clientId == null || clientId.isEmpty() || clientSecret == null || clientSecret.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "GitHub OAuth가 설정되지 않았습니다."
            ));
        }

        try {
            // 1. code로 access token 교환
            String accessToken = exchangeCodeForToken(request.getCode());
            if (accessToken == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "토큰 교환 실패"));
            }

            // 2. GitHub 사용자 정보 조회
            GitHubUser githubUser = getGitHubUser(accessToken);
            if (githubUser == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "GitHub 사용자 정보 조회 실패"));
            }

            // 3. GitHub 이메일 조회
            String email = getGitHubEmail(accessToken);

            // 4. 기존 회원 조회 (GitHub username으로)
            Member member = memberDao.findByGithubUsername(githubUser.login);

            if (member == null) {
                // 5. 신규 회원 생성
                member = new Member();
                member.setUserid("github_" + githubUser.login);  // GitHub 사용자는 github_ 접두사
                member.setPassword(UUID.randomUUID().toString());  // 랜덤 비밀번호 (GitHub 로그인만 사용)
                member.setName(githubUser.name != null ? githubUser.name : githubUser.login);
                member.setEmail(email != null ? email : githubUser.login + "@github.user");
                member.setGithubUsername(githubUser.login);
                member.setGithubAccessToken(accessToken);
                member.setEmailVerified(true);  // GitHub 인증된 계정이므로 이메일 인증 완료 처리

                // 중복 userid 처리
                int count = 1;
                String baseUserid = member.getUserid();
                while (memberDao.checkUserid(member.getUserid()) > 0) {
                    member.setUserid(baseUserid + count);
                    count++;
                }

                // 중복 email 처리
                if (memberDao.checkEmail(member.getEmail()) > 0) {
                    member.setEmail(githubUser.login + "_" + UUID.randomUUID().toString().substring(0, 8) + "@github.user");
                }

                String newUserid = member.getUserid();  // insert 전에 userid 저장
                memberDao.insert(member);
                member = memberDao.findByUserid(newUserid);  // userid로 다시 조회

                // GitHub 정보 업데이트 (insert SQL에 github 필드가 없으므로 별도 업데이트)
                member.setGithubUsername(githubUser.login);
                member.setGithubAccessToken(accessToken);
                memberDao.updateGitHubConnection(member);

                log.info("GitHub 신규 회원 생성: {}", member.getUserid());
            } else {
                // 기존 회원: 토큰 업데이트
                member.setGithubAccessToken(accessToken);
                memberDao.updateGitHubConnection(member);
            }

            // 6. JWT 토큰 생성
            String token = jwtTokenProvider.generateToken(member.getUserid(), member.getNo(), member.getName());

            log.info("GitHub 로그인 성공: {} ({})", member.getUserid(), githubUser.login);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "token", token,
                "member", Map.of(
                    "no", member.getNo(),
                    "userid", member.getUserid(),
                    "name", member.getName(),
                    "email", member.getEmail(),
                    "githubUsername", githubUser.login,
                    "profileImage", member.getProfileImage() != null ? member.getProfileImage() : "",
                    "emailVerified", member.isEmailVerified()
                )
            ));

        } catch (Exception e) {
            log.error("GitHub Login callback failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", "GitHub 로그인 실패: " + e.getMessage()));
        }
    }

    /**
     * Code를 Access Token으로 교환
     */
    private String exchangeCodeForToken(String code) {
        String tokenUrl = "https://github.com/login/oauth/access_token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json");

        String body = String.format(
            "{\"client_id\":\"%s\",\"client_secret\":\"%s\",\"code\":\"%s\",\"redirect_uri\":\"%s\"}",
            clientId, clientSecret, code, redirectUri
        );

        try {
            HttpEntity<String> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, entity, String.class);

            JsonNode json = objectMapper.readTree(response.getBody());
            if (json.has("access_token")) {
                return json.get("access_token").asText();
            } else if (json.has("error")) {
                log.error("GitHub token exchange error: {}", json.get("error_description").asText());
            }
        } catch (Exception e) {
            log.error("Failed to exchange code for token: {}", e.getMessage());
        }
        return null;
    }

    /**
     * GitHub 사용자 정보 조회
     */
    private GitHubUser getGitHubUser(String accessToken) {
        String userUrl = "https://api.github.com/user";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/vnd.github.v3+json");

        try {
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(userUrl, HttpMethod.GET, entity, String.class);

            JsonNode json = objectMapper.readTree(response.getBody());
            GitHubUser user = new GitHubUser();
            user.login = json.get("login").asText();
            user.avatarUrl = json.has("avatar_url") ? json.get("avatar_url").asText() : null;
            user.name = json.has("name") && !json.get("name").isNull() ? json.get("name").asText() : null;
            user.email = json.has("email") && !json.get("email").isNull() ? json.get("email").asText() : null;
            return user;
        } catch (Exception e) {
            log.error("Failed to get GitHub user: {}", e.getMessage());
        }
        return null;
    }

    /**
     * GitHub 이메일 조회 (user:email scope 필요)
     */
    private String getGitHubEmail(String accessToken) {
        String emailUrl = "https://api.github.com/user/emails";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/vnd.github.v3+json");

        try {
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(emailUrl, HttpMethod.GET, entity, String.class);

            JsonNode emails = objectMapper.readTree(response.getBody());
            // primary이면서 verified인 이메일 찾기
            for (JsonNode emailNode : emails) {
                if (emailNode.get("primary").asBoolean() && emailNode.get("verified").asBoolean()) {
                    return emailNode.get("email").asText();
                }
            }
            // primary가 없으면 첫 번째 verified 이메일
            for (JsonNode emailNode : emails) {
                if (emailNode.get("verified").asBoolean()) {
                    return emailNode.get("email").asText();
                }
            }
        } catch (Exception e) {
            log.error("Failed to get GitHub email: {}", e.getMessage());
        }
        return null;
    }

    // DTOs
    public static class CallbackRequest {
        private String code;
        private String state;

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getState() { return state; }
        public void setState(String state) { this.state = state; }
    }

    private static class GitHubUser {
        String login;
        String avatarUrl;
        String name;
        String email;
    }

    @lombok.Data
    public static class ConnectRepoRequest {
        private int teamId;
        private int memberNo;
        private String repoFullName;  // "owner/repo" 형식
        private String webhookUrl;    // 예: "https://xxx.ngrok.io"
    }
}
