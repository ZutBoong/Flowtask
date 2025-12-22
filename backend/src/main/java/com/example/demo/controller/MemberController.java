package com.example.demo.controller;

import java.util.Map;
import java.util.HashMap;
import org.springframework.web.bind.annotation.*;
import com.example.demo.dto.AuthResponse;
import com.example.demo.model.Member;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.service.MemberService;
import com.example.demo.dao.TeamDao;

@RestController
@RequestMapping("/api")
public class MemberController {

	private final MemberService service;
	private final JwtTokenProvider jwtTokenProvider;
	private final TeamDao teamDao;

	public MemberController(MemberService service, JwtTokenProvider jwtTokenProvider, TeamDao teamDao) {
		this.service = service;
		this.jwtTokenProvider = jwtTokenProvider;
		this.teamDao = teamDao;
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
					authenticatedMember.isEmailVerified()
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

	// 회원 정보 수정 (마이페이지)
	@PutMapping("member/update")
	public Map<String, Object> updateProfile(@RequestBody Member member) {
		System.out.println("회원 정보 수정 요청: " + member);
		Map<String, Object> result = new HashMap<>();

		// 이메일 중복 체크 (본인 제외)
		int emailCount = service.checkEmailExcludeSelf(member);
		if (emailCount > 0) {
			result.put("success", false);
			result.put("message", "이미 사용 중인 이메일입니다.");
			return result;
		}

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
}
