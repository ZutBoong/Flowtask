package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Random;

@Slf4j
@Service
public class EmailService {

	@Autowired
	private JavaMailSender mailSender;

	@Value("${email.environment:dev}")
	private String environment;

	@Value("${spring.mail.username:}")
	private String sender;

	/**
	 * 6자리 인증 코드 생성
	 */
	public String generateVerificationCode() {
		Random random = new Random();
		int code = 100000 + random.nextInt(900000);
		return String.valueOf(code);
	}

	/**
	 * 인증 이메일 발송
	 * @param to 수신자 이메일
	 * @param code 인증 코드
	 * @param type REGISTER, PASSWORD_RESET, PASSWORD_CHANGE, EMAIL_CHANGE
	 */
	public void sendVerificationEmail(String to, String code, String type) {
		String subject;
		String body;

		switch (type) {
			case "REGISTER":
				subject = "[Flowtask] 회원가입 이메일 인증";
				body = buildRegisterEmailBody(code);
				break;
			case "PASSWORD_CHANGE":
				subject = "[Flowtask] 비밀번호 변경 인증";
				body = buildPasswordChangeEmailBody(code);
				break;
			case "EMAIL_CHANGE":
				subject = "[Flowtask] 이메일 변경 인증";
				body = buildEmailChangeEmailBody(code);
				break;
			default:
				subject = "[Flowtask] 비밀번호 재설정 인증";
				body = buildPasswordResetEmailBody(code);
		}

		if ("dev".equals(environment)) {
			// 개발 환경: 콘솔에 출력
			log.info("========================================");
			log.info("EMAIL VERIFICATION CODE");
			log.info("To: {}", to);
			log.info("Type: {}", type);
			log.info("Code: {}", code);
			log.info("========================================");
		} else {
			// 프로덕션 환경: SMTP로 발송
			sendEmailViaSMTP(to, subject, body);
		}
	}

	/**
	 * SMTP를 통한 이메일 발송
	 */
	private void sendEmailViaSMTP(String to, String subject, String body) {
		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

			helper.setFrom(sender);
			helper.setTo(to);
			helper.setSubject(subject);
			helper.setText(body, true); // true = HTML

			mailSender.send(message);
			log.info("Email sent successfully to: {}", to);
		} catch (MessagingException e) {
			log.error("Failed to send email to {}: {}", to, e.getMessage());
			throw new RuntimeException("이메일 발송에 실패했습니다.", e);
		}
	}

	/**
	 * 회원가입 인증 이메일 본문 생성
	 */
	private String buildRegisterEmailBody(String code) {
		return """
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: 'Malgun Gothic', sans-serif; background-color: #f8fafc; padding: 20px; }
					.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
					.header { text-align: center; margin-bottom: 30px; }
					.logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
					.code-box { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
					.message { color: #64748b; text-align: center; line-height: 1.6; }
					.footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="logo">Flowtask</div>
					</div>
					<p class="message">회원가입을 위한 이메일 인증 코드입니다.<br>아래 코드를 입력해주세요.</p>
					<div class="code-box">%s</div>
					<p class="message">이 코드는 5분간 유효합니다.</p>
					<div class="footer">
						본 메일은 Flowtask 회원가입 요청에 의해 발송되었습니다.<br>
						본인이 요청하지 않았다면 이 메일을 무시해주세요.
					</div>
				</div>
			</body>
			</html>
			""".formatted(code);
	}

	/**
	 * 비밀번호 재설정 인증 이메일 본문 생성
	 */
	private String buildPasswordResetEmailBody(String code) {
		return """
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: 'Malgun Gothic', sans-serif; background-color: #f8fafc; padding: 20px; }
					.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
					.header { text-align: center; margin-bottom: 30px; }
					.logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
					.code-box { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
					.message { color: #64748b; text-align: center; line-height: 1.6; }
					.footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="logo">Flowtask</div>
					</div>
					<p class="message">비밀번호 재설정을 위한 인증 코드입니다.<br>아래 코드를 입력해주세요.</p>
					<div class="code-box">%s</div>
					<p class="message">이 코드는 5분간 유효합니다.</p>
					<div class="footer">
						본 메일은 Flowtask 비밀번호 재설정 요청에 의해 발송되었습니다.<br>
						본인이 요청하지 않았다면 이 메일을 무시해주세요.
					</div>
				</div>
			</body>
			</html>
			""".formatted(code);
	}

	/**
	 * 비밀번호 변경 인증 이메일 본문 생성
	 */
	private String buildPasswordChangeEmailBody(String code) {
		return """
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: 'Malgun Gothic', sans-serif; background-color: #f8fafc; padding: 20px; }
					.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
					.header { text-align: center; margin-bottom: 30px; }
					.logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
					.code-box { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
					.message { color: #64748b; text-align: center; line-height: 1.6; }
					.footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="logo">Flowtask</div>
					</div>
					<p class="message">비밀번호 변경을 위한 인증 코드입니다.<br>아래 코드를 입력해주세요.</p>
					<div class="code-box">%s</div>
					<p class="message">이 코드는 5분간 유효합니다.</p>
					<div class="footer">
						본 메일은 Flowtask 비밀번호 변경 요청에 의해 발송되었습니다.<br>
						본인이 요청하지 않았다면 즉시 비밀번호를 변경해주세요.
					</div>
				</div>
			</body>
			</html>
			""".formatted(code);
	}

	/**
	 * 이메일 변경 인증 이메일 본문 생성
	 */
	private String buildEmailChangeEmailBody(String code) {
		return """
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: 'Malgun Gothic', sans-serif; background-color: #f8fafc; padding: 20px; }
					.container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
					.header { text-align: center; margin-bottom: 30px; }
					.logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
					.code-box { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
					.message { color: #64748b; text-align: center; line-height: 1.6; }
					.footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="logo">Flowtask</div>
					</div>
					<p class="message">이메일 변경을 위한 인증 코드입니다.<br>아래 코드를 입력해주세요.</p>
					<div class="code-box">%s</div>
					<p class="message">이 코드는 5분간 유효합니다.</p>
					<div class="footer">
						본 메일은 Flowtask 이메일 변경 요청에 의해 발송되었습니다.<br>
						본인이 요청하지 않았다면 이 메일을 무시해주세요.
					</div>
				</div>
			</body>
			</html>
			""".formatted(code);
	}
}
