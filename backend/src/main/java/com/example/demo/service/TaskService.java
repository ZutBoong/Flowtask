package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.dao.TagDao;
import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.model.Task;
import com.example.demo.model.Tag;
import com.example.demo.model.FlowtaskColumn;

@Service
public class TaskService {

	@Autowired
	private TaskDao dao;

	@Autowired
	private FlowtaskColumnDao columnDao;

	@Autowired
	private TagDao tagDao;

	@Autowired
	private TaskAssigneeDao taskAssigneeDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	// Helper method to populate tags for a single task
	private void populateTags(Task task) {
		if (task != null) {
			task.setTags(tagDao.listByTask(task.getTaskId()));
		}
	}

	// Helper method to populate tags for a list of tasks
	private void populateTags(List<Task> tasks) {
		if (tasks != null) {
			for (Task task : tasks) {
				populateTags(task);
			}
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

	// Helper method to populate all relations (tags + assignees)
	private void populateRelations(Task task) {
		populateTags(task);
		populateAssignees(task);
	}

	// Helper method to populate all relations for a list of tasks
	private void populateRelations(List<Task> tasks) {
		populateTags(tasks);
		populateAssignees(tasks);
	}

	public int insert(Task task) {
		int result = dao.insert(task);
		if (result == 1) {
			FlowtaskColumn column = columnDao.content(task.getColumnId());
			if (column != null) {
				// Fetch the latest task in this column to get the created one
				List<Task> tasks = dao.listByColumn(task.getColumnId());
				if (!tasks.isEmpty()) {
					Task created = tasks.get(tasks.size() - 1);
					notificationService.notifyTaskCreated(created, column.getTeamId());
				}
			}
		}
		return result;
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

	public List<Task> listByProject(int projectId) {
		List<Task> tasks = dao.listByProject(projectId);
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
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
		}
		return result;
	}

	// 태스크 업데이트 + 담당자에게 알림 발송
	public int updateWithNotification(Task task, int senderNo, String changeDescription) {
		int result = dao.update(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
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
		}
		return result;
	}

	public int delete(int taskId) {
		Task task = dao.content(taskId);
		int result = dao.delete(taskId);
		if (result == 1 && task != null) {
			FlowtaskColumn column = columnDao.content(task.getColumnId());
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
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
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

	public List<Task> listByStatusAndTeam(int teamId, String status) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("status", status);
		List<Task> tasks = dao.listByStatusAndTeam(params);
		populateRelations(tasks);
		return tasks;
	}

	public int updateStatus(Task task) {
		int result = dao.updateStatus(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
		}
		return result;
	}

	// 상태 변경 + 담당자에게 알림 발송
	public int updateStatusWithNotification(Task task, int senderNo) {
		int result = dao.updateStatus(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
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
							"상태가 " + updated.getStatus() + "(으)로 변경되었습니다"
						);
					}
				}
			}
		}
		return result;
	}

	public int updateAssignee(Task task) {
		int result = dao.updateAssignee(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
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
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
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
		}
		return result;
	}

	// 검증자 관련 메서드

	public int updateVerifier(Task task) {
		int result = dao.updateVerifier(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				populateRelations(updated);
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
		}
		return result;
	}

	public int updateVerification(Task task) {
		int result = dao.updateVerification(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				populateRelations(updated);
				FlowtaskColumn column = columnDao.content(updated.getColumnId());
				if (column != null) {
					notificationService.notifyTaskUpdated(updated, column.getTeamId());
				}
			}
		}
		return result;
	}

	public List<Task> listPendingVerification(int verifierNo) {
		List<Task> tasks = dao.listPendingVerification(verifierNo);
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
}
