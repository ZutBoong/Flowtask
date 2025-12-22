package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.Team;
import com.example.demo.model.TeamMember;

@Mapper
public interface TeamDao {
	// 팀 생성
	int insertTeam(Team team);
	
	// 팀 멤버 추가
	int insertMember(TeamMember member);
	
	// 팀 코드로 팀 조회
	Team findByCode(String teamCode);
	
	// 팀 ID로 팀 조회
	Team findById(int teamId);
	
	// 내가 속한 팀 목록
	List<Team> findMyTeams(int memberNo);
	
	// 팀 멤버 목록
	List<TeamMember> findMembers(int teamId);
	
	// 팀 멤버 여부 확인
	int isMember(TeamMember member);
	
	// 팀 멤버 삭제
	int deleteMember(TeamMember member);
	
	// 팀 삭제
	int deleteTeam(int teamId);
	
	// 팀 정보 수정
	int updateTeam(Team team);

	// 팀 설명 수정
	int updateDescription(Team team);

	// 팀 코드 재생성
	int updateTeamCode(Team team);

	// 회원이 리더인 팀 수 조회
	int countLeaderTeams(int memberNo);
}
