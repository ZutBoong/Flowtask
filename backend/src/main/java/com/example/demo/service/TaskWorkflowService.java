package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.dao.TaskVerifierDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.model.Task;
import com.example.demo.model.FlowtaskColumn;

@Service
public class TaskWorkflowService {

	// 워크플로우 상태 상수
	public static final String STATUS_WAITING = "WAITING";
	public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
	public static final String STATUS_REVIEW = "REVIEW";
	public static final String STATUS_DONE = "DONE";
	public static final String STATUS_REJECTED = "REJECTED";
	public static final String STATUS_DECLINED = "DECLINED";

	@Autowired
	private TaskDao taskDao;

	@Autowired
	private TaskAssigneeDao assigneeDao;

	@Autowired
	private TaskVerifierDao verifierDao;

	@Autowired
	private FlowtaskColumnDao columnDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	/**
	 * 담당자가 태스크를 수락
	 * - 모든 담당자가 수락하면 상태가 IN_PROGRESS로 변경
	 */
	@Transactional
	public Task acceptTask(int taskId, int memberNo) {
		Task task = taskDao.content(taskId);
		if (task == null) {
			throw new IllegalArgumentException("태스크를 찾을 수 없습니다: " + taskId);
		}

		// WAITING 상태에서만 수락 가능
		if (!STATUS_WAITING.equals(task.getWorkflowStatus())) {
			throw new IllegalStateException("대기 상태의 태스크만 수락할 수 있습니다. 현재 상태: " + task.getWorkflowStatus());
		}

		// 담당자 수락 처리
		assigneeDao.acceptTask(taskId, memberNo);

		// 모든 담당자 수락 여부 확인
		if (assigneeDao.allAssigneesAccepted(taskId)) {
			task.setWorkflowStatus(STATUS_IN_PROGRESS);
			taskDao.updateWorkflowStatus(task);
		}

		// 알림 및 업데이트된 태스크 반환
		notifyAndReturn(task);
		return taskDao.content(taskId);
	}

	/**
	 * 담당자가 태스크 작업을 완료
	 * - 모든 담당자가 완료하면 상태가 REVIEW로 변경
	 */
	@Transactional
	public Task completeTask(int taskId, int memberNo) {
		Task task = taskDao.content(taskId);
		if (task == null) {
			throw new IllegalArgumentException("태스크를 찾을 수 없습니다: " + taskId);
		}

		// IN_PROGRESS 상태에서만 완료 가능
		if (!STATUS_IN_PROGRESS.equals(task.getWorkflowStatus())) {
			throw new IllegalStateException("진행 중인 태스크만 완료 처리할 수 있습니다. 현재 상태: " + task.getWorkflowStatus());
		}

		// 담당자 완료 처리
		assigneeDao.completeTask(taskId, memberNo);

		// 모든 담당자 완료 여부 확인
		if (assigneeDao.allAssigneesCompleted(taskId)) {
			// 검증자가 있으면 REVIEW로, 없으면 바로 DONE으로
			int verifierCount = verifierDao.countByTask(taskId);
			if (verifierCount > 0) {
				task.setWorkflowStatus(STATUS_REVIEW);
				// 검증자들에게 알림 발송
				notifyVerifiersForReview(task, memberNo);
			} else {
				task.setWorkflowStatus(STATUS_DONE);
			}
			taskDao.updateWorkflowStatus(task);
		}

		notifyAndReturn(task);
		return taskDao.content(taskId);
	}

	/**
	 * 검증자가 태스크를 승인
	 * - 모든 검증자가 승인하면 상태가 DONE으로 변경
	 */
	@Transactional
	public Task approveTask(int taskId, int memberNo) {
		Task task = taskDao.content(taskId);
		if (task == null) {
			throw new IllegalArgumentException("태스크를 찾을 수 없습니다: " + taskId);
		}

		// REVIEW 상태에서만 승인 가능
		if (!STATUS_REVIEW.equals(task.getWorkflowStatus())) {
			throw new IllegalStateException("검토 중인 태스크만 승인할 수 있습니다. 현재 상태: " + task.getWorkflowStatus());
		}

		// 검증자 승인 처리
		verifierDao.approveTask(taskId, memberNo);

		// 모든 검증자 승인 여부 확인
		if (verifierDao.allVerifiersApproved(taskId)) {
			task.setWorkflowStatus(STATUS_DONE);
			taskDao.updateWorkflowStatus(task);

			// 담당자들에게 완료 알림
			notifyAssigneesForDone(task, memberNo);
		}

		notifyAndReturn(task);
		return taskDao.content(taskId);
	}

	/**
	 * 검증자가 태스크를 반려
	 * - 상태가 REJECTED로 변경되고 담당자들의 완료 상태 초기화
	 */
	@Transactional
	public Task rejectTask(int taskId, int memberNo, String reason) {
		Task task = taskDao.content(taskId);
		if (task == null) {
			throw new IllegalArgumentException("태스크를 찾을 수 없습니다: " + taskId);
		}

		// REVIEW 상태에서만 반려 가능
		if (!STATUS_REVIEW.equals(task.getWorkflowStatus())) {
			throw new IllegalStateException("검토 중인 태스크만 반려할 수 있습니다. 현재 상태: " + task.getWorkflowStatus());
		}

		// 검증자 반려 처리
		verifierDao.rejectTask(taskId, memberNo, reason);

		// 태스크 반려 상태로 변경
		task.setRejectionReason(reason);
		task.setRejectedBy(memberNo);
		taskDao.updateRejection(task);

		// 담당자들의 완료 상태 초기화
		assigneeDao.resetCompletion(taskId);

		// 담당자들에게 반려 알림
		notifyAssigneesForRejection(task, memberNo, reason);

		notifyAndReturn(task);
		return taskDao.content(taskId);
	}

	/**
	 * 담당자가 태스크를 거부
	 * - WAITING 상태에서만 거부 가능
	 * - 상태가 DECLINED로 변경
	 */
	@Transactional
	public Task declineTask(int taskId, int memberNo, String reason) {
		Task task = taskDao.content(taskId);
		if (task == null) {
			throw new IllegalArgumentException("태스크를 찾을 수 없습니다: " + taskId);
		}

		// WAITING 상태에서만 거부 가능
		if (!STATUS_WAITING.equals(task.getWorkflowStatus())) {
			throw new IllegalStateException("대기 상태의 태스크만 거부할 수 있습니다. 현재 상태: " + task.getWorkflowStatus());
		}

		// 태스크 거부 상태로 변경
		task.setWorkflowStatus(STATUS_DECLINED);
		task.setRejectionReason(reason);
		task.setRejectedBy(memberNo);
		taskDao.updateWorkflowStatus(task);
		taskDao.updateRejection(task);

		// 다른 담당자들에게 거부 알림
		notifyAssigneesForDecline(task, memberNo, reason);

		notifyAndReturn(task);
		return taskDao.content(taskId);
	}

	/**
	 * 반려된 태스크 재작업 시작
	 * - REJECTED -> IN_PROGRESS로 변경
	 */
	@Transactional
	public Task restartTask(int taskId, int memberNo) {
		Task task = taskDao.content(taskId);
		if (task == null) {
			throw new IllegalArgumentException("태스크를 찾을 수 없습니다: " + taskId);
		}

		// REJECTED 상태에서만 재시작 가능
		if (!STATUS_REJECTED.equals(task.getWorkflowStatus())) {
			throw new IllegalStateException("반려된 태스크만 재작업을 시작할 수 있습니다. 현재 상태: " + task.getWorkflowStatus());
		}

		// 검증자 승인 상태 초기화
		verifierDao.resetApproval(taskId);

		// IN_PROGRESS로 변경
		task.setWorkflowStatus(STATUS_IN_PROGRESS);
		taskDao.updateWorkflowStatus(task);

		notifyAndReturn(task);
		return taskDao.content(taskId);
	}

	/**
	 * 워크플로우 상태 재계산
	 * - 담당자/검증자 변경 후 상태 동기화에 사용
	 */
	@Transactional
	public void recalculateStatus(int taskId) {
		Task task = taskDao.content(taskId);
		if (task == null) return;

		String currentStatus = task.getWorkflowStatus();
		int assigneeCount = assigneeDao.countByTask(taskId);
		int verifierCount = verifierDao.countByTask(taskId);

		// 담당자가 없으면 WAITING 유지
		if (assigneeCount == 0) {
			if (!STATUS_WAITING.equals(currentStatus)) {
				task.setWorkflowStatus(STATUS_WAITING);
				taskDao.updateWorkflowStatus(task);
				notifyAndReturn(task);
			}
			return;
		}

		// 현재 상태에 따른 재계산
		if (STATUS_WAITING.equals(currentStatus) && assigneeDao.allAssigneesAccepted(taskId)) {
			task.setWorkflowStatus(STATUS_IN_PROGRESS);
			taskDao.updateWorkflowStatus(task);
		} else if (STATUS_IN_PROGRESS.equals(currentStatus) && assigneeDao.allAssigneesCompleted(taskId)) {
			if (verifierCount > 0) {
				task.setWorkflowStatus(STATUS_REVIEW);
			} else {
				task.setWorkflowStatus(STATUS_DONE);
			}
			taskDao.updateWorkflowStatus(task);
		} else if (STATUS_REVIEW.equals(currentStatus) && verifierDao.allVerifiersApproved(taskId)) {
			task.setWorkflowStatus(STATUS_DONE);
			taskDao.updateWorkflowStatus(task);
		}

		notifyAndReturn(task);
	}

	// 알림 발송 헬퍼
	private void notifyAndReturn(Task task) {
		FlowtaskColumn column = columnDao.content(task.getColumnId());
		if (column != null) {
			notificationService.notifyTaskUpdated(task, column.getTeamId());
		}
	}

	// 검증자들에게 검토 요청 알림
	private void notifyVerifiersForReview(Task task, int senderNo) {
		FlowtaskColumn column = columnDao.content(task.getColumnId());
		if (column != null) {
			verifierDao.listByTask(task.getTaskId()).forEach(v -> {
				if (v.getMemberNo() != senderNo) {
					persistentNotificationService.sendNotification(
						v.getMemberNo(),
						senderNo,
						"TASK_REVIEW",
						"검토 요청",
						"'" + task.getTitle() + "' 태스크의 검토가 요청되었습니다",
						column.getTeamId(),
						task.getColumnId(),
						task.getTaskId()
					);
				}
			});
		}
	}

	// 담당자들에게 완료 알림
	private void notifyAssigneesForDone(Task task, int senderNo) {
		FlowtaskColumn column = columnDao.content(task.getColumnId());
		if (column != null) {
			assigneeDao.listByTask(task.getTaskId()).forEach(a -> {
				if (a.getMemberNo() != senderNo) {
					persistentNotificationService.sendNotification(
						a.getMemberNo(),
						senderNo,
						"TASK_DONE",
						"태스크 완료",
						"'" + task.getTitle() + "' 태스크가 승인되어 완료되었습니다",
						column.getTeamId(),
						task.getColumnId(),
						task.getTaskId()
					);
				}
			});
		}
	}

	// 담당자들에게 반려 알림
	private void notifyAssigneesForRejection(Task task, int senderNo, String reason) {
		FlowtaskColumn column = columnDao.content(task.getColumnId());
		if (column != null) {
			assigneeDao.listByTask(task.getTaskId()).forEach(a -> {
				if (a.getMemberNo() != senderNo) {
					persistentNotificationService.sendNotification(
						a.getMemberNo(),
						senderNo,
						"TASK_REJECTED",
						"태스크 반려",
						"'" + task.getTitle() + "' 태스크가 반려되었습니다: " + reason,
						column.getTeamId(),
						task.getColumnId(),
						task.getTaskId()
					);
				}
			});
		}
	}

	// 담당자들에게 거부 알림
	private void notifyAssigneesForDecline(Task task, int senderNo, String reason) {
		FlowtaskColumn column = columnDao.content(task.getColumnId());
		if (column != null) {
			assigneeDao.listByTask(task.getTaskId()).forEach(a -> {
				if (a.getMemberNo() != senderNo) {
					persistentNotificationService.sendNotification(
						a.getMemberNo(),
						senderNo,
						"TASK_DECLINED",
						"태스크 거부",
						"'" + task.getTitle() + "' 태스크가 거부되었습니다: " + reason,
						column.getTeamId(),
						task.getColumnId(),
						task.getTaskId()
					);
				}
			});
		}
	}
}
