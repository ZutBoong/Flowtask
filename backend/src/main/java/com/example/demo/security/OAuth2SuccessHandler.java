package com.example.demo.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;

    public OAuth2SuccessHandler(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        System.out.println("*** GOOGLE ATTRIBUTES: " + attributes);

        String email = (String) attributes.get("email");
        String name  = (String) attributes.get("name");

        if (email == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email not found from Google");
            return;
        }

        // userid 규칙
        String userid = "google_" + email;

        // 아직 DB 연동 전
        int memberNo = 0;

        // JWT 생성
        String accessToken = jwtTokenProvider.generateToken(userid, memberNo, name);

        System.out.println("JWT Token = " + accessToken);

        // ★★★ 가장 중요한 코드 — UTF-8로 안전하게 인코딩
        String redirectUrl = UriComponentsBuilder
                .fromUriString("http://localhost:3000/oauth2/redirect")
                .queryParam("token", accessToken)
                .queryParam("email", email)
                .queryParam("name", UriUtils.encode(name, StandardCharsets.UTF_8))
                .queryParam("memberNo", memberNo)
                .build(true) // <-- 🔥 반드시 true로 설정해야 UTF-8 인코딩됨!!
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
