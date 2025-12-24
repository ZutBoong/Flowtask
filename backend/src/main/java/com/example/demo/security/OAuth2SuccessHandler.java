package com.example.demo.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import com.example.demo.dao.MemberDao;
import com.example.demo.model.Member;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final MemberDao memberDao;

    public OAuth2SuccessHandler(
            JwtTokenProvider jwtTokenProvider,
            MemberDao memberDao) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.memberDao = memberDao;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        System.out.println("=== OAuth2SuccessHandler 진입 ===");

        // 어떤 provider로 로그인했는지 확인
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;

        String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        System.out.println("로그인 provider = " + registrationId);

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        System.out.println("*** GOOGLE ATTRIBUTES: " + attributes);

        String email;
        String name;
        String userid;

        /*
         * ===============================
         * GOOGLE LOGIN
         * ===============================
         */
        if ("google".equals(registrationId)) {

            email = (String) attributes.get("email");
            name = (String) attributes.get("name");

            userid = "google_" + email;
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
                response.sendError(
                        HttpServletResponse.SC_BAD_REQUEST,
                        "Naver response is missing");
                return;
            }

            email = (String) responseMap.get("email");
            name = (String) responseMap.get("name");
            String providerId = (String) responseMap.get("id");

            userid = "naver_" + providerId;
        }

        /*
        * 작성자: 홍진기
        * ===============================
        * KAKAO LOGIN
        * ===============================
        */
        else if ("kakao".equals(registrationId)) {

            // kakao_account에 실제 정보가 들어 있음
            @SuppressWarnings("unchecked")
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");

            if (kakaoAccount == null) {
                response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Kakao account information is missing.");
                return;
            }

            email = (String) kakaoAccount.get("email");

            // profile 정보 안에 name(=nickname)이 존재
            @SuppressWarnings("unchecked")
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

            if (profile != null) {
                name = (String) profile.get("nickname");
            } else {
                name = null;
            }

            // provider 고유 ID는 attributes.get("id")
            String providerId = String.valueOf(attributes.get("id"));

            userid = "kakao_" + providerId;
        }

        /*
         * ===============================
         * UNSUPPORTED PROVIDER
         * ===============================
         */
        else {
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Unsupported provider: " + registrationId);
            return;
        }

        /*
         * ===============================
         * 공동 검증
         * ===============================
         */
        if (email == null || email.isBlank()) {
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Email not provided from " + registrationId);
            return;
        }

        if (name == null || name.isBlank()) {
            name = email.split("@")[0]; // fallback name
        }

        /*
         * ===============================
         * DB 회원 조회 / 가입
         * ===============================
         */
        Member member = memberDao.findByEmail(email);

        if (member == null) {
            Member newMember = new Member();

            newMember.setUserid(userid);
            newMember.setPassword(UUID.randomUUID().toString());
            newMember.setName(name);
            newMember.setEmail(email);
            newMember.setPhone(null);
            newMember.setEmailVerified(true);

            memberDao.insert(newMember);

            // PostgreSQL sequence 사용 → 다시 조회
            member = memberDao.findByEmail(email);
        }

        int memberNo = member.getNo();

        /*
         * ===============================
         * JWT GENERATION
         * ===============================
         */
        String accessToken = jwtTokenProvider.generateToken(userid, memberNo, name);

        System.out.println("JWT Token = " + accessToken);

        /*
         * ===============================
         * REDIRECT TO FRONTEND
         * ===============================
         */
        String redirectUrl = UriComponentsBuilder
                .fromUriString("http://localhost:3000/oauth2/redirect")
                .queryParam("token", accessToken)
                .queryParam("email", email)
                .queryParam("name", UriUtils.encode(name, StandardCharsets.UTF_8))
                .queryParam("memberNo", memberNo)
                .queryParam("provider", registrationId)
                .build(true) // ★ UTF-8 인코딩 필수
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}