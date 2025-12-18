package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Team;
import com.example.demo.model.TeamMember;
import com.example.demo.service.TeamService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/team")
public class TeamController {

	@Autowired
	private TeamService service;

	// 팀 생성
	@PostMapping("/create")
	public Map<String, Object> createTeam(@RequestBody Team team) {
		System.out.println("팀 생성 요청: " + team);
		Map<String, Object> result = new HashMap<>();

		int insertResult = service.createTeam(team);
		if (insertResult == 1) {
			// 팀장을 멤버로 추가
			TeamMember leader = new TeamMember();
			leader.setTeamId(team.getTeamId());
			leader.setMemberNo(team.getLeaderNo());
			leader.setRole("LEADER");
			service.addMember(leader);

			result.put("success", true);
			result.put("message", "팀이 생성되었습니다.");
			result.put("teamCode", team.getTeamCode());
			result.put("teamId", team.getTeamId());
		} else {
			result.put("success", false);
			result.put("message", "팀 생성에 실패했습니다.");
		}
		return result;
	}

	// 팀 코드로 가입
	@PostMapping("/join")
	public Map<String, Object> joinTeam(@RequestBody Map<String, Object> request) {
		String teamCode = (String) request.get("teamCode");
		int memberNo = (int) request.get("memberNo");
		System.out.println("팀 가입 요청 - 코드: " + teamCode + ", 회원: " + memberNo);

		Map<String, Object> result = new HashMap<>();

		Team team = service.findByCode(teamCode);
		if (team == null) {
			result.put("success", false);
			result.put("message", "존재하지 않는 팀 코드입니다.");
			return result;
		}

		if (service.isMember(team.getTeamId(), memberNo)) {
			result.put("success", false);
			result.put("message", "이미 가입된 팀입니다.");
			return result;
		}

		TeamMember member = new TeamMember();
		member.setTeamId(team.getTeamId());
		member.setMemberNo(memberNo);
		member.setRole("MEMBER");

		int insertResult = service.addMember(member);
		if (insertResult == 1) {
			result.put("success", true);
			result.put("message", "팀에 가입되었습니다.");
			result.put("team", team);
		} else {
			result.put("success", false);
			result.put("message", "팀 가입에 실패했습니다.");
		}
		return result;
	}

	// 내 팀 목록
	@GetMapping("/my-teams/{memberNo}")
	public List<Team> getMyTeams(@PathVariable int memberNo) {
		System.out.println("내 팀 목록 조회: " + memberNo);
		return service.findMyTeams(memberNo);
	}

	// 팀 정보 조회
	@GetMapping("/{teamId}")
	public Team getTeam(@PathVariable int teamId) {
		System.out.println("팀 정보 조회: " + teamId);
		return service.findById(teamId);
	}

	// 팀 멤버 목록
	@GetMapping("/{teamId}/members")
	public List<TeamMember> getMembers(@PathVariable int teamId) {
		System.out.println("팀 멤버 목록: " + teamId);
		return service.findMembers(teamId);
	}

	// 팀 탈퇴
	@DeleteMapping("/{teamId}/leave/{memberNo}")
	public Map<String, Object> leaveTeam(@PathVariable int teamId, @PathVariable int memberNo) {
		System.out.println("팀 탈퇴: teamId=" + teamId + ", memberNo=" + memberNo);
		Map<String, Object> result = new HashMap<>();

		TeamMember member = new TeamMember();
		member.setTeamId(teamId);
		member.setMemberNo(memberNo);

		int deleteResult = service.removeMember(member);
		if (deleteResult == 1) {
			result.put("success", true);
			result.put("message", "팀에서 탈퇴했습니다.");
		} else {
			result.put("success", false);
			result.put("message", "팀 탈퇴에 실패했습니다.");
		}
		return result;
	}

	// 팀 삭제 (팀장만)
	@DeleteMapping("/{teamId}")
	public Map<String, Object> deleteTeam(@PathVariable int teamId) {
		System.out.println("팀 삭제: " + teamId);
		Map<String, Object> result = new HashMap<>();

		int deleteResult = service.deleteTeam(teamId);
		if (deleteResult == 1) {
			result.put("success", true);
			result.put("message", "팀이 삭제되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "팀 삭제에 실패했습니다.");
		}
		return result;
	}

	// 팀원 초대 (회원번호로 직접 추가)
	@PostMapping("/{teamId}/invite")
	public Map<String, Object> inviteMember(@PathVariable int teamId, @RequestBody Map<String, Object> request) {
		int memberNo = (int) request.get("memberNo");
		int leaderNo = (int) request.get("leaderNo");
		System.out.println("팀원 초대: teamId=" + teamId + ", memberNo=" + memberNo + ", leaderNo=" + leaderNo);

		Map<String, Object> result = new HashMap<>();

		// 팀 존재 확인
		Team team = service.findById(teamId);
		if (team == null) {
			result.put("success", false);
			result.put("message", "존재하지 않는 팀입니다.");
			return result;
		}

		// 팀장 권한 확인
		if (team.getLeaderNo() != leaderNo) {
			result.put("success", false);
			result.put("message", "팀장만 팀원을 초대할 수 있습니다.");
			return result;
		}

		// 이미 팀원인지 확인
		if (service.isMember(teamId, memberNo)) {
			result.put("success", false);
			result.put("message", "이미 팀에 가입된 회원입니다.");
			return result;
		}

		TeamMember member = new TeamMember();
		member.setTeamId(teamId);
		member.setMemberNo(memberNo);
		member.setRole("MEMBER");

		// 알림이 포함된 멤버 추가
		int insertResult = service.addMemberWithNotification(member, leaderNo);
		if (insertResult == 1) {
			result.put("success", true);
			result.put("message", "팀원이 초대되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "팀원 초대에 실패했습니다.");
		}
		return result;
	}

	// 팀원 강퇴 (팀장만)
	@DeleteMapping("/{teamId}/kick/{memberNo}")
	public Map<String, Object> kickMember(@PathVariable int teamId, @PathVariable int memberNo,
			@RequestParam int leaderNo) {
		System.out.println("팀원 강퇴: teamId=" + teamId + ", memberNo=" + memberNo + ", leaderNo=" + leaderNo);
		Map<String, Object> result = new HashMap<>();

		// 팀장 권한 확인
		Team team = service.findById(teamId);
		if (team == null) {
			result.put("success", false);
			result.put("message", "존재하지 않는 팀입니다.");
			return result;
		}

		if (team.getLeaderNo() != leaderNo) {
			result.put("success", false);
			result.put("message", "팀장만 팀원을 강퇴할 수 있습니다.");
			return result;
		}

		if (memberNo == leaderNo) {
			result.put("success", false);
			result.put("message", "자기 자신을 강퇴할 수 없습니다.");
			return result;
		}

		TeamMember member = new TeamMember();
		member.setTeamId(teamId);
		member.setMemberNo(memberNo);

		int deleteResult = service.removeMember(member);
		if (deleteResult == 1) {
			result.put("success", true);
			result.put("message", "팀원이 강퇴되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "팀원 강퇴에 실패했습니다.");
		}
		return result;
	}

	// 팀 설명 수정
	@PutMapping("/{teamId}/description")
	public Map<String, Object> updateDescription(@PathVariable int teamId, @RequestBody Map<String, String> request) {
		String description = request.get("description");
		System.out.println("팀 설명 수정: teamId=" + teamId);
		Map<String, Object> result = new HashMap<>();

		int updateResult = service.updateDescription(teamId, description);
		if (updateResult == 1) {
			result.put("success", true);
			result.put("message", "팀 설명이 수정되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "팀 설명 수정에 실패했습니다.");
		}
		return result;
	}

	// 팀 코드 재생성 (팀장만)
	@PostMapping("/{teamId}/regenerate-code")
	public Map<String, Object> regenerateTeamCode(@PathVariable int teamId, @RequestBody Map<String, Integer> request) {
		int leaderNo = request.get("leaderNo");
		System.out.println("팀 코드 재생성: teamId=" + teamId + ", leaderNo=" + leaderNo);
		Map<String, Object> result = new HashMap<>();

		// 팀장 권한 확인
		Team team = service.findById(teamId);
		if (team == null) {
			result.put("success", false);
			result.put("message", "존재하지 않는 팀입니다.");
			return result;
		}

		if (team.getLeaderNo() != leaderNo) {
			result.put("success", false);
			result.put("message", "팀장만 팀 코드를 재생성할 수 있습니다.");
			return result;
		}

		String newCode = service.regenerateTeamCode(teamId);
		result.put("success", true);
		result.put("message", "팀 코드가 재생성되었습니다.");
		result.put("teamCode", newCode);
		return result;
	}

	// 팀 정보 수정 (팀장만)
	@PutMapping("/{teamId}")
	public Map<String, Object> updateTeam(@PathVariable int teamId, @RequestBody Team team) {
		System.out.println("팀 정보 수정: teamId=" + teamId);
		Map<String, Object> result = new HashMap<>();

		team.setTeamId(teamId);
		int updateResult = service.updateTeam(team);
		if (updateResult == 1) {
			result.put("success", true);
			result.put("message", "팀 정보가 수정되었습니다.");
		} else {
			result.put("success", false);
			result.put("message", "팀 정보 수정에 실패했습니다.");
		}
		return result;
	}
}
