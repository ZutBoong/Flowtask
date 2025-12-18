package com.example.demo.model;

import java.sql.Date;
import org.apache.ibatis.type.Alias;
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
	private Date createdAt;
}
