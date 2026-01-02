package com.example.demo.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import com.example.demo.dao.MemberDao;
import com.example.demo.dao.MemberSocialLinkDao;
import com.example.demo.model.Member;
import com.example.demo.model.MemberSocialLink;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final MemberDao memberDao;
    private final MemberSocialLinkDao socialLinkDao;
    private final OAuth2AuthorizedClientService authorizedClientService;

    public OAuth2SuccessHandler(
            JwtTokenProvider jwtTokenProvider,
            MemberDao memberDao,
            MemberSocialLinkDao socialLinkDao,
            OAuth2AuthorizedClientService authorizedClientService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.memberDao = memberDao;
        this.socialLinkDao = socialLinkDao;
        this.authorizedClientService = authorizedClientService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        System.out.println("=== OAuth2SuccessHandler 진입 ===");

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        System.out.println("로그인 provider = " + registrationId);

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email;
        String name;
        String providerId;
        String githubUsername = null;

        /*
         * ===============================
         * GOOGLE LOGIN
         * ===============================
         */
        if ("google".equals(registrationId)) {
            email = (String) attributes.get("email");
            name = (String) attributes.get("name");
            providerId = (String) attributes.get("sub"); // Google 고유 ID
        }

        /*
         * ===============================
         * NAVER LOGIN
         * ===============================
         */
        else if ("naver".equals(registrationId)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = (Map<String, Object>) attributes.get("response");

            if (responseMap == null) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Naver response is missing");
                return;
            }

            email = (String) responseMap.get("email");
            name = (String) responseMap.get("name");
            providerId = (String) responseMap.get("id");
        }

        /*
         * ===============================
         * KAKAO LOGIN
         * ===============================
         */
        else if ("kakao".equals(registrationId)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");

            @SuppressWarnings("unchecked")
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

            providerId = String.valueOf(attributes.get("id"));

            // 이메일 권한이 없는 경우 null 유지
            email = (String) kakaoAccount.get("email");
            name = (String) profile.get("nickname");
        }

        /*
         * ===============================
         * GITHUB LOGIN
         * ===============================
         */
        else if ("github".equals(registrationId)) {
            providerId = String.valueOf(attributes.get("id")); // GitHub 고유 ID (숫자)
            email = (String) attributes.get("email"); // null일 수 있음
            name = (String) attributes.get("name");

            // name이 없으면 login(username) 사용
            if (name == null || name.isBlank()) {
                name = (String) attributes.get("login");
            }

            // GitHub access token 저장을 위해 변수에 저장
            githubUsername = (String) attributes.get("login");
        }

        /*
         * ===============================
         * UNSUPPORTED PROVIDER
         * ===============================
         */
        else {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Unsupported provider: " + registrationId);
            return;
        }

        /*
         * ===============================
         * 공동 검증
         * ===============================
         */
        if (name == null || name.isBlank()) {
            name = email != null ? email.split("@")[0] : "User";
        }

        boolean needsEmailInput = (email == null || email.isBlank());

        /*
         * ===============================
         * DB 회원 조회
         * 1. member 테이블에서 provider + provider_id로 조회 (최초 가입 방식)
         * 2. member_social_link 테이블에서 조회 (연동된 소셜 계정)
         * ===============================
         */
        Member member = memberDao.findByProviderAndProviderId(registrationId, providerId);

        // member 테이블에 없으면 social_link 테이블 확인
        if (member == null) {
            MemberSocialLink socialLink = socialLinkDao.findByProviderAndProviderId(registrationId, providerId);
            if (socialLink != null) {
                member = memberDao.findByNo(socialLink.getMemberNo());
            }
        }

        if (member == null) {
            // 신규 회원 또는 연동 시도
            // → 프론트엔드에서 연동 모드 여부를 확인하고 처리
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString("http://localhost:3000/oauth2/redirect")
                    .queryParam("isNewUser", true)
                    .queryParam("provider", registrationId)
                    .queryParam("providerId", providerId)
                    .queryParam("socialName", UriUtils.encode(name, StandardCharsets.UTF_8))
                    .queryParam("socialEmail", email != null ? email : "")
                    .queryParam("needsEmailInput", needsEmailInput);

            // GitHub인 경우 access token과 username도 전달 (소셜 연동 시 저장 가능하도록)
            if ("github".equals(registrationId) && githubUsername != null) {
                String githubAccessToken = null;

                // 방법 1: authorizedClientService에서 가져오기
                try {
                    OAuth2AuthorizedClient authorizedClient = authorizedClientService.loadAuthorizedClient(
                            registrationId, oauthToken.getName());
                    if (authorizedClient != null && authorizedClient.getAccessToken() != null) {
                        githubAccessToken = authorizedClient.getAccessToken().getTokenValue();
                        System.out.println("[OAuth2] GitHub access token 조회 성공 (authorizedClientService)");
                    }
                } catch (Exception e) {
                    System.err.println("[OAuth2] authorizedClientService에서 토큰 조회 실패: " + e.getMessage());
                }

                // 방법 2: OAuth2AuthenticationToken에서 직접 가져오기 (fallback)
                if (githubAccessToken == null) {
                    try {
                        // principal에서 token 정보를 가져올 수 없으면 다른 방법 시도
                        System.out.println("[OAuth2] fallback: principal name = " + oauthToken.getName());
                    } catch (Exception e) {
                        System.err.println("[OAuth2] fallback 조회 실패: " + e.getMessage());
                    }
                }

                // access token이 있으면 전달
                if (githubAccessToken != null) {
                    builder.queryParam("githubUsername", githubUsername);
                    builder.queryParam("githubAccessToken", githubAccessToken);
                    System.out.println("[OAuth2] GitHub credentials 전달 성공: " + githubUsername);
                } else {
                    // access token 없이 username만 전달
                    builder.queryParam("githubUsername", githubUsername);
                    System.out.println("[OAuth2] WARNING: GitHub username만 전달 (access token 없음): " + githubUsername);
                }
            }

            String redirectUrl = builder.build(true).toUriString();
            response.sendRedirect(redirectUrl);
            return;
        }

        /*
         * ===============================
         * 기존 회원 → JWT 발급 후 메인으로
         * ===============================
         */

        // GitHub 로그인인 경우, access token 저장
        if ("github".equals(registrationId) && githubUsername != null) {
            try {
                OAuth2AuthorizedClient authorizedClient = authorizedClientService.loadAuthorizedClient(
                        registrationId, oauthToken.getName());
                if (authorizedClient != null && authorizedClient.getAccessToken() != null) {
                    String githubAccessToken = authorizedClient.getAccessToken().getTokenValue();
                    member.setGithubUsername(githubUsername);
                    member.setGithubAccessToken(githubAccessToken);
                    memberDao.updateGitHubConnection(member);
                    System.out.println("GitHub access token 저장 완료: " + githubUsername);
                }
            } catch (Exception e) {
                System.err.println("GitHub access token 저장 실패: " + e.getMessage());
            }
        }

        String accessToken = jwtTokenProvider.generateToken(member.getUserid(), member.getNo(), member.getName());

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString("http://localhost:3000/oauth2/redirect")
                .queryParam("token", accessToken)
                .queryParam("email", member.getEmail())
                .queryParam("name", UriUtils.encode(member.getName(), StandardCharsets.UTF_8))
                .queryParam("memberNo", member.getNo())
                .queryParam("provider", registrationId)
                .queryParam("isNewUser", false);

        // GitHub 연동 정보가 있으면 함께 전달
        if (member.getGithubUsername() != null && !member.getGithubUsername().isEmpty()) {
            builder.queryParam("githubUsername", member.getGithubUsername());
        }

        response.sendRedirect(builder.build(true).toUriString());
    }
}