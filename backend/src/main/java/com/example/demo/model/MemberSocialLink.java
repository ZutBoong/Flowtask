package com.example.demo.model;

import java.sql.Timestamp;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("memberSocialLink")
public class MemberSocialLink {
    private int id;
    private int memberNo;
    private String provider;      // google, naver, kakao
    private String providerId;    // OAuth provider에서 받은 고유 ID
    private String email;         // 소셜 계정 이메일
    private String name;          // 소셜 계정 이름
    private Timestamp linkedAt;
}
