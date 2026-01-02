package com.example.demo.model;

import java.sql.Date;
import java.util.HashMap;
import java.util.Map;
import org.apache.ibatis.type.Alias;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

@Data
@Alias("team")
public class Team {
	private int teamId;
	private String teamName;
	private String teamCode;
	private int leaderNo;
	private String leaderName; // 조회용
	private String description; // 팀 설명
	private String githubRepoUrl; // GitHub 저장소 URL
	private String githubAccessToken; // GitHub Personal Access Token
	private Boolean githubIssueSyncEnabled; // GitHub Issue 동기화 활성화 여부
	private Integer githubDefaultColumnId; // Issue에서 Task 생성 시 기본 컬럼
	private String githubColumnMappings; // JSON: {"[버그]": 1, "[기능]": 2} 형태로 명령어 → 컬럼ID 매핑
	private Date createdAt;

	// JSON 문자열을 Map으로 변환
	public Map<String, Integer> getColumnMappingsAsMap() {
		if (githubColumnMappings == null || githubColumnMappings.isEmpty()) {
			return new HashMap<>();
		}
		try {
			ObjectMapper mapper = new ObjectMapper();
			return mapper.readValue(githubColumnMappings, new TypeReference<Map<String, Integer>>() {});
		} catch (Exception e) {
			return new HashMap<>();
		}
	}

	// Map을 JSON 문자열로 변환하여 저장
	public void setColumnMappingsFromMap(Map<String, Integer> mappings) {
		if (mappings == null || mappings.isEmpty()) {
			this.githubColumnMappings = null;
			return;
		}
		try {
			ObjectMapper mapper = new ObjectMapper();
			this.githubColumnMappings = mapper.writeValueAsString(mappings);
		} catch (Exception e) {
			this.githubColumnMappings = null;
		}
	}
}
