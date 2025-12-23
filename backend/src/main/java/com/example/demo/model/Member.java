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
}
