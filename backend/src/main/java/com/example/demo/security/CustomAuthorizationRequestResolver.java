package com.example.demo.security;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 소셜 로그인 시 항상 계정 선택 화면이 나오도록 하는 커스텀 Resolver
 */
public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final String AUTHORIZATION_REQUEST_BASE_URI = "/oauth2/authorization";
    private final DefaultOAuth2AuthorizationRequestResolver defaultResolver;

    public CustomAuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository, AUTHORIZATION_REQUEST_BASE_URI);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request);
        String registrationId = extractRegistrationId(request);
        return customizeAuthorizationRequest(authorizationRequest, registrationId);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request, clientRegistrationId);
        return customizeAuthorizationRequest(authorizationRequest, clientRegistrationId);
    }

    private String extractRegistrationId(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        if (requestUri.startsWith(AUTHORIZATION_REQUEST_BASE_URI + "/")) {
            return requestUri.substring(AUTHORIZATION_REQUEST_BASE_URI.length() + 1);
        }
        return null;
    }

    private OAuth2AuthorizationRequest customizeAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest, String registrationId) {
        if (authorizationRequest == null) {
            return null;
        }

        Map<String, Object> additionalParameters = new HashMap<>(authorizationRequest.getAdditionalParameters());

        // Google: prompt=select_account로 항상 계정 선택 화면 표시
        if ("google".equals(registrationId)) {
            additionalParameters.put("prompt", "select_account");
        }
        // Naver: auth_type=reauthenticate로 재인증 요청
        else if ("naver".equals(registrationId)) {
            additionalParameters.put("auth_type", "reauthenticate");
        }
        // Kakao: prompt=login으로 항상 로그인 화면 표시
        else if ("kakao".equals(registrationId)) {
            additionalParameters.put("prompt", "login");
        }

        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .additionalParameters(additionalParameters)
                .build();
    }
}
