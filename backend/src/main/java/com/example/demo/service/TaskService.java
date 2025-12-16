package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.dao.TagDao;
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
	private BoardNotificationService notificationService;

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
		populateTags(tasks);
		return tasks;
	}

	public List<Task> listAll() {
		List<Task> tasks = dao.listAll();
		populateTags(tasks);
		return tasks;
	}

	public List<Task> listByTeam(int teamId) {
		List<Task> tasks = dao.listByTeam(teamId);
		populateTags(tasks);
		return tasks;
	}

	public List<Task> listByProject(int projectId) {
		List<Task> tasks = dao.listByProject(projectId);
		populateTags(tasks);
		return tasks;
	}

	public Task content(int taskId) {
		Task task = dao.content(taskId);
		populateTags(task);
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
		populateTags(tasks);
		return tasks;
	}

	public List<Task> listByStatusAndTeam(int teamId, String status) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("status", status);
		List<Task> tasks = dao.listByStatusAndTeam(params);
		populateTags(tasks);
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

	// 검증자 관련 메서드

	public int updateVerifier(Task task) {
		int result = dao.updateVerifier(task);
		if (result == 1) {
			Task updated = dao.content(task.getTaskId());
			if (updated != null) {
				populateTags(updated);
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
				populateTags(updated);
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
		populateTags(tasks);
		return tasks;
	}

	// 캘린더용 날짜 범위 조회
	public List<Task> listByDateRange(int teamId, java.util.Date startDate, java.util.Date endDate) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("startDate", startDate);
		params.put("endDate", endDate);
		List<Task> tasks = dao.listByDateRange(params);
		populateTags(tasks);
		return tasks;
	}
}
