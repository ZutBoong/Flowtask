package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dao.MemberDao;
import com.example.demo.model.Member;
import com.example.demo.service.EmailVerificationService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailVerificationController {

	@Autowired
	private EmailVerificationService emailVerificationService;

	@Autowired
	private MemberDao memberDao;

	@Value("${email.verification.resend.cooldown:60000}")
	private long resendCooldownMs;

	/**
	 * 회원가입용 인증 코드 발송
	 */
	@PostMapping("/send-code")
	public ResponseEntity<?> sendVerificationCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");

		if (email == null || email.isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
		}

		// 쿨다운 확인
		if (!emailVerificationService.canResend(email, "REGISTER", resendCooldownMs)) {
			return ResponseEntity.badRequest().body(Map.of("message", "잠시 후 다시 시도해주세요."));
		}

		try {
			emailVerificationService.sendVerificationCode(email, "REGISTER");
			return ResponseEntity.ok(Map.of("message", "인증 코드가 발송되었습니다."));
		} catch (Exception e) {
			return ResponseEntity.internalServerError().body(Map.of("message", "이메일 발송에 실패했습니다."));
		}
	}

	/**
	 * 인증 코드 확인
	 */
	@PostMapping("/verify-code")
	public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String code = request.get("code");
		String type = request.get("type");

		if (email == null || code == null) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", "이메일과 인증 코드를 입력해주세요."));
		}

		if (type == null) {
			type = "REGISTER";
		}

		boolean verified = emailVerificationService.verifyCode(email, code, type);

		if (verified) {
			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "이메일 인증이 완료되었습니다.");

			// PASSWORD_RESET인 경우 회원 정보 반환
			if ("PASSWORD_RESET".equals(type)) {
				Member member = memberDao.findByEmail(email);
				if (member != null) {
					response.put("memberNo", member.getNo());
				}
			}

			return ResponseEntity.ok(response);
		} else {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", "인증 코드가 올바르지 않거나 만료되었습니다."));
		}
	}

	/**
	 * 비밀번호 재설정용 인증 코드 발송
	 */
	@PostMapping("/send-reset-code")
	public ResponseEntity<?> sendPasswordResetCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");

		if (email == null || email.isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
		}

		// 회원 존재 여부 확인
		Member member = memberDao.findByEmail(email);
		if (member == null) {
			return ResponseEntity.badRequest().body(Map.of("message", "등록되지 않은 이메일입니다."));
		}

		// 쿨다운 확인
		if (!emailVerificationService.canResend(email, "PASSWORD_RESET", resendCooldownMs)) {
			return ResponseEntity.badRequest().body(Map.of("message", "잠시 후 다시 시도해주세요."));
		}

		try {
			emailVerificationService.sendVerificationCode(email, "PASSWORD_RESET");
			return ResponseEntity.ok(Map.of("message", "인증 코드가 발송되었습니다.", "userid", member.getUserid()));
		} catch (Exception e) {
			return ResponseEntity.internalServerError().body(Map.of("message", "이메일 발송에 실패했습니다."));
		}
	}

	/**
	 * 인증 코드 재발송
	 */
	@PostMapping("/resend-code")
	public ResponseEntity<?> resendCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String type = request.get("type");

		if (email == null || email.isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
		}

		if (type == null) {
			type = "REGISTER";
		}

		// 쿨다운 확인
		if (!emailVerificationService.canResend(email, type, resendCooldownMs)) {
			return ResponseEntity.badRequest().body(Map.of("message", "잠시 후 다시 시도해주세요."));
		}

		try {
			emailVerificationService.sendVerificationCode(email, type);
			return ResponseEntity.ok(Map.of("message", "인증 코드가 재발송되었습니다."));
		} catch (Exception e) {
			return ResponseEntity.internalServerError().body(Map.of("message", "이메일 발송에 실패했습니다."));
		}
	}

	/**
	 * 비밀번호 변경용 인증 코드 발송 (마이페이지)
	 */
	@PostMapping("/send-password-change-code")
	public ResponseEntity<?> sendPasswordChangeCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");

		if (email == null || email.isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해주세요."));
		}

		// 쿨다운 확인
		if (!emailVerificationService.canResend(email, "PASSWORD_CHANGE", resendCooldownMs)) {
			return ResponseEntity.badRequest().body(Map.of("message", "잠시 후 다시 시도해주세요."));
		}

		try {
			emailVerificationService.sendVerificationCode(email, "PASSWORD_CHANGE");
			return ResponseEntity.ok(Map.of("message", "인증 코드가 발송되었습니다."));
		} catch (Exception e) {
			return ResponseEntity.internalServerError().body(Map.of("message", "이메일 발송에 실패했습니다."));
		}
	}

	/**
	 * 이메일 변경용 인증 코드 발송 (새 이메일로)
	 */
	@PostMapping("/send-email-change-code")
	public ResponseEntity<?> sendEmailChangeCode(@RequestBody Map<String, String> request) {
		String newEmail = request.get("newEmail");

		if (newEmail == null || newEmail.isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("message", "새 이메일을 입력해주세요."));
		}

		// 이메일 중복 체크
		if (memberDao.findByEmail(newEmail) != null) {
			return ResponseEntity.badRequest().body(Map.of("message", "이미 사용 중인 이메일입니다."));
		}

		// 쿨다운 확인
		if (!emailVerificationService.canResend(newEmail, "EMAIL_CHANGE", resendCooldownMs)) {
			return ResponseEntity.badRequest().body(Map.of("message", "잠시 후 다시 시도해주세요."));
		}

		try {
			emailVerificationService.sendVerificationCode(newEmail, "EMAIL_CHANGE");
			return ResponseEntity.ok(Map.of("message", "새 이메일로 인증 코드가 발송되었습니다."));
		} catch (Exception e) {
			return ResponseEntity.internalServerError().body(Map.of("message", "이메일 발송에 실패했습니다."));
		}
	}
}
