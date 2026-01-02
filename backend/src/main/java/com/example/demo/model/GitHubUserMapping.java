package com.example.demo.model;

import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

/**
 * Synodos 멤버와 GitHub 사용자 간의 매핑 엔티티
 */
@Data
@Alias("githubUserMapping")
public class GitHubUserMapping {
    private int id;
    private int memberNo;
    private String githubUsername;
    private Long githubId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Join fields
    private String memberName;
    private String memberUserid;
    private String memberEmail;
}
