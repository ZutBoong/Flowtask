package com.example.demo.dao;

import com.example.demo.model.GitHubUserMapping;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * GitHub 사용자 매핑 DAO
 */
@Mapper
public interface GitHubUserMappingDao {

    // 기본 CRUD
    int insert(GitHubUserMapping mapping);
    GitHubUserMapping findById(int id);
    int update(GitHubUserMapping mapping);
    int delete(int id);

    // 멤버 번호로 조회
    GitHubUserMapping findByMemberNo(int memberNo);

    // GitHub 사용자명으로 조회
    GitHubUserMapping findByGithubUsername(String githubUsername);

    // 팀의 모든 멤버 매핑 조회 (team_member JOIN)
    List<GitHubUserMapping> listByTeam(int teamId);

    // 전체 매핑 조회
    List<GitHubUserMapping> listAll();

    // GitHub 사용자명 목록으로 Synodos 멤버 번호 조회
    List<GitHubUserMapping> findByGithubUsernames(@Param("usernames") List<String> usernames);

    // 멤버 번호로 삭제
    int deleteByMemberNo(int memberNo);

    // 존재 여부 확인
    int countByMemberNo(int memberNo);
    int countByGithubUsername(String githubUsername);
}
