package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.SynodosColumnDao;
import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.dao.TaskVerifierDao;
import com.example.demo.dao.TaskGitHubIssueDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.dao.MemberDao;
import com.example.demo.model.Task;
import com.example.demo.model.SynodosColumn;
import com.example.demo.model.TaskGitHubIssue;
import com.example.demo.model.Team;
import com.example.demo.model.Member;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Slf4j
@Service
public class TaskService {

	@Autowired
	private TaskDao dao;

	@Autowired
	private SynodosColumnDao columnDao;

	@Autowired
	private TaskAssigneeDao taskAssigneeDao;

	@Autowired
	private TaskVerifierDao taskVerifierDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	@Autowired
	private TaskGitHubIssueDao taskGitHubIssueDao;

	@Autowired
	private GitHubIssueSyncService gitHubIssueSyncService;

	@Autowired
	private MemberDao memberDao;

	@Autowired
	private TeamDao teamDao;

	// Helper method to get current member's no from security context
	private Integer getCurrentMemberNo() {
		try {
			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			if (auth != null && auth.getCredentials() instanceof Integer) {
				return (Integer) auth.getCredentials();
			}
		} catch (Exception e) {
			log.debug("Could not get current member no: {}", e.getMessage());
		}
		return null;
	}

	// Helper method to sync task to GitHub if linked
	private void syncToGitHubIfLinked(int taskId) {
		log.info("[GitHub Sync] Starting sync check for task #{}", taskId);
		try {
			// Check if task has linked GitHub issue
			TaskGitHubIssue mapping = taskGitHubIssueDao.findByTaskId(taskId);
			if (mapping == null) {
				log.info("[GitHub Sync] No GitHub issue linked to task #{}, skipping", taskId);
				return; // No linked issue, nothing to sync
			}
			log.info("[GitHub Sync] Found mapping: task #{} -> issue #{}", taskId, mapping.getIssueNumber());

			// Get current member's no
			Integer memberNo = getCurrentMemberNo();
			if (memberNo == null) {
				log.warn("[GitHub Sync] No authenticated member, skipping GitHub sync for task #{}", taskId);
				return;
			}
			log.info("[GitHub Sync] Current member: #{}", memberNo);

			// Check if member has GitHub account linked
			Member member = memberDao.findByNo(memberNo);
			if (member == null || member.getGithubAccessToken() == null) {
				log.warn("[GitHub Sync] Member #{} has no GitHub account linked, skipping sync", memberNo);
				return;
			}
			log.info("[GitHub Sync] Member has GitHub token, proceeding with sync");

			// Sync to GitHub
			gitHubIssueSyncService.syncTaskToGitHub(taskId, memberNo);
			log.info("[GitHub Sync] SUCCESS: Synced Task #{} to GitHub Issue #{}", taskId, mapping.getIssueNumber());
		} catch (Exception e) {
			// Log but don't fail the main operation
			log.error("[GitHub Sync] FAILED to sync task #{} to GitHub: {}", taskId, e.getMessage(), e);
		}
	}

	// Helper method to populate assignees for a single task
	private void populateAssignees(Task task) {
		if (task != null) {
			task.setAssignees(taskAssigneeDao.listByTask(task.getTaskId()));
		}
	}

	// Helper method to populate assignees for a list of tasks
	private void populateAssignees(List<Task> tasks) {
		if (tasks != null) {
			for (Task task : tasks) {
				populateAssignees(task);
			}
		}
	}

	// Helper method to populate verifiers for a single task
	private void populateVerifiers(Task task) {
		if (task != null) {
			task.setVerifiers(taskVerifierDao.listByTask(task.getTaskId()));
		}
	}

	// Helper method to populate verifiers for a list of tasks
	private void populateVerifiers(List<Task> tasks) {
		if (tasks != null) {
			for (Task task : tasks) {
				populateVerifiers(task);
			}
		}
	}

	// Helper method to populate all relations (assignees + verifiers)
	private void populateRelations(Task task) {
		populateAssignees(task);
		populateVerifiers(task);
	}

	// Helper method to populate all relations for a list of tasks
	private void populateRelations(List<Task> tasks) {
		populateAssignees(tasks);
		populateVerifiers(tasks);
	}

	public int insert(Task task) {
		int result = dao.insert(task);
		if (result == 1) {
			SynodosColumn column = columnDao.content(task.getColumnId());
			if (column != null) {
				int teamId = column.getTeamId();

				// Fetch the latest task in this column to get the created one
				List<Task> tasks = dao.listByColumn(task.getColumnId());
				if (!tasks.isEmpty()) {
					Task created = tasks.get(tasks.size() - 1);
					notificationService.notifyTaskCreated(created, teamId);

					// GitHub Issue 자동 생성
					createGitHubIssueIfEnabled(created.getTaskId(), teamId);
				}
			}
		}
		return result;
	}

	/**
	 * 팀 설정이 활성화된 경우 GitHub Issue 자동 생성
	 */
	private void createGitHubIssueIfEnabled(int taskId, int teamId) {
		try {
			// 팀 설정 확인
			Team team = teamDao.findById(teamId);
			if (team == null || !Boolean.TRUE.equals(team.getGithubIssueSyncEnabled())) {
				log.debug("GitHub Issue sync disabled for team #{}", teamId);
				return;
			}

			if (team.getGithubRepoUrl() == null || team.getGithubRepoUrl().isEmpty()) {
				log.debug("No GitHub repo configured for team #{}", teamId);
				return;
			}

			// 현재 사용자 확인
			Integer memberNo = getCurrentMemberNo();
			if (memberNo == null) {
				log.debug("No authenticated member, skipping GitHub Issue creation for task #{}", taskId);
				return;
			}

			// 사용자의 GitHub 연동 확인
			Member member = memberDao.findByNo(memberNo);
			if (member == null || member.getGithubAccessToken() == null) {
				log.debug("Member #{} has no GitHub account linked, skipping Issue creation", memberNo);
				return;
			}

			// GitHub Issue 생성
			gitHubIssueSyncService.createIssueFromTask(taskId, teamId, memberNo);
			log.info("Auto-created GitHub Issue from Task #{} for team #{}", taskId, teamId);
		} catch (Exception e) {
			// 실패해도 태스크 생성은 성공으로 처리
			log.warn("Failed to auto-create GitHub Issue for task #{}: {}", taskId, e.getMessage());
		}
	}

	public List<Task> listByColumn(int columnId) {
		List<Task> tasks = dao.listByColumn(columnId);
		populateRelations(tasks);
		return tasks;
	}

	public List<Task> listAll() {
		List<Task> tasks = dao.listAll();
		populateRelations(tasks);
		return tasks;
	}

	public List<Task> listByTeam(int teamId) {
		List<Task> tasks = dao.listByTeam(teamId);
		populateRelations(tasks);
		return tasks;
	}

	public Task content(int taskId) {
		Task task = dao.content(taskId);
		populateRelations(task);
		return task;
	}

	public int update(Task task) {
		int result = dao.update(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}

	// 태스크 업데이트 + 담당자에게 알림 발송
	public int updateWithNotification(Task task, int senderNo, String changeDescription) {
		int result = dao.update(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					// WebSocket 알림
					notificationService.notifyTaskUpdated(updated, column.getTeamId());

					// 담당자에게 영구 알림 (본인 제외)
					Integer assignee = updated.getAssigneeNo();
					if (assignee != null && assignee != senderNo) {
						persistentNotificationService.notifyTaskUpdated(
							assignee,
							senderNo,
							updated.getTaskId(),
							updated.getTitle(),
							changeDescription
						);
					}
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}

	public int delete(int taskId) {
		Task task = dao.content(taskId);
		int result = dao.delete(taskId);
		if (result == 1 && task != null) {
			SynodosColumn column = columnDao.content(task.getColumnId());
			if (column != null) {
				notificationService.notifyTaskDeleted(column.getTeamId(), taskId);
			}
		}
		return result;
	}

	public int updatePosition(Task task) {
		int result = dao.updatePosition(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskMoved(updated, column.getTeamId());
				}
			}
		}
		return result;
	}

	public int getMaxPosition(int columnId) {
		return dao.getMaxPosition(columnId);
	}

	// Issue Tracker 확장 메서드

	public List<Task> listByAssignee(int memberNo) {
		List<Task> tasks = dao.listByAssignee(memberNo);
		populateRelations(tasks);
		return tasks;
	}

	public List<Task> listByStatusAndTeam(int teamId, String workflowStatus) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("workflowStatus", workflowStatus);
		List<Task> tasks = dao.listByStatusAndTeam(params);
		populateRelations(tasks);
		return tasks;
	}

	public int updateWorkflowStatus(Task task) {
		int result = dao.updateWorkflowStatus(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				populateRelations(updated);
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}

	// 반려 처리
	public int updateRejection(Task task) {
		int result = dao.updateRejection(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				populateRelations(updated);
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}

	public int updateAssignee(Task task) {
		int result = dao.updateAssignee(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}

	// 담당자 지정 + 알림 발송
	public int updateAssigneeWithNotification(Task task, int senderNo) {
		// 기존 담당자 확인
		Task existingTask = dao.content(task.getTaskId());
		Integer previousAssignee = existingTask != null ? existingTask.getAssigneeNo() : null;

		int result = dao.updateAssignee(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					// WebSocket 알림
					notificationService.notifyTaskUpdated(updated, column.getTeamId());

					// 새로 지정된 담당자에게 영구 알림 (본인 제외, 기존 담당자와 다른 경우)
					Integer newAssignee = updated.getAssigneeNo();
					if (newAssignee != null && newAssignee != senderNo &&
						(previousAssignee == null || !previousAssignee.equals(newAssignee))) {
						persistentNotificationService.notifyTaskAssignee(
							newAssignee,
							senderNo,
							updated.getTaskId(),
							updated.getTitle(),
							column.getTeamId()
						);
					}
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}

	// 검증 대기 목록 (내가 검증자로 배정된 REVIEW 상태 태스크)
	public List<Task> listPendingVerification(int memberNo) {
		List<Task> tasks = dao.listPendingVerification(memberNo);
		populateRelations(tasks);
		return tasks;
	}

	// 캘린더용 날짜 범위 조회
	public List<Task> listByDateRange(int teamId, java.util.Date startDate, java.util.Date endDate) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("startDate", startDate);
		params.put("endDate", endDate);
		List<Task> tasks = dao.listByDateRange(params);
		populateRelations(tasks);
		return tasks;
	}

	// 날짜 변경 (타임라인용)
	public int updateDates(Task task) {
		int result = dao.updateDates(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				SynodosColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskDatesChanged(updated, column.getTeamId());
				}
			}
			// GitHub 자동 동기화
			syncToGitHubIfLinked(task.getTaskId());
		}
		return result;
	}
}
