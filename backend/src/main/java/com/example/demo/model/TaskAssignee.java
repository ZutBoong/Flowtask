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

    // 조인용 필드
    private String memberName;
    private String memberUserid;
}
