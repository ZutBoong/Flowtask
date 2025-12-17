package com.example.demo.model;

import java.sql.Date;
import java.util.List;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("task")
public class Task {
	private int taskId;
	private int columnId;
	private String title;
	private String description;
	private int position;
	private Date createdAt;

	// Issue Tracker 확장 필드
	private Integer assigneeNo;      // 담당자 (FK to Member.no, nullable)
	private String assigneeName;     // 담당자 이름 (JOIN으로 조회)
	private String priority;         // CRITICAL, HIGH, MEDIUM, LOW
	private Date dueDate;            // 마감일
	private String status;           // OPEN, IN_PROGRESS, RESOLVED, CLOSED, CANNOT_REPRODUCE, DUPLICATE

	// 검증자 필드
	private Integer verifierNo;              // 검증자 (FK to Member.no, nullable)
	private String verifierName;             // 검증자 이름 (JOIN으로 조회)
	private Date verifiedAt;                 // 검증 완료 시간
	private String verificationStatus;       // NONE, PENDING, APPROVED, REJECTED
	private String verificationNotes;        // 검증 메모

	// 태그 목록
	private List<Tag> tags;

	// 복수 담당자 목록
	private List<TaskAssignee> assignees;
}
