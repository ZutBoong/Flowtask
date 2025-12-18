package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("taskAssignee")
public class TaskAssignee {
    private int taskId;
    private int memberNo;
    private LocalDateTime assignedAt;
    private Integer assignedBy;

    // 워크플로우 필드 (NEW)
    private boolean accepted;        // 수락 여부
    private LocalDateTime acceptedAt; // 수락 시간
    private boolean completed;       // 완료 여부
    private LocalDateTime completedAt; // 완료 시간

    // 조인용 필드
    private String memberName;
    private String memberUserid;
}
