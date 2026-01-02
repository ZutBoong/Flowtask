package com.example.demo.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.dao.MemberDao;
import com.example.demo.model.Member;

@Service
public class MemberService {

	private final MemberDao dao;
	private final PasswordEncoder passwordEncoder;

	@Value("${synodos.upload.path:uploads}")
	private String uploadPath;

	public MemberService(MemberDao dao, PasswordEncoder passwordEncoder) {
		this.dao = dao;
		this.passwordEncoder = passwordEncoder;
	}

	// 회원가입 (비밀번호 암호화)
	public int insert(Member member) {
		String encodedPassword = passwordEncoder.encode(member.getPassword());
		member.setPassword(encodedPassword);
		return dao.insert(member);
	}

	// 아이디 중복 체크
	public int checkUserid(String userid) {
		return dao.checkUserid(userid);
	}

	// 이메일 중복 체크
	public int checkEmail(String email) {
		return dao.checkEmail(email);
	}

	// 로그인 (기존 - 평문 비밀번호 비교)
	@Deprecated
	public Member login(Member member) {
		return dao.login(member);
	}

	// JWT 로그인 (BCrypt 비밀번호 검증)
	public Member authenticate(String userid, String rawPassword) {
		Member member = dao.findByUserid(userid);
		if (member != null && passwordEncoder.matches(rawPassword, member.getPassword())) {
			return member;
		}
		return null;
	}

	// userid로 회원 조회
	public Member findByUserid(String userid) {
		return dao.findByUserid(userid);
	}

	// 아이디 찾기
	public String findUserid(Member member) {
		return dao.findUserid(member);
	}

	// 비밀번호 찾기 전 회원 확인
	public Member findMemberForPassword(Member member) {
		return dao.findMemberForPassword(member);
	}

	// 비밀번호 변경 (암호화)
	public int updatePassword(Member member) {
		String encodedPassword = passwordEncoder.encode(member.getPassword());
		member.setPassword(encodedPassword);
		return dao.updatePassword(member);
	}

	// 회원번호로 회원 조회
	public Member findByNo(int no) {
		return dao.findByNo(no);
	}

	// 회원 정보 수정
	public int update(Member member) {
		return dao.update(member);
	}

	// 이메일 중복 체크 (본인 제외)
	public int checkEmailExcludeSelf(Member member) {
		return dao.checkEmailExcludeSelf(member);
	}

	// 현재 비밀번호 확인
	public boolean verifyPassword(int no, String rawPassword) {
		Member member = dao.findByNo(no);
		if (member != null) {
			return passwordEncoder.matches(rawPassword, member.getPassword());
		}
		return false;
	}

	// 아이디 또는 이메일로 회원 검색
	public Member findByUseridOrEmail(String keyword) {
		return dao.findByUseridOrEmail(keyword);
	}

	// 모든 회원 조회 (팀 생성 시 초대용)
	public java.util.List<Member> findAll() {
		java.util.List<Member> members = dao.findAll();
		// 비밀번호 제외
		members.forEach(member -> member.setPassword(null));
		return members;
	}

	// 이메일 변경
	public int updateEmail(Member member) {
		return dao.updateEmail(member);
	}

	// 회원 삭제
	public int delete(int no) {
		return dao.delete(no);
	}

	// 프로필 이미지 업로드
	public String uploadProfileImage(int memberNo, MultipartFile file) throws IOException {
		// 저장 경로 설정
		Path profileDir = Paths.get(uploadPath, "profiles");
		if (!Files.exists(profileDir)) {
			Files.createDirectories(profileDir);
		}

		// 기존 프로필 이미지 삭제
		Member member = dao.findByNo(memberNo);
		if (member != null && member.getProfileImage() != null) {
			try {
				Path oldFile = Paths.get(uploadPath, member.getProfileImage());
				Files.deleteIfExists(oldFile);
			} catch (Exception e) {
				// 기존 파일 삭제 실패해도 계속 진행
			}
		}

		// 새 파일명 생성 (UUID + 확장자)
		String originalFilename = file.getOriginalFilename();
		String extension = "";
		if (originalFilename != null && originalFilename.contains(".")) {
			extension = originalFilename.substring(originalFilename.lastIndexOf("."));
		}
		String storedFilename = UUID.randomUUID().toString() + extension;

		// 파일 저장
		Path filePath = profileDir.resolve(storedFilename);
		Files.copy(file.getInputStream(), filePath);

		// DB 업데이트 (상대 경로 저장)
		String relativePath = "profiles/" + storedFilename;
		Member updateMember = new Member();
		updateMember.setNo(memberNo);
		updateMember.setProfileImage(relativePath);
		dao.updateProfileImage(updateMember);

		return relativePath;
	}

	// 프로필 이미지 삭제
	public boolean deleteProfileImage(int memberNo) {
		Member member = dao.findByNo(memberNo);
		if (member != null && member.getProfileImage() != null) {
			try {
				Path filePath = Paths.get(uploadPath, member.getProfileImage());
				Files.deleteIfExists(filePath);
			} catch (Exception e) {
				// 파일 삭제 실패해도 DB 업데이트는 진행
			}

			// DB 업데이트 (null로 설정)
			Member updateMember = new Member();
			updateMember.setNo(memberNo);
			updateMember.setProfileImage(null);
			dao.updateProfileImage(updateMember);
			return true;
		}
		return false;
	}

	// 소셜 로그인 - provider + provider_id로 회원 조회
	public Member findByProviderAndProviderId(String provider, String providerId) {
		return dao.findByProviderAndProviderId(provider, providerId);
	}

	// GitHub 연동 정보 업데이트
	public int updateGitHubConnection(Member member) {
		return dao.updateGitHubConnection(member);
	}
}
