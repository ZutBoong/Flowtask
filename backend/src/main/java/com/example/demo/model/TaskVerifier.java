package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("taskVerifier")
public class TaskVerifier {
    private int taskId;
    private int memberNo;
    private LocalDateTime assignedAt;

    // 검증 상태 필드
    private boolean approved;        // 승인 여부
    private LocalDateTime approvedAt; // 승인/반려 시간
    private String rejectionReason;  // 반려 사유

    // 조인용 필드
    private String memberName;
    private String memberUserid;
}
