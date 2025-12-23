package com.example.demo.controller;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Task;
import com.example.demo.service.TaskWorkflowService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/task/workflow")
public class TaskWorkflowController {

	@Autowired
	private TaskWorkflowService workflowService;

	/**
	 * 담당자가 태스크를 수락
	 * POST /api/task/workflow/{taskId}/accept?memberNo=123
	 */
	@PostMapping("/{taskId}/accept")
	public ResponseEntity<?> acceptTask(
			@PathVariable("taskId") int taskId,
			@RequestParam("memberNo") int memberNo) {
		try {
			Task task = workflowService.acceptTask(taskId, memberNo);
			System.out.println("태스크 수락 완료: taskId=" + taskId + ", memberNo=" + memberNo);
			return ResponseEntity.ok(task);
		} catch (IllegalArgumentException | IllegalStateException e) {
			System.out.println("태스크 수락 실패: " + e.getMessage());
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	/**
	 * 담당자가 태스크 완료 처리
	 * POST /api/task/workflow/{taskId}/complete?memberNo=123
	 */
	@PostMapping("/{taskId}/complete")
	public ResponseEntity<?> completeTask(
			@PathVariable("taskId") int taskId,
			@RequestParam("memberNo") int memberNo) {
		try {
			Task task = workflowService.completeTask(taskId, memberNo);
			System.out.println("태스크 완료 처리: taskId=" + taskId + ", memberNo=" + memberNo);
			return ResponseEntity.ok(task);
		} catch (IllegalArgumentException | IllegalStateException e) {
			System.out.println("태스크 완료 처리 실패: " + e.getMessage());
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	/**
	 * 검증자가 태스크를 승인
	 * POST /api/task/workflow/{taskId}/approve?memberNo=123
	 */
	@PostMapping("/{taskId}/approve")
	public ResponseEntity<?> approveTask(
			@PathVariable("taskId") int taskId,
			@RequestParam("memberNo") int memberNo) {
		try {
			Task task = workflowService.approveTask(taskId, memberNo);
			System.out.println("태스크 승인 완료: taskId=" + taskId + ", memberNo=" + memberNo);
			return ResponseEntity.ok(task);
		} catch (IllegalArgumentException | IllegalStateException e) {
			System.out.println("태스크 승인 실패: " + e.getMessage());
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	/**
	 * 검증자가 태스크를 반려
	 * POST /api/task/workflow/{taskId}/reject?memberNo=123
	 * Body: { "reason": "반려 사유" }
	 */
	@PostMapping("/{taskId}/reject")
	public ResponseEntity<?> rejectTask(
			@PathVariable("taskId") int taskId,
			@RequestParam("memberNo") int memberNo,
			@RequestBody Map<String, String> body) {
		try {
			String reason = body.get("reason");
			if (reason == null || reason.trim().isEmpty()) {
				return ResponseEntity.badRequest().body(Map.of("error", "반려 사유를 입력해주세요"));
			}
			Task task = workflowService.rejectTask(taskId, memberNo, reason);
			System.out.println("태스크 반려 완료: taskId=" + taskId + ", memberNo=" + memberNo + ", reason=" + reason);
			return ResponseEntity.ok(task);
		} catch (IllegalArgumentException | IllegalStateException e) {
			System.out.println("태스크 반려 실패: " + e.getMessage());
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	/**
	 * 담당자가 태스크를 거부
	 * POST /api/task/workflow/{taskId}/decline?memberNo=123
	 * Body: { "reason": "거부 사유" }
	 */
	@PostMapping("/{taskId}/decline")
	public ResponseEntity<?> declineTask(
			@PathVariable("taskId") int taskId,
			@RequestParam("memberNo") int memberNo,
			@RequestBody Map<String, String> body) {
		try {
			String reason = body.get("reason");
			if (reason == null || reason.trim().isEmpty()) {
				return ResponseEntity.badRequest().body(Map.of("error", "거부 사유를 입력해주세요"));
			}
			Task task = workflowService.declineTask(taskId, memberNo, reason);
			System.out.println("태스크 거부 완료: taskId=" + taskId + ", memberNo=" + memberNo + ", reason=" + reason);
			return ResponseEntity.ok(task);
		} catch (IllegalArgumentException | IllegalStateException e) {
			System.out.println("태스크 거부 실패: " + e.getMessage());
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	/**
	 * 반려된 태스크 재작업 시작
	 * POST /api/task/workflow/{taskId}/restart?memberNo=123
	 */
	@PostMapping("/{taskId}/restart")
	public ResponseEntity<?> restartTask(
			@PathVariable("taskId") int taskId,
			@RequestParam("memberNo") int memberNo) {
		try {
			Task task = workflowService.restartTask(taskId, memberNo);
			System.out.println("태스크 재작업 시작: taskId=" + taskId + ", memberNo=" + memberNo);
			return ResponseEntity.ok(task);
		} catch (IllegalArgumentException | IllegalStateException e) {
			System.out.println("태스크 재작업 시작 실패: " + e.getMessage());
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}
}
