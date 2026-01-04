package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.example.demo.dao.MemberDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.model.Member;
import com.example.demo.model.Team;
import com.example.demo.model.TeamMember;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class TeamService {

	@Autowired
	private TeamDao dao;

	@Autowired
	private MemberDao memberDao;

	@Autowired
	private NotificationService notificationService;

	@Autowired
	private GitHubService gitHubService;

	@Value("${github.webhook.base-url:}")
	private String webhookBaseUrl;

	@Value("${github.webhook.secret:}")
	private String webhookSecret;

	// 팀 생성
	public int createTeam(Team team) {
		// 팀 코드 자동 생성
		String code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
		team.setTeamCode(code);
		// GitHub Issue 동기화 기본값 true
		if (team.getGithubIssueSyncEnabled() == null) {
			team.setGithubIssueSyncEnabled(true);
		}
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
		// GitHub 저장소 URL이 비어있으면 동기화 비활성화
		if (team.getGithubRepoUrl() == null || team.getGithubRepoUrl().trim().isEmpty()) {
			team.setGithubIssueSyncEnabled(false);
		}
		// URL이 있고 githubIssueSyncEnabled가 명시적으로 설정되지 않았으면 true로 설정
		else if (team.getGithubIssueSyncEnabled() == null) {
			team.setGithubIssueSyncEnabled(true);
		}
		// 그 외에는 전달된 값을 그대로 사용 (사용자가 on/off 토글한 값)
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

	/**
	 * 팀 생성 + GitHub 저장소 연동 (선택적)
	 * @param team 팀 정보
	 * @param githubRepoFullName GitHub 저장소 (owner/repo 형식, null 가능)
	 * @param webhookUrl Webhook URL (null이면 설정에서 가져옴)
	 * @return 생성 결과 맵 (teamCreated, teamId, teamCode, githubConnected, webhookCreated)
	 */
	public Map<String, Object> createTeamWithGitHub(Team team, String githubRepoFullName, String webhookUrl) {
		Map<String, Object> result = new HashMap<>();

		// 1. GitHub 저장소 URL 설정 (있는 경우)
		if (githubRepoFullName != null && !githubRepoFullName.trim().isEmpty()) {
			team.setGithubRepoUrl("https://github.com/" + githubRepoFullName);
		}
		// GitHub Issue 동기화 기본값 true
		if (team.getGithubIssueSyncEnabled() == null) {
			team.setGithubIssueSyncEnabled(true);
		}

		// 2. 팀 생성 (기존 로직)
		String code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
		team.setTeamCode(code);
		int insertResult = dao.insertTeam(team);

		if (insertResult != 1) {
			result.put("teamCreated", false);
			return result;
		}

		result.put("teamCreated", true);
		result.put("teamId", team.getTeamId());
		result.put("teamCode", code);
		result.put("githubConnected", false);
		result.put("webhookCreated", false);

		// 3. GitHub 연동 (저장소가 지정된 경우)
		if (githubRepoFullName != null && !githubRepoFullName.trim().isEmpty()) {
			result.put("githubConnected", true);

			// 팀장의 GitHub access token 조회
			Member leader = memberDao.findByNo(team.getLeaderNo());
			if (leader != null && leader.getGithubAccessToken() != null && !leader.getGithubAccessToken().isEmpty()) {
				// Webhook URL 결정
				String finalWebhookUrl = determineWebhookUrl(webhookUrl);

				if (finalWebhookUrl != null && !finalWebhookUrl.isEmpty()) {
					String[] parts = githubRepoFullName.split("/");
					if (parts.length == 2) {
						String owner = parts[0];
						String repo = parts[1];
						String accessToken = leader.getGithubAccessToken();

						// 기존 Synodos webhook 삭제
						try {
							var existingWebhooks = gitHubService.listWebhooks(accessToken, owner, repo);
							for (var hook : existingWebhooks) {
								if (hook.getUrl() != null && hook.getUrl().contains("/api/webhook/github")) {
									gitHubService.deleteWebhook(accessToken, owner, repo, hook.getId());
									log.info("Deleted existing Synodos webhook: {}", hook.getId());
								}
							}
						} catch (Exception e) {
							log.warn("Failed to check/delete existing webhooks: {}", e.getMessage());
						}

						// 새 Webhook 등록
						try {
							String webhookEndpoint = finalWebhookUrl + "/api/webhook/github";
							gitHubService.createWebhook(accessToken, owner, repo, webhookEndpoint, webhookSecret);
							result.put("webhookCreated", true);
							log.info("Webhook created for team {} with repo {}", team.getTeamId(), githubRepoFullName);
						} catch (Exception e) {
							log.warn("Webhook creation failed for team {}: {}", team.getTeamId(), e.getMessage());
							result.put("webhookCreated", false);
						}
					}
				}
			}
		}

		return result;
	}

	private String determineWebhookUrl(String requestWebhookUrl) {
		if (requestWebhookUrl != null && !requestWebhookUrl.trim().isEmpty()) {
			return requestWebhookUrl.trim();
		}
		if (webhookBaseUrl != null && !webhookBaseUrl.trim().isEmpty()) {
			return webhookBaseUrl.trim();
		}
		return null;
	}
}
