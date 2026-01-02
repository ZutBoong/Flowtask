package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("synodoscolumn")
public class SynodosColumn {
	private int columnId;
	private String title;
	private int position;
	private int teamId;
	private String githubPrefix; // GitHub Issue 제목 명령어 (예: [버그], [기능])
}
