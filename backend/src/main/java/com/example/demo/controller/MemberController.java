package com.example.demo.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.dto.AuthResponse;
import com.example.demo.model.Member;
import com.example.demo.model.MemberSocialLink;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.service.MemberService;
import com.example.demo.dao.MemberSocialLinkDao;
import com.example.demo.dao.TeamDao;

@RestController
@RequestMapping("/api")
public class MemberController {

	private final MemberService service;
	private final JwtTokenProvider jwtTokenProvider;
	private final TeamDao teamDao;
	private final MemberSocialLinkDao socialLinkDao;

	@Value("${synodos.upload.path:uploads}")
	private String uploadPath;

	public MemberController(MemberService service, JwtTokenProvider jwtTokenProvider,
							TeamDao teamDao, MemberSocialLinkDao socialLinkDao) {
		this.service = service;
		this.jwtTokenProvider = jwtTokenProvider;
		this.teamDao = teamDao;
		this.socialLinkDao = socialLinkDao;
	}

	// 회원가입
	@PostMapping("member/register")
	public Map<String, Object> register(@RequestBody Member member) {
		System.out.println("회원가입 요청: " + member);
		Map<String, Object> result = new HashMap<>();

		int insertResult = service.insert(member);
		if (insertResult == 1) {
			System.out.println("회원가입 성공");
			result.put("success", true);
			result.put("message", "회원가입이 완료되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "회원가입에 실패했습니다.");
		}

		return result;
	}

	// 아이디 중복 체크
	@GetMapping("member/check-userid")
	public Map<String, Object> checkUserid(@RequestParam String userid) {
		System.out.println("아이디 중복 체크: " + userid);
		Map<String, Object> result = new HashMap<>();

		int count = service.checkUserid(userid);
		result.put("available", count == 0);
		result.put("message", count == 0 ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다.");

		return result;
	}

	// 이메일 중복 체크
	@GetMapping("member/check-email")
	public Map<String, Object> checkEmail(@RequestParam String email) {
		System.out.println("이메일 중복 체크: " + email);
		Map<String, Object> result = new HashMap<>();

		int count = service.checkEmail(email);
		result.put("available", count == 0);
		result.put("message", count == 0 ? "사용 가능한 이메일입니다." : "이미 사용 중인 이메일입니다.");

		return result;
	}

	// 로그인 (JWT 토큰 반환)
	@PostMapping("member/login")
	public AuthResponse login(@RequestBody Member member) {
		System.out.println("로그인 요청: " + member.getUserid());

		Member authenticatedMember = service.authenticate(member.getUserid(), member.getPassword());
		if (authenticatedMember != null) {
			System.out.println("로그인 성공: " + authenticatedMember.getName());
			String token = jwtTokenProvider.generateToken(
					authenticatedMember.getUserid(),
					authenticatedMember.getNo(),
					authenticatedMember.getName()
			);
			return AuthResponse.success(
					token,
					authenticatedMember.getNo(),
					authenticatedMember.getUserid(),
					authenticatedMember.getName(),
					authenticatedMember.getEmail(),
					authenticatedMember.isEmailVerified(),
					authenticatedMember.getGithubUsername()  // GitHub 연동 정보 포함
			);
		} else {
			return AuthResponse.fail("아이디 또는 비밀번호가 일치하지 않습니다.");
		}
	}

	// 아이디 찾기
	@PostMapping("member/find-userid")
	public Map<String, Object> findUserid(@RequestBody Member member) {
		System.out.println("아이디 찾기 요청 - 이름: " + member.getName() + ", 이메일: " + member.getEmail());
		Map<String, Object> result = new HashMap<>();

		String userid = service.findUserid(member);
		if (userid != null) {
			result.put("success", true);
			result.put("userid", userid);
			result.put("message", "아이디를 찾았습니다.");
		} else {
			result.put("success", false);
			result.put("message", "일치하는 회원 정보가 없습니다.");
		}

		return result;
	}

	// 비밀번호 찾기 (회원 확인)
	@PostMapping("member/find-password")
	public Map<String, Object> findPassword(@RequestBody Member member) {
		System.out.println("비밀번호 찾기 요청 - 아이디: " + member.getUserid() + ", 이메일: " + member.getEmail());
		Map<String, Object> result = new HashMap<>();

		Member foundMember = service.findMemberForPassword(member);
		if (foundMember != null) {
			result.put("success", true);
			result.put("message", "회원 확인 완료. 새 비밀번호를 설정해주세요.");
			result.put("memberNo", foundMember.getNo());
		} else {
			result.put("success", false);
			result.put("message", "일치하는 회원 정보가 없습니다.");
		}

		return result;
	}

	// 비밀번호 변경
	@PutMapping("member/reset-password")
	public Map<String, Object> resetPassword(@RequestBody Member member) {
		System.out.println("비밀번호 변경 요청 - no: " + member.getNo());
		Map<String, Object> result = new HashMap<>();

		int updateResult = service.updatePassword(member);
		if (updateResult == 1) {
			result.put("success", true);
			result.put("message", "비밀번호가 변경되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "비밀번호 변경에 실패했습니다.");
		}

		return result;
	}

	// 회원 정보 조회 (마이페이지)
	@GetMapping("member/profile/{no}")
	public Map<String, Object> getProfile(@PathVariable int no) {
		System.out.println("회원 정보 조회: " + no);
		Map<String, Object> result = new HashMap<>();

		Member member = service.findByNo(no);
		if (member != null) {
			member.setPassword(null); // 비밀번호 제외
			result.put("success", true);
			result.put("member", member);
		} else {
			result.put("success", false);
			result.put("message", "회원 정보를 찾을 수 없습니다.");
		}

		return result;
	}

	// 회원 정보 수정 (마이페이지) - 이름, 전화번호만 수정 (이메일은 별도)
	@PutMapping("member/update")
	public Map<String, Object> updateProfile(@RequestBody Member member) {
		System.out.println("회원 정보 수정 요청: " + member);
		Map<String, Object> result = new HashMap<>();

		int updateResult = service.update(member);
		if (updateResult == 1) {
			Member updatedMember = service.findByNo(member.getNo());
			updatedMember.setPassword(null);
			result.put("success", true);
			result.put("message", "회원 정보가 수정되었습니다.");
			result.put("member", updatedMember);
		} else {
			result.put("success", false);
			result.put("message", "회원 정보 수정에 실패했습니다.");
		}

		return result;
	}

	// 비밀번호 변경 (마이페이지 - 현재 비밀번호 확인)
	@PutMapping("member/change-password")
	public Map<String, Object> changePassword(@RequestBody Map<String, Object> request) {
		int no = (Integer) request.get("no");
		String currentPassword = (String) request.get("currentPassword");
		String newPassword = (String) request.get("newPassword");

		System.out.println("비밀번호 변경 요청 (마이페이지) - no: " + no);
		Map<String, Object> result = new HashMap<>();

		// 현재 비밀번호 확인
		if (!service.verifyPassword(no, currentPassword)) {
			result.put("success", false);
			result.put("message", "현재 비밀번호가 일치하지 않습니다.");
			return result;
		}

		Member member = new Member();
		member.setNo(no);
		member.setPassword(newPassword);

		int updateResult = service.updatePassword(member);
		if (updateResult == 1) {
			result.put("success", true);
			result.put("message", "비밀번호가 변경되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "비밀번호 변경에 실패했습니다.");
		}

		return result;
	}

	// 아이디 또는 이메일로 회원 검색 (팀 초대용)
	@GetMapping("member/search")
	public Map<String, Object> searchMember(@RequestParam String keyword) {
		System.out.println("회원 검색: " + keyword);
		Map<String, Object> result = new HashMap<>();

		Member member = service.findByUseridOrEmail(keyword);
		if (member != null) {
			member.setPassword(null); // 비밀번호 제외
			result.put("success", true);
			result.put("member", member);
		} else {
			result.put("success", false);
			result.put("message", "해당 아이디 또는 이메일을 가진 회원이 없습니다.");
		}

		return result;
	}

	// 모든 회원 조회 (팀 생성 시 초대용)
	@GetMapping("member/all")
	public java.util.List<Member> getAllMembers() {
		System.out.println("모든 회원 목록 조회");
		return service.findAll();
	}

	// 회원 탈퇴
	@DeleteMapping("member/delete/{no}")
	public Map<String, Object> deleteMember(@PathVariable int no) {
		System.out.println("회원 탈퇴 요청 - no: " + no);
		Map<String, Object> result = new HashMap<>();

		// 팀 리더인지 확인
		int leaderCount = teamDao.countLeaderTeams(no);
		if (leaderCount > 0) {
			result.put("success", false);
			result.put("message", "팀 리더로 있는 팀이 있습니다. 팀을 삭제하거나 리더를 위임한 후 탈퇴해주세요.");
			return result;
		}

		int deleteResult = service.delete(no);
		if (deleteResult == 1) {
			result.put("success", true);
			result.put("message", "회원 탈퇴가 완료되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "회원 탈퇴에 실패했습니다.");
		}

		return result;
	}

	// 이메일 변경 (인증 완료 후)
	@PutMapping("member/change-email")
	public Map<String, Object> changeEmail(@RequestBody Map<String, Object> request) {
		int no = (Integer) request.get("no");
		String newEmail = (String) request.get("newEmail");

		System.out.println("이메일 변경 요청 - no: " + no + ", newEmail: " + newEmail);
		Map<String, Object> result = new HashMap<>();

		// 이메일 중복 체크
		int emailCount = service.checkEmail(newEmail);
		if (emailCount > 0) {
			result.put("success", false);
			result.put("message", "이미 사용 중인 이메일입니다.");
			return result;
		}

		Member member = new Member();
		member.setNo(no);
		member.setEmail(newEmail);

		int updateResult = service.updateEmail(member);
		if (updateResult == 1) {
			Member updatedMember = service.findByNo(no);
			updatedMember.setPassword(null);
			result.put("success", true);
			result.put("message", "이메일이 변경되었습니다.");
			result.put("member", updatedMember);
		} else {
			result.put("success", false);
			result.put("message", "이메일 변경에 실패했습니다.");
		}

		return result;
	}

	// 비밀번호 변경 (이메일 인증 완료 후)
	@PutMapping("member/change-password-verified")
	public Map<String, Object> changePasswordVerified(@RequestBody Map<String, Object> request) {
		int no = (Integer) request.get("no");
		String newPassword = (String) request.get("newPassword");

		System.out.println("비밀번호 변경 요청 (인증 완료) - no: " + no);
		Map<String, Object> result = new HashMap<>();

		Member member = new Member();
		member.setNo(no);
		member.setPassword(newPassword);

		int updateResult = service.updatePassword(member);
		if (updateResult == 1) {
			result.put("success", true);
			result.put("message", "비밀번호가 변경되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "비밀번호 변경에 실패했습니다.");
		}

		return result;
	}

	// 프로필 이미지 업로드
	@PostMapping("member/profile-image/upload")
	public Map<String, Object> uploadProfileImage(
			@RequestParam("file") MultipartFile file,
			@RequestParam("memberNo") int memberNo) {
		System.out.println("프로필 이미지 업로드 요청 - memberNo: " + memberNo);
		Map<String, Object> result = new HashMap<>();

		// 파일 타입 검증
		String contentType = file.getContentType();
		if (contentType == null || !contentType.startsWith("image/")) {
			result.put("success", false);
			result.put("message", "이미지 파일만 업로드 가능합니다.");
			return result;
		}

		// 파일 크기 검증 (5MB)
		if (file.getSize() > 5 * 1024 * 1024) {
			result.put("success", false);
			result.put("message", "파일 크기는 5MB 이하만 가능합니다.");
			return result;
		}

		try {
			String profileImagePath = service.uploadProfileImage(memberNo, file);
			Member updatedMember = service.findByNo(memberNo);
			updatedMember.setPassword(null);

			result.put("success", true);
			result.put("message", "프로필 이미지가 업로드되었습니다.");
			result.put("profileImage", profileImagePath);
			result.put("member", updatedMember);
		} catch (IOException e) {
			System.err.println("프로필 이미지 업로드 실패: " + e.getMessage());
			result.put("success", false);
			result.put("message", "파일 업로드에 실패했습니다.");
		}

		return result;
	}

	// 프로필 이미지 조회 (다운로드)
	@GetMapping("member/profile-image/{memberNo}")
	public ResponseEntity<Resource> getProfileImage(@PathVariable int memberNo) {
		try {
			Member member = service.findByNo(memberNo);
			if (member == null || member.getProfileImage() == null) {
				return ResponseEntity.notFound().build();
			}

			Path filePath = Paths.get(uploadPath, member.getProfileImage());
			if (!Files.exists(filePath)) {
				return ResponseEntity.notFound().build();
			}

			Resource resource = new UrlResource(filePath.toUri());
			String contentType = Files.probeContentType(filePath);
			if (contentType == null) {
				contentType = "application/octet-stream";
			}

			return ResponseEntity.ok()
					.contentType(MediaType.parseMediaType(contentType))
					.header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
					.body(resource);
		} catch (Exception e) {
			System.err.println("프로필 이미지 조회 실패: " + e.getMessage());
			return ResponseEntity.notFound().build();
		}
	}

	// 프로필 이미지 삭제
	@DeleteMapping("member/profile-image/{memberNo}")
	public Map<String, Object> deleteProfileImage(@PathVariable int memberNo) {
		System.out.println("프로필 이미지 삭제 요청 - memberNo: " + memberNo);
		Map<String, Object> result = new HashMap<>();

		boolean deleted = service.deleteProfileImage(memberNo);
		if (deleted) {
			Member updatedMember = service.findByNo(memberNo);
			updatedMember.setPassword(null);

			result.put("success", true);
			result.put("message", "프로필 이미지가 삭제되었습니다.");
			result.put("member", updatedMember);
		} else {
			result.put("success", false);
			result.put("message", "삭제할 프로필 이미지가 없습니다.");
		}

		return result;
	}

	// 소셜 회원가입 (신규 가입)
	@PostMapping("member/social-register")
	public Map<String, Object> socialRegister(@RequestBody Map<String, Object> request) {
		String userid = (String) request.get("userid");
		String email = (String) request.get("email");
		String phone = (String) request.get("phone");
		String name = (String) request.get("name");
		String provider = (String) request.get("provider");
		String providerId = (String) request.get("providerId");

		System.out.println("소셜 회원가입 - userid: " + userid + ", email: " + email + ", provider: " + provider);
		Map<String, Object> result = new HashMap<>();

		// 아이디 중복 체크
		int useridCount = service.checkUserid(userid);
		if (useridCount > 0) {
			result.put("success", false);
			result.put("message", "이미 사용 중인 아이디입니다.");
			return result;
		}

		// 이메일 중복 체크
		int emailCount = service.checkEmail(email);
		if (emailCount > 0) {
			result.put("success", false);
			result.put("message", "이미 사용 중인 이메일입니다.");
			return result;
		}

		// 이미 가입된 소셜 계정인지 체크
		Member existingMember = service.findByProviderAndProviderId(provider, providerId);
		if (existingMember != null) {
			result.put("success", false);
			result.put("message", "이미 가입된 계정입니다.");
			return result;
		}

		// 회원 생성
		Member member = new Member();
		member.setUserid(userid);
		member.setPassword(java.util.UUID.randomUUID().toString()); // 소셜 로그인은 비밀번호 불필요
		member.setName(name);
		member.setEmail(email);
		member.setPhone(phone);
		member.setEmailVerified(true); // 소셜 로그인은 이메일 인증 완료로 처리
		member.setProvider(provider);
		member.setProviderId(providerId);

		int insertResult = service.insert(member);
		if (insertResult == 1) {
			// 가입 후 조회
			Member registeredMember = service.findByProviderAndProviderId(provider, providerId);
			registeredMember.setPassword(null);

			// JWT 토큰 발급
			String token = jwtTokenProvider.generateToken(
					registeredMember.getUserid(),
					registeredMember.getNo(),
					registeredMember.getName()
			);

			result.put("success", true);
			result.put("message", "회원가입이 완료되었습니다.");
			result.put("member", registeredMember);
			result.put("token", token);
		} else {
			result.put("success", false);
			result.put("message", "회원가입에 실패했습니다.");
		}

		return result;
	}

	// ==========================================
	// 소셜 계정 연동 API
	// ==========================================

	// 소셜 연동 목록 조회
	@GetMapping("member/social-links/{memberNo}")
	public Map<String, Object> getSocialLinks(@PathVariable int memberNo) {
		Map<String, Object> result = new HashMap<>();

		List<MemberSocialLink> links = socialLinkDao.findByMemberNo(memberNo);

		// 기본 가입 방식 조회
		Member member = service.findByNo(memberNo);
		String primaryProvider = member != null ? member.getProvider() : null;

		result.put("success", true);
		result.put("links", links);
		result.put("primaryProvider", primaryProvider); // 최초 가입 방식

		return result;
	}

	// 소셜 계정 연동
	@PostMapping("member/social-link")
	public Map<String, Object> linkSocialAccount(@RequestBody Map<String, Object> request) {
		int memberNo = (Integer) request.get("memberNo");
		String provider = (String) request.get("provider");
		String providerId = (String) request.get("providerId");
		String email = (String) request.get("email");
		String name = (String) request.get("name");
		// GitHub 연동 시 추가 파라미터
		String githubUsername = (String) request.get("githubUsername");
		String githubAccessToken = (String) request.get("githubAccessToken");

		System.out.println("[Social Link] 요청 - memberNo: " + memberNo + ", provider: " + provider);
		System.out.println("[Social Link] GitHub - username: " + githubUsername +
			", accessToken: " + (githubAccessToken != null ? "있음 (길이: " + githubAccessToken.length() + ")" : "없음"));
		Map<String, Object> result = new HashMap<>();

		// 이미 다른 계정에 연동된 소셜 계정인지 확인
		MemberSocialLink existingLink = socialLinkDao.findByProviderAndProviderId(provider, providerId);
		if (existingLink != null) {
			result.put("success", false);
			result.put("message", "이미 다른 계정에 연동된 소셜 계정입니다.");
			return result;
		}

		// 이미 해당 provider로 연동되어 있는지 확인
		MemberSocialLink myLink = socialLinkDao.findByMemberNoAndProvider(memberNo, provider);
		if (myLink != null) {
			result.put("success", false);
			result.put("message", "이미 " + provider + " 계정이 연동되어 있습니다.");
			return result;
		}

		// 연동 추가
		MemberSocialLink link = new MemberSocialLink();
		link.setMemberNo(memberNo);
		link.setProvider(provider);
		link.setProviderId(providerId);
		link.setEmail(email);
		link.setName(name);

		int insertResult = socialLinkDao.insert(link);
		if (insertResult == 1) {
			// GitHub 연동인 경우, member 테이블의 github_username, github_access_token도 저장
			if ("github".equals(provider) && githubUsername != null && githubAccessToken != null) {
				try {
					Member member = service.findByNo(memberNo);
					if (member != null) {
						member.setGithubUsername(githubUsername);
						member.setGithubAccessToken(githubAccessToken);
						service.updateGitHubConnection(member);
						System.out.println("GitHub credentials 저장 완료: " + githubUsername);
					}
				} catch (Exception e) {
					System.err.println("GitHub credentials 저장 실패: " + e.getMessage());
				}
			}

			List<MemberSocialLink> links = socialLinkDao.findByMemberNo(memberNo);
			result.put("success", true);
			result.put("message", provider + " 계정이 연동되었습니다.");
			result.put("links", links);
		} else {
			result.put("success", false);
			result.put("message", "연동에 실패했습니다.");
		}

		return result;
	}

	// 소셜 계정 연동 해제
	@DeleteMapping("member/social-link/{memberNo}/{provider}")
	public Map<String, Object> unlinkSocialAccount(@PathVariable int memberNo, @PathVariable String provider) {
		System.out.println("소셜 연동 해제 요청 - memberNo: " + memberNo + ", provider: " + provider);
		Map<String, Object> result = new HashMap<>();

		// 최초 가입 방식과 동일한 provider는 해제 불가
		Member member = service.findByNo(memberNo);
		if (member != null && provider.equals(member.getProvider())) {
			result.put("success", false);
			result.put("message", "가입 시 사용한 소셜 계정은 연동 해제할 수 없습니다.");
			return result;
		}

		int deleteResult = socialLinkDao.delete(memberNo, provider);
		if (deleteResult == 1) {
			List<MemberSocialLink> links = socialLinkDao.findByMemberNo(memberNo);
			result.put("success", true);
			result.put("message", provider + " 계정 연동이 해제되었습니다.");
			result.put("links", links);
		} else {
			result.put("success", false);
			result.put("message", "연동 해제에 실패했습니다.");
		}

		return result;
	}
}
