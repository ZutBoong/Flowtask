package com.example.demo.model;

import lombok.Data;
import java.util.Date;

@Data
public class ProjectFile {
    private int fileId;
    private Integer teamId;
    private Integer taskId;
    private int uploaderNo;
    private String uploaderName;    // JOIN으로 조회
    private String originalName;
    private String storedName;
    private String filePath;
    private long fileSize;
    private String mimeType;
    private Date uploadedAt;

    // 태스크 연결 정보
    private String taskTitle;       // JOIN으로 조회
}
