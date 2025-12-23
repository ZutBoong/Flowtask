package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("taskFavorite")
public class TaskFavorite {
    private int taskId;
    private int memberNo;
    private LocalDateTime createdAt;

    // 조인용 필드 (Task 정보)
    private String title;
    private String description;
    private String workflowStatus;
    private String priority;
    private LocalDateTime dueDate;
    private int columnId;
    private String columnTitle;
    private int teamId;
    private String teamName;
}
