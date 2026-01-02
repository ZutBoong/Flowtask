package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
	private boolean success;
	private String message;
	private String token;
	private MemberInfo member;

	@Data
	@AllArgsConstructor
	@NoArgsConstructor
	public static class MemberInfo {
		private int no;
		private String userid;
		private String name;
		private String email;
		private boolean emailVerified;
		private String githubUsername;  // GitHub 연동 정보
	}

	public static AuthResponse success(String token, int no, String userid, String name, String email, boolean emailVerified, String githubUsername) {
		return new AuthResponse(true, "로그인 성공", token, new MemberInfo(no, userid, name, email, emailVerified, githubUsername));
	}

	public static AuthResponse fail(String message) {
		return new AuthResponse(false, message, null, null);
	}
}
