package com.example.demo.dao;

import com.example.demo.model.TaskGitHubIssue;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * Task-GitHub Issue 매핑 DAO
 */
@Mapper
public interface TaskGitHubIssueDao {

    // 기본 CRUD
    int insert(TaskGitHubIssue mapping);
    TaskGitHubIssue findById(int id);
    int update(TaskGitHubIssue mapping);
    int delete(int id);

    // Task 기준 조회
    TaskGitHubIssue findByTaskId(int taskId);

    // Team + Issue Number 기준 조회
    TaskGitHubIssue findByTeamAndIssue(@Param("teamId") int teamId, @Param("issueNumber") int issueNumber);

    // Team별 전체 매핑 조회
    List<TaskGitHubIssue> listByTeam(int teamId);

    // 동기화 상태별 조회
    List<TaskGitHubIssue> listByStatus(@Param("teamId") int teamId, @Param("syncStatus") String syncStatus);

    // 충돌 상태 조회 (전체)
    List<TaskGitHubIssue> listConflicts(int teamId);

    // 동기화 상태 업데이트
    int updateSyncStatus(@Param("id") int id, @Param("syncStatus") String syncStatus);

    // Synodos 측 업데이트 시간 갱신
    int updateSynodosTimestamp(int taskId);

    // GitHub 측 업데이트 시간 갱신
    int updateGithubTimestamp(@Param("teamId") int teamId, @Param("issueNumber") int issueNumber);

    // 마지막 동기화 시간 갱신
    int updateLastSyncedAt(int id);

    // Task 기준 삭제
    int deleteByTaskId(int taskId);

    // 존재 여부 확인
    int countByTaskId(int taskId);
    int countByTeamAndIssue(@Param("teamId") int teamId, @Param("issueNumber") int issueNumber);
}
