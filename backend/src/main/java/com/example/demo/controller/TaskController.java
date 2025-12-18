package com.example.demo.controller;

import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Task;
import com.example.demo.service.TaskService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api")
public class TaskController {

	@Autowired
	private TaskService service;

	// 태스크 생성
	@PostMapping("taskwrite")
	public Integer taskwrite(@RequestBody Task task) {
		System.out.println("task insert: " + task);
		// 새 태스크의 position 설정
		int maxPos = service.getMaxPosition(task.getColumnId());
		task.setPosition(maxPos + 1);
		int result = service.insert(task);
		if (result == 1)
			System.out.println("태스크 생성 성공");
		return result;
	}

	// 전체 태스크 목록
	@GetMapping("tasklist")
	public List<Task> tasklist() {
		List<Task> list = service.listAll();
		System.out.println("tasklist: " + list);
		return list;
	}

	// 컬럼별 태스크 목록
	@GetMapping("tasklist/{columnId}")
	public List<Task> tasklistByColumn(@PathVariable("columnId") int columnId) {
		List<Task> list = service.listByColumn(columnId);
		System.out.println("tasklist by column: " + list);
		return list;
	}

	// 팀별 태스크 목록
	@GetMapping("tasklist/team/{teamId}")
	public List<Task> tasklistByTeam(@PathVariable("teamId") int teamId) {
		List<Task> list = service.listByTeam(teamId);
		System.out.println("tasklist by team: " + list);
		return list;
	}

	// 프로젝트별 태스크 목록
	@GetMapping("tasklist/project/{projectId}")
	public List<Task> tasklistByProject(@PathVariable("projectId") int projectId) {
		List<Task> list = service.listByProject(projectId);
		System.out.println("tasklist by project: " + list);
		return list;
	}

	// 태스크 상세
	@GetMapping("taskcontent/{taskId}")
	public Task taskcontent(@PathVariable("taskId") int taskId) {
		Task result = service.content(taskId);
		System.out.println("task content: " + result);
		return result;
	}

	// 태스크 수정
	@PutMapping("taskupdate")
	public Integer taskupdate(@RequestBody Task task) {
		System.out.println("task update: " + task);
		int result = service.update(task);
		if (result == 1)
			System.out.println("태스크 수정 성공");
		return result;
	}

	// 태스크 삭제
	@DeleteMapping("taskdelete/{taskId}")
	public Integer taskdelete(@PathVariable("taskId") int taskId) {
		System.out.println("task delete: " + taskId);
		int result = service.delete(taskId);
		if (result == 1)
			System.out.println("태스크 삭제 성공");
		return result;
	}

	// 태스크 위치/컬럼 변경 (드래그앤드롭)
	@PutMapping("taskposition")
	public Integer taskposition(@RequestBody Task task) {
		System.out.println("task position update: " + task);
		int result = service.updatePosition(task);
		return result;
	}

	// ========== Issue Tracker 확장 엔드포인트 ==========

	// 담당자별 태스크 목록 (내 이슈)
	@GetMapping("tasklist/assignee/{memberNo}")
	public List<Task> tasklistByAssignee(@PathVariable("memberNo") int memberNo) {
		List<Task> list = service.listByAssignee(memberNo);
		System.out.println("tasklist by assignee: " + list);
		return list;
	}

	// 상태별 태스크 목록 (팀 내)
	@GetMapping("tasklist/team/{teamId}/status/{status}")
	public List<Task> tasklistByStatusAndTeam(
			@PathVariable("teamId") int teamId,
			@PathVariable("status") String status) {
		List<Task> list = service.listByStatusAndTeam(teamId, status);
		System.out.println("tasklist by status: " + list);
		return list;
	}

	// 태스크 상태만 변경
	@PutMapping("task/{taskId}/status")
	public Integer updateTaskStatus(
			@PathVariable("taskId") int taskId,
			@RequestBody Task task) {
		task.setTaskId(taskId);
		System.out.println("task status update: " + task);
		int result = service.updateStatus(task);
		if (result == 1)
			System.out.println("태스크 상태 변경 성공");
		return result;
	}

	// 태스크 담당자만 변경
	@PutMapping("task/{taskId}/assignee")
	public Integer updateTaskAssignee(
			@PathVariable("taskId") int taskId,
			@RequestBody Task task,
			@RequestParam(value = "senderNo", required = false) Integer senderNo) {
		task.setTaskId(taskId);
		System.out.println("task assignee update: " + task);
		int result;
		if (senderNo != null) {
			// senderNo가 있으면 알림 포함
			result = service.updateAssigneeWithNotification(task, senderNo);
		} else {
			result = service.updateAssignee(task);
		}
		if (result == 1)
			System.out.println("태스크 담당자 변경 성공");
		return result;
	}

	// ========== 검증자(Verifier) 엔드포인트 ==========

	// 검증자 지정
	@PutMapping("task/{taskId}/verifier")
	public Integer updateTaskVerifier(
			@PathVariable("taskId") int taskId,
			@RequestBody Task task) {
		task.setTaskId(taskId);
		System.out.println("task verifier update: " + task);
		int result = service.updateVerifier(task);
		if (result == 1)
			System.out.println("태스크 검증자 지정 성공");
		return result;
	}

	// 검증 승인
	@PutMapping("task/{taskId}/verify/approve")
	public Integer approveTask(
			@PathVariable("taskId") int taskId,
			@RequestBody(required = false) Task task) {
		if (task == null) task = new Task();
		task.setTaskId(taskId);
		task.setVerificationStatus("APPROVED");
		System.out.println("task verification approve: " + task);
		int result = service.updateVerification(task);
		if (result == 1)
			System.out.println("태스크 검증 승인 성공");
		return result;
	}

	// 검증 반려
	@PutMapping("task/{taskId}/verify/reject")
	public Integer rejectTask(
			@PathVariable("taskId") int taskId,
			@RequestBody(required = false) Task task) {
		if (task == null) task = new Task();
		task.setTaskId(taskId);
		task.setVerificationStatus("REJECTED");
		System.out.println("task verification reject: " + task);
		int result = service.updateVerification(task);
		if (result == 1)
			System.out.println("태스크 검증 반려 성공");
		return result;
	}

	// 내 검증 대기 목록
	@GetMapping("tasklist/verification/pending/{memberNo}")
	public List<Task> tasklistPendingVerification(@PathVariable("memberNo") int memberNo) {
		List<Task> list = service.listPendingVerification(memberNo);
		System.out.println("tasklist pending verification: " + list);
		return list;
	}

	// ========== 캘린더 엔드포인트 ==========

	// 팀별 날짜 범위 태스크 조회 (캘린더용)
	@GetMapping("tasklist/team/{teamId}/calendar")
	public List<Task> tasklistByDateRange(
			@PathVariable("teamId") int teamId,
			@RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
			@RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
		System.out.println("calendar tasklist: team=" + teamId + ", start=" + startDate + ", end=" + endDate);
		List<Task> list = service.listByDateRange(teamId, startDate, endDate);
		System.out.println("calendar tasklist result: " + list.size() + "개");
		return list;
	}

	// ========== 섹션/타임라인 엔드포인트 ==========

	// 섹션별 태스크 목록
	@GetMapping("tasklist/section/{sectionId}")
	public List<Task> tasklistBySection(@PathVariable("sectionId") int sectionId) {
		List<Task> list = service.listBySection(sectionId);
		System.out.println("tasklist by section: " + list);
		return list;
	}

	// 태스크 섹션 변경
	@PutMapping("task/{taskId}/section")
	public Integer updateTaskSection(
			@PathVariable("taskId") int taskId,
			@RequestBody Task task) {
		task.setTaskId(taskId);
		System.out.println("task section update: " + task);
		int result = service.updateSection(task);
		if (result == 1)
			System.out.println("태스크 섹션 변경 성공");
		return result;
	}

	// 태스크 날짜 변경 (타임라인용)
	@PutMapping("task/{taskId}/dates")
	public Integer updateTaskDates(
			@PathVariable("taskId") int taskId,
			@RequestBody Task task) {
		task.setTaskId(taskId);
		System.out.println("task dates update: " + task);
		int result = service.updateDates(task);
		if (result == 1)
			System.out.println("태스크 날짜 변경 성공");
		return result;
	}
}
