package com.example.demo.service;

import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TeamDao;
import com.example.demo.model.Team;
import com.example.demo.model.TeamMember;

@Service
public class TeamService {

	@Autowired
	private TeamDao dao;

	@Autowired
	private NotificationService notificationService;

	// 팀 생성
	public int createTeam(Team team) {
		// 팀 코드 자동 생성
		String code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
		team.setTeamCode(code);
		return dao.insertTeam(team);
	}

	// 팀 멤버 추가
	public int addMember(TeamMember member) {
		return dao.insertMember(member);
	}

	// 팀 멤버 추가 + 알림 발송
	public int addMemberWithNotification(TeamMember member, int inviterNo) {
		int result = dao.insertMember(member);
		if (result > 0) {
			Team team = dao.findById(member.getTeamId());
			if (team != null) {
				notificationService.notifyTeamInvite(
					member.getMemberNo(),
					inviterNo,
					team.getTeamId(),
					team.getTeamName()
				);
			}
		}
		return result;
	}

	// 팀 코드로 팀 조회
	public Team findByCode(String teamCode) {
		return dao.findByCode(teamCode);
	}

	// 팀 ID로 팀 조회
	public Team findById(int teamId) {
		return dao.findById(teamId);
	}

	// 내가 속한 팀 목록
	public List<Team> findMyTeams(int memberNo) {
		return dao.findMyTeams(memberNo);
	}

	// 팀 멤버 목록
	public List<TeamMember> findMembers(int teamId) {
		return dao.findMembers(teamId);
	}

	// 팀 멤버 여부 확인
	public boolean isMember(int teamId, int memberNo) {
		TeamMember member = new TeamMember();
		member.setTeamId(teamId);
		member.setMemberNo(memberNo);
		return dao.isMember(member) > 0;
	}

	// 팀 멤버 삭제 (탈퇴/강퇴)
	public int removeMember(TeamMember member) {
		return dao.deleteMember(member);
	}

	// 팀 삭제
	public int deleteTeam(int teamId) {
		return dao.deleteTeam(teamId);
	}

	// 팀 정보 수정
	public int updateTeam(Team team) {
		// GitHub 저장소 URL이 설정되면 Issue 동기화 자동 활성화
		if (team.getGithubRepoUrl() != null && !team.getGithubRepoUrl().trim().isEmpty()) {
			team.setGithubIssueSyncEnabled(true);
		} else {
			// URL이 비어있으면 동기화 비활성화
			team.setGithubIssueSyncEnabled(false);
		}
		return dao.updateTeam(team);
	}

	// 팀 설명 수정
	public int updateDescription(int teamId, String description) {
		Team team = new Team();
		team.setTeamId(teamId);
		team.setDescription(description);
		return dao.updateDescription(team);
	}

	// 팀 코드 재생성
	public String regenerateTeamCode(int teamId) {
		String newCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
		Team team = new Team();
		team.setTeamId(teamId);
		team.setTeamCode(newCode);
		dao.updateTeamCode(team);
		return newCode;
	}
}
