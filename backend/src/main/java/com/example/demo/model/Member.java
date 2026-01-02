package com.example.demo.model;

import java.sql.Date;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("member")
public class Member {
	private int no;
	private String userid;
	private String password;
	private String name;
	private String email;
	private String phone;
	private boolean emailVerified;
	private String profileImage;
	private Date register;

	// 소셜 로그인
	private String provider;              // google, naver, kakao, null(일반)
	private String providerId;            // OAuth provider에서 받은 고유 ID

	// GitHub 연동
	private String githubUsername;
	private String githubAccessToken;
	private Date githubConnectedAt;
}
