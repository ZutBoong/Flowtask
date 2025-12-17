package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.model.Task;
import com.example.demo.model.TaskAssignee;
import com.example.demo.model.FlowtaskColumn;

@Service
public class TaskAssigneeService {

	@Autowired
	private TaskAssigneeDao dao;

	@Autowired
	private TaskDao taskDao;

	@Autowired
	private FlowtaskColumnDao columnDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	// 담당자 추가
	public int addAssignee(TaskAssignee assignee) {
		int result = dao.insert(assignee);
		if (result == 1) {
			notifyTaskUpdate(assignee.getTaskId());
		}
		return result;
	}

	// 담당자 추가 + 알림 발송
	public int addAssigneeWithNotification(TaskAssignee assignee, int senderNo) {
		int result = dao.insert(assignee);
		if (result == 1) {
			notifyTaskUpdate(assignee.getTaskId());

			// 새 담당자에게 알림 (본인 제외)
			if (assignee.getMemberNo() != senderNo) {
				Task task = taskDao.content(assignee.getTaskId());
				if (task != null) {
					FlowtaskColumn column = columnDao.content(task.getColumnId());
					if (column != null) {
						persistentNotificationService.notifyTaskAssignee(
							assignee.getMemberNo(),
							senderNo,
							task.getTaskId(),
							task.getTitle(),
							column.getTeamId()
						);
					}
				}
			}
		}
		return result;
	}

	// 담당자 제거
	public int removeAssignee(int taskId, int memberNo) {
		int result = dao.delete(taskId, memberNo);
		if (result == 1) {
			notifyTaskUpdate(taskId);
		}
		return result;
	}

	// 태스크의 모든 담당자 제거
	public int removeAllAssignees(int taskId) {
		int result = dao.deleteByTask(taskId);
		notifyTaskUpdate(taskId);
		return result;
	}

	// 담당자 일괄 변경 (기존 전부 삭제 후 새로 추가)
	@Transactional
	public int updateAssignees(int taskId, List<Integer> memberNos, Integer assignedBy) {
		// 기존 담당자 삭제
		dao.deleteByTask(taskId);

		// 새 담당자 추가
		int count = 0;
		if (memberNos != null) {
			for (Integer memberNo : memberNos) {
				TaskAssignee assignee = new TaskAssignee();
				assignee.setTaskId(taskId);
				assignee.setMemberNo(memberNo);
				assignee.setAssignedBy(assignedBy);
				count += dao.insert(assignee);
			}
		}

		notifyTaskUpdate(taskId);
		return count;
	}

	// 담당자 일괄 변경 + 알림 발송
	@Transactional
	public int updateAssigneesWithNotification(int taskId, List<Integer> memberNos, int senderNo) {
		// 기존 담당자 목록 조회
		List<TaskAssignee> existingAssignees = dao.listByTask(taskId);

		// 기존 담당자 삭제
		dao.deleteByTask(taskId);

		// 새 담당자 추가
		int count = 0;
		if (memberNos != null) {
			Task task = taskDao.content(taskId);
			FlowtaskColumn column = task != null ? columnDao.content(task.getColumnId()) : null;

			for (Integer memberNo : memberNos) {
				TaskAssignee assignee = new TaskAssignee();
				assignee.setTaskId(taskId);
				assignee.setMemberNo(memberNo);
				assignee.setAssignedBy(senderNo);
				count += dao.insert(assignee);

				// 새로 추가된 담당자에게 알림 (본인 제외, 기존에 없던 담당자만)
				if (memberNo != senderNo && task != null && column != null) {
					boolean wasAssigned = existingAssignees.stream()
						.anyMatch(ea -> ea.getMemberNo() == memberNo);
					if (!wasAssigned) {
						persistentNotificationService.notifyTaskAssignee(
							memberNo,
							senderNo,
							task.getTaskId(),
							task.getTitle(),
							column.getTeamId()
						);
					}
				}
			}
		}

		notifyTaskUpdate(taskId);
		return count;
	}

	// 태스크별 담당자 목록
	public List<TaskAssignee> listByTask(int taskId) {
		return dao.listByTask(taskId);
	}

	// 멤버별 담당 태스크 목록
	public List<TaskAssignee> listByMember(int memberNo) {
		return dao.listByMember(memberNo);
	}

	// 태스크 담당자 수
	public int countByTask(int taskId) {
		return dao.countByTask(taskId);
	}

	// WebSocket 알림 발송 헬퍼
	private void notifyTaskUpdate(int taskId) {
		Task task = taskDao.content(taskId);
		if (task != null) {
			FlowtaskColumn column = columnDao.content(task.getColumnId());
			if (column != null) {
				notificationService.notifyTaskUpdated(task, column.getTeamId());
			}
		}
	}
}
