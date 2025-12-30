package com.example.demo.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.GitHubWebhookPayload;
import com.example.demo.service.GitHubWebhookService;
import com.example.demo.service.GitHubWebhookService.WebhookResult;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * GitHub Webhook 수신 컨트롤러
 *
 * GitHub 저장소 설정:
 * 1. Settings -> Webhooks -> Add webhook
 * 2. Payload URL: https://your-domain/api/webhook/github
 * 3. Content type: application/json
 * 4. Secret: (선택사항) 설정 시 GITHUB_WEBHOOK_SECRET 환경변수와 일치해야 함
 * 5. Events: Just the push event
 */
@Slf4j
@RestController
@RequestMapping("/api/webhook")
public class GitHubWebhookController {

    @Autowired
    private GitHubWebhookService webhookService;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${github.webhook.secret:}")
    private String webhookSecret;

    /**
     * GitHub push 이벤트 수신
     * POST /api/webhook/github
     */
    @PostMapping("/github")
    public ResponseEntity<?> handleGitHubWebhook(
            @RequestHeader(value = "X-GitHub-Event", required = false) String event,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestBody String rawPayload) {

        log.info("Received GitHub webhook - Event: {}, Delivery: {}", event, deliveryId);

        // 1. 이벤트 타입 확인
        if (!"push".equals(event)) {
            log.info("Ignoring non-push event: {}", event);
            return ResponseEntity.ok(Map.of("message", "Event ignored", "event", event));
        }

        // 2. 시크릿 검증 (설정된 경우)
        if (webhookSecret != null && !webhookSecret.isEmpty()) {
            if (!verifySignature(rawPayload, signature)) {
                log.warn("Invalid webhook signature");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid signature"));
            }
        }

        // 3. Payload 파싱
        GitHubWebhookPayload payload;
        try {
            payload = objectMapper.readValue(rawPayload, GitHubWebhookPayload.class);
        } catch (Exception e) {
            log.error("Failed to parse webhook payload: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid payload format"));
        }

        // 4. Webhook 처리
        try {
            WebhookResult result = webhookService.processWebhook(payload);

            if (result.getError() != null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", result.getError()
                ));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("teamId", result.getTeamId());
            response.put("teamName", result.getTeamName());
            response.put("linked", result.getLinkedCount());
            response.put("skipped", result.getSkippedCount());
            response.put("commits", result.getCommitResults());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to process webhook: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Webhook processing failed: " + e.getMessage()));
        }
    }

    /**
     * Webhook 연결 테스트용 (ping 이벤트)
     */
    @PostMapping("/github/ping")
    public ResponseEntity<?> handlePing() {
        return ResponseEntity.ok(Map.of("message", "pong", "status", "Webhook configured successfully"));
    }

    /**
     * 수동으로 특정 브랜치/커밋 동기화 (디버깅/테스트용)
     * POST /api/webhook/github/sync
     */
    @PostMapping("/github/sync")
    public ResponseEntity<?> manualSync(@RequestBody GitHubWebhookPayload payload) {
        log.info("Manual sync triggered for repo: {}",
            payload.getRepository() != null ? payload.getRepository().getFullName() : "unknown");

        try {
            WebhookResult result = webhookService.processWebhook(payload);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Manual sync failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GitHub webhook signature 검증
     * HMAC SHA-256 사용
     */
    private boolean verifySignature(String payload, String signature) {
        if (signature == null || !signature.startsWith("sha256=")) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);

            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = "sha256=" + bytesToHex(hash);

            return MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
