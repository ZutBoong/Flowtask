package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.dao.TaskVerifierDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.model.Task;
import com.example.demo.model.TaskVerifier;
import com.example.demo.model.FlowtaskColumn;

@Service
public class TaskVerifierService {

	@Autowired
	private TaskVerifierDao dao;

	@Autowired
	private TaskDao taskDao;

	@Autowired
	private FlowtaskColumnDao columnDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	// 검증자 추가
	public int addVerifier(TaskVerifier verifier) {
		int result = dao.insert(verifier);
		if (result == 1) {
			notifyTaskUpdate(verifier.getTaskId());
		}
		return result;
	}

	// 검증자 추가 + 알림 발송
	public int addVerifierWithNotification(TaskVerifier verifier, int senderNo) {
		int result = dao.insert(verifier);
		if (result == 1) {
			notifyTaskUpdate(verifier.getTaskId());

			// 새 검증자에게 알림 (본인 제외)
			if (verifier.getMemberNo() != senderNo) {
				Task task = taskDao.content(verifier.getTaskId());
				if (task != null) {
					FlowtaskColumn column = columnDao.content(task.getColumnId());
					if (column != null) {
						persistentNotificationService.sendNotification(
							verifier.getMemberNo(),
							senderNo,
							"TASK_VERIFIER",
							"검증 요청",
							"'" + task.getTitle() + "' 태스크의 검증자로 지정되었습니다",
							column.getTeamId(),
							task.getColumnId(),
							task.getTaskId()
						);
					}
				}
			}
		}
		return result;
	}

	// 검증자 제거
	public int removeVerifier(int taskId, int memberNo) {
		int result = dao.delete(taskId, memberNo);
		if (result == 1) {
			notifyTaskUpdate(taskId);
		}
		return result;
	}

	// 태스크의 모든 검증자 제거
	public int removeAllVerifiers(int taskId) {
		int result = dao.deleteByTask(taskId);
		notifyTaskUpdate(taskId);
		return result;
	}

	// 검증자 일괄 변경 (기존 전부 삭제 후 새로 추가)
	@Transactional
	public int updateVerifiers(int taskId, List<Integer> memberNos) {
		// 기존 검증자 삭제
		dao.deleteByTask(taskId);

		// 새 검증자 추가
		int count = 0;
		if (memberNos != null) {
			for (Integer memberNo : memberNos) {
				TaskVerifier verifier = new TaskVerifier();
				verifier.setTaskId(taskId);
				verifier.setMemberNo(memberNo);
				count += dao.insert(verifier);
			}
		}

		notifyTaskUpdate(taskId);
		return count;
	}

	// 검증자 일괄 변경 + 알림 발송
	@Transactional
	public int updateVerifiersWithNotification(int taskId, List<Integer> memberNos, int senderNo) {
		// 기존 검증자 목록 조회
		List<TaskVerifier> existingVerifiers = dao.listByTask(taskId);

		// 기존 검증자 삭제
		dao.deleteByTask(taskId);

		// 새 검증자 추가
		int count = 0;
		if (memberNos != null) {
			Task task = taskDao.content(taskId);
			FlowtaskColumn column = task != null ? columnDao.content(task.getColumnId()) : null;

			for (Integer memberNo : memberNos) {
				TaskVerifier verifier = new TaskVerifier();
				verifier.setTaskId(taskId);
				verifier.setMemberNo(memberNo);
				count += dao.insert(verifier);

				// 새로 추가된 검증자에게 알림 (본인 제외, 기존에 없던 검증자만)
				if (memberNo != senderNo && task != null && column != null) {
					boolean wasVerifier = existingVerifiers.stream()
						.anyMatch(ev -> ev.getMemberNo() == memberNo);
					if (!wasVerifier) {
						persistentNotificationService.sendNotification(
							memberNo,
							senderNo,
							"TASK_VERIFIER",
							"검증 요청",
							"'" + task.getTitle() + "' 태스크의 검증자로 지정되었습니다",
							column.getTeamId(),
							task.getColumnId(),
							task.getTaskId()
						);
					}
				}
			}
		}

		notifyTaskUpdate(taskId);
		return count;
	}

	// 태스크별 검증자 목록
	public List<TaskVerifier> listByTask(int taskId) {
		return dao.listByTask(taskId);
	}

	// 멤버별 검증 태스크 목록
	public List<TaskVerifier> listByMember(int memberNo) {
		return dao.listByMember(memberNo);
	}

	// 태스크 검증자 수
	public int countByTask(int taskId) {
		return dao.countByTask(taskId);
	}

	// 모든 검증자 승인 여부
	public boolean allVerifiersApproved(int taskId) {
		return dao.allVerifiersApproved(taskId);
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
