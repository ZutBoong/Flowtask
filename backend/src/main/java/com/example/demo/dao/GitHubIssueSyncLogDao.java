package com.example.demo.dao;

import com.example.demo.model.GitHubIssueSyncLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * GitHub Issue 동기화 로그 DAO
 */
@Mapper
public interface GitHubIssueSyncLogDao {

    // 기본 CRUD
    int insert(GitHubIssueSyncLog log);
    GitHubIssueSyncLog findById(int id);

    // Task별 로그 조회
    List<GitHubIssueSyncLog> listByTaskId(@Param("taskId") int taskId, @Param("limit") int limit);

    // Team별 로그 조회
    List<GitHubIssueSyncLog> listByTeamId(@Param("teamId") int teamId, @Param("limit") int limit);

    // 매핑별 로그 조회
    List<GitHubIssueSyncLog> listByMappingId(@Param("mappingId") int mappingId, @Param("limit") int limit);

    // 실패한 로그 조회
    List<GitHubIssueSyncLog> listFailedByTeam(@Param("teamId") int teamId, @Param("limit") int limit);

    // Webhook delivery ID로 중복 체크
    int countByWebhookDeliveryId(String webhookDeliveryId);

    // 오래된 로그 삭제 (정리용)
    int deleteOlderThan(@Param("days") int days);
}
