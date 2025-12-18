package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.TaskVerifier;
import com.example.demo.service.TaskVerifierService;
import com.example.demo.service.TaskWorkflowService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/task")
public class TaskVerifierController {

	@Autowired
	private TaskVerifierService verifierService;

	@Autowired
	private TaskWorkflowService workflowService;

	/**
	 * 태스크의 검증자 목록 조회
	 * GET /api/task/{taskId}/verifiers
	 */
	@GetMapping("/{taskId}/verifiers")
	public List<TaskVerifier> getVerifiers(@PathVariable("taskId") int taskId) {
		List<TaskVerifier> verifiers = verifierService.listByTask(taskId);
		System.out.println("verifiers for task " + taskId + ": " + verifiers);
		return verifiers;
	}

	/**
	 * 검증자 추가
	 * POST /api/task/{taskId}/verifier
	 * Body: { "memberNo": 123 }
	 */
	@PostMapping("/{taskId}/verifier")
	public ResponseEntity<?> addVerifier(
			@PathVariable("taskId") int taskId,
			@RequestBody Map<String, Integer> body,
			@RequestParam(value = "senderNo", required = false) Integer senderNo) {
		Integer memberNo = body.get("memberNo");
		if (memberNo == null) {
			return ResponseEntity.badRequest().body(Map.of("error", "memberNo is required"));
		}

		TaskVerifier verifier = new TaskVerifier();
		verifier.setTaskId(taskId);
		verifier.setMemberNo(memberNo);

		int result;
		if (senderNo != null) {
			result = verifierService.addVerifierWithNotification(verifier, senderNo);
		} else {
			result = verifierService.addVerifier(verifier);
		}

		if (result == 1) {
			System.out.println("검증자 추가 성공: taskId=" + taskId + ", memberNo=" + memberNo);
			// 워크플로우 상태 재계산
			workflowService.recalculateStatus(taskId);
			return ResponseEntity.ok(Map.of("result", result));
		} else {
			return ResponseEntity.badRequest().body(Map.of("error", "검증자 추가 실패"));
		}
	}

	/**
	 * 검증자 제거
	 * DELETE /api/task/{taskId}/verifier/{memberNo}
	 */
	@DeleteMapping("/{taskId}/verifier/{memberNo}")
	public ResponseEntity<?> removeVerifier(
			@PathVariable("taskId") int taskId,
			@PathVariable("memberNo") int memberNo) {
		int result = verifierService.removeVerifier(taskId, memberNo);
		if (result == 1) {
			System.out.println("검증자 제거 성공: taskId=" + taskId + ", memberNo=" + memberNo);
			// 워크플로우 상태 재계산
			workflowService.recalculateStatus(taskId);
			return ResponseEntity.ok(Map.of("result", result));
		} else {
			return ResponseEntity.badRequest().body(Map.of("error", "검증자 제거 실패"));
		}
	}

	/**
	 * 검증자 일괄 변경
	 * PUT /api/task/{taskId}/verifiers
	 * Body: { "memberNos": [1, 2, 3] }
	 */
	@SuppressWarnings("unchecked")
	@PutMapping("/{taskId}/verifiers")
	public ResponseEntity<?> updateVerifiers(
			@PathVariable("taskId") int taskId,
			@RequestBody Map<String, Object> body,
			@RequestParam(value = "senderNo", required = false) Integer senderNo) {
		List<Integer> memberNos = (List<Integer>) body.get("memberNos");

		int count;
		if (senderNo != null) {
			count = verifierService.updateVerifiersWithNotification(taskId, memberNos, senderNo);
		} else {
			count = verifierService.updateVerifiers(taskId, memberNos);
		}

		System.out.println("검증자 일괄 변경: taskId=" + taskId + ", count=" + count);
		// 워크플로우 상태 재계산
		workflowService.recalculateStatus(taskId);
		return ResponseEntity.ok(Map.of("count", count));
	}
}
