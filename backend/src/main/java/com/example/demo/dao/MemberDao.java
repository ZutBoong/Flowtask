package com.example.demo.dao;

import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.Member;

@Mapper
public interface MemberDao {
	// 회원가입
	int insert(Member member);

	// 아이디 중복 체크
	int checkUserid(String userid);

	// 이메일 중복 체크
	int checkEmail(String email);

	// 로그인 (기존)
	Member login(Member member);

	// userid로 회원 조회 (JWT 로그인용)
	Member findByUserid(String userid);

	// 아이디 찾기 (이름 + 이메일)
	String findUserid(Member member);

	// 비밀번호 찾기 전 회원 확인 (아이디 + 이메일)
	Member findMemberForPassword(Member member);

	// 비밀번호 변경
	int updatePassword(Member member);

	// 회원번호로 회원 조회
	Member findByNo(int no);

	// 회원 정보 수정
	int update(Member member);

	// 이메일 중복 체크 (본인 제외)
	int checkEmailExcludeSelf(Member member);

	// 아이디 또는 이메일로 회원 검색
	Member findByUseridOrEmail(String keyword);

	// 모든 회원 조회 (팀 생성 시 초대용)
	java.util.List<Member> findAll();

	// 이메일로 회원 조회
	Member findByEmail(String email);

	// 이메일 인증 완료 처리
	int updateEmailVerified(int no);

	// 이메일 변경
	int updateEmail(Member member);

	// 회원 삭제
	int delete(int no);

	// 프로필 이미지 업데이트
	int updateProfileImage(Member member);
}
