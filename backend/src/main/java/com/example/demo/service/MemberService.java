package com.example.demo.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.example.demo.dao.MemberDao;
import com.example.demo.model.Member;

@Service
public class MemberService {

	private final MemberDao dao;
	private final PasswordEncoder passwordEncoder;

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
}
