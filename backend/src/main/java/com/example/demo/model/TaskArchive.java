package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("taskArchive")
public class TaskArchive {
    private int archiveId;
    private int memberNo;
    private int originalTaskId;
    private Integer teamId;
    private String teamName;
    private Integer columnId;
    private String columnTitle;
    private String taskSnapshot;  // JSON 문자열
    private String archiveNote;
    private LocalDateTime archivedAt;
}
