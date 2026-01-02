package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.MemberSocialLink;

@Mapper
public interface MemberSocialLinkDao {
    // 소셜 연동 추가
    int insert(MemberSocialLink link);

    // 소셜 연동 해제
    int delete(@Param("memberNo") int memberNo, @Param("provider") String provider);

    // 회원의 모든 소셜 연동 조회
    List<MemberSocialLink> findByMemberNo(int memberNo);

    // provider + provider_id로 연동 조회
    MemberSocialLink findByProviderAndProviderId(@Param("provider") String provider,
                                                  @Param("providerId") String providerId);

    // 회원의 특정 provider 연동 여부 확인
    MemberSocialLink findByMemberNoAndProvider(@Param("memberNo") int memberNo,
                                                @Param("provider") String provider);
}
