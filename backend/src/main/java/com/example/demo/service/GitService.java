package com.example.demo.service;

import java.sql.Date;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.example.demo.dao.GitRepoDao;
import com.example.demo.dao.TaskCommitDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.model.GitRepo;
import com.example.demo.model.Task;
import com.example.demo.model.TaskCommit;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GitService {

	@Autowired
	private GitRepoDao gitRepoDao;

	@Autowired
	private TaskCommitDao taskCommitDao;

	@Autowired
	private TaskDao taskDao;

	private final RestTemplate restTemplate = new RestTemplate();
	private final ObjectMapper objectMapper = new ObjectMapper();

	// 이슈 번호 패턴 (#123, #FLOW-123 등)
	private static final Pattern ISSUE_PATTERN = Pattern.compile("#(\\d+)");

	// 저장소 연결
	public GitRepo connectRepo(GitRepo repo) {
		// 기존 연결이 있으면 삭제
		GitRepo existing = gitRepoDao.getByTeamId(repo.getTeamId());
		if (existing != null) {
			gitRepoDao.delete(existing.getRepoId());
		}

		int result = gitRepoDao.insert(repo);
		if (result == 1) {
			return gitRepoDao.getById(repo.getRepoId());
		}
		return null;
	}

	// 팀 저장소 조회
	public GitRepo getRepoByTeamId(int teamId) {
		return gitRepoDao.getByTeamId(teamId);
	}

	// 저장소 연결 해제
	public int disconnectRepo(int repoId) {
		return gitRepoDao.delete(repoId);
	}

	// 연결 테스트
	public boolean testConnection(GitRepo repo) {
		try {
			String url = String.format("https://api.github.com/repos/%s/%s",
					repo.getRepoOwner(), repo.getRepoName());

			HttpHeaders headers = createHeaders(repo.getAccessToken());
			HttpEntity<String> entity = new HttpEntity<>(headers);

			ResponseEntity<String> response = restTemplate.exchange(
					url, HttpMethod.GET, entity, String.class);

			return response.getStatusCode().is2xxSuccessful();
		} catch (Exception e) {
			System.err.println("GitHub connection test failed: " + e.getMessage());
			return false;
		}
	}

	// 커밋 동기화 (최근 100개)
	public int syncCommits(int teamId) {
		GitRepo repo = gitRepoDao.getByTeamId(teamId);
		if (repo == null) {
			return 0;
		}

		try {
			String url = String.format("https://api.github.com/repos/%s/%s/commits?per_page=100",
					repo.getRepoOwner(), repo.getRepoName());

			HttpHeaders headers = createHeaders(repo.getAccessToken());
			HttpEntity<String> entity = new HttpEntity<>(headers);

			ResponseEntity<String> response = restTemplate.exchange(
					url, HttpMethod.GET, entity, String.class);

			if (!response.getStatusCode().is2xxSuccessful()) {
				return 0;
			}

			JsonNode commits = objectMapper.readTree(response.getBody());
			int count = 0;

			for (JsonNode commitNode : commits) {
				String sha = commitNode.get("sha").asText();
				JsonNode commit = commitNode.get("commit");
				String message = commit.get("message").asText();
				String authorName = commit.get("author").get("name").asText();
				String authorEmail = commit.get("author").get("email").asText();
				String dateStr = commit.get("author").get("date").asText();
				String htmlUrl = commitNode.get("html_url").asText();

				// 커밋 메시지에서 이슈 번호 파싱
				List<Integer> taskIds = parseTaskIds(message, teamId);

				for (Integer taskId : taskIds) {
					// 이미 존재하는지 확인
					TaskCommit existing = new TaskCommit();
					existing.setTaskId(taskId);
					existing.setCommitSha(sha);
					if (taskCommitDao.getByTaskAndSha(existing) == null) {
						TaskCommit taskCommit = new TaskCommit();
						taskCommit.setTaskId(taskId);
						taskCommit.setCommitSha(sha);
						taskCommit.setCommitMessage(message.length() > 500 ? message.substring(0, 500) : message);
						taskCommit.setAuthorName(authorName);
						taskCommit.setAuthorEmail(authorEmail);
						taskCommit.setCommittedAt(parseDate(dateStr));
						taskCommit.setCommitUrl(htmlUrl);
						taskCommitDao.insert(taskCommit);
						count++;
					}
				}
			}

			return count;
		} catch (Exception e) {
			System.err.println("Commit sync failed: " + e.getMessage());
			e.printStackTrace();
			return 0;
		}
	}

	// 태스크별 커밋 목록
	public List<TaskCommit> getCommitsByTaskId(int taskId) {
		return taskCommitDao.listByTaskId(taskId);
	}

	// 커밋 메시지에서 태스크 ID 파싱
	private List<Integer> parseTaskIds(String message, int teamId) {
		List<Integer> taskIds = new ArrayList<>();
		Matcher matcher = ISSUE_PATTERN.matcher(message);

		while (matcher.find()) {
			try {
				int taskId = Integer.parseInt(matcher.group(1));
				// 해당 팀의 태스크인지 확인
				Task task = taskDao.content(taskId);
				if (task != null) {
					taskIds.add(taskId);
				}
			} catch (NumberFormatException e) {
				// ignore
			}
		}

		return taskIds;
	}

	private HttpHeaders createHeaders(String token) {
		HttpHeaders headers = new HttpHeaders();
		headers.set("Accept", "application/vnd.github.v3+json");
		if (token != null && !token.isEmpty()) {
			headers.set("Authorization", "Bearer " + token);
		}
		return headers;
	}

	private Date parseDate(String dateStr) {
		try {
			SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
			java.util.Date parsed = sdf.parse(dateStr);
			return new Date(parsed.getTime());
		} catch (Exception e) {
			return new Date(System.currentTimeMillis());
		}
	}
}
