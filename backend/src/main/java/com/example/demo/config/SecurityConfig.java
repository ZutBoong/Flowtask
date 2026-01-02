package com.example.demo.config;

import com.example.demo.security.CustomAuthorizationRequestResolver;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.security.OAuth2SuccessHandler;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    private final ClientRegistrationRepository clientRegistrationRepository;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            OAuth2SuccessHandler oAuth2SuccessHandler,
            ClientRegistrationRepository clientRegistrationRepository
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
        this.clientRegistrationRepository = clientRegistrationRepository;

    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            // 1️⃣ CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // 2️⃣ 기본 보안 비활성화
            .csrf(csrf -> csrf.disable())
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())

            // 3️⃣ 세션 사용 안 함 (JWT + OAuth2 공존)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )


            // 4️⃣ OAuth2 로그인 (exceptionHandling보다 먼저 설정)
            .oauth2Login(oauth -> oauth
                .authorizationEndpoint(authorization -> authorization
                    .authorizationRequestResolver(
                        new CustomAuthorizationRequestResolver(clientRegistrationRepository)
                    )
                )
                .successHandler(oAuth2SuccessHandler)
            )

            // 5️⃣ API 요청에 대해 401 반환 (OAuth 리다이렉트 방지)
            .exceptionHandling(exception -> exception
                // API 경로는 무조건 401 반환 (OAuth 리다이렉트 방지)
                .defaultAuthenticationEntryPointFor(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                    new AntPathRequestMatcher("/api/**")
                )
                // 그 외 경로는 OAuth2 로그인 페이지로 리다이렉트
                .authenticationEntryPoint((request, response, authException) -> {
                    response.sendRedirect("/oauth2/authorization/github");
                })
            )

            // 6️⃣ 인가 설정
            .authorizeHttpRequests(auth -> auth
                // OAuth2 관련 경로 (필수)
                .requestMatchers(
                    "/login/**",
                    "/oauth2/**"
                ).permitAll()


                // 회원 인증 관련 API (로그인, 회원가입 등)
                .requestMatchers(
                    "/api/member/login",
                    "/api/member/register",
                    "/api/member/social-register",
                    "/api/member/check-userid",
                    "/api/member/check-email",
                    "/api/member/find-userid",
                    "/api/member/find-password",
                    "/api/member/reset-password",
                    "/api/email/**"
                ).permitAll()

                // WebSocket
                .requestMatchers("/ws/**").permitAll()

                // 프로필 이미지 조회 (공개)
                .requestMatchers("/api/member/profile-image/**").permitAll()

                // GitHub OAuth (로그인용)
                .requestMatchers("/api/github/oauth/login/**").permitAll()

                // GitHub Webhook (인증 없이 접근 허용)
                .requestMatchers("/api/webhook/**").permitAll()

                // 그 외는 인증 필요
                .anyRequest().authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}