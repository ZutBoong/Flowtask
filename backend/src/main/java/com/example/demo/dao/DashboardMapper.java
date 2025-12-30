package com.example.demo.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.example.demo.dto.TaskCompletionTrendDto;
import com.example.demo.dto.WorkloadByDayDto;

@Mapper
public interface DashboardMapper {

    @Select("""
                SELECT COUNT(*)
                FROM task t
                JOIN columns c ON t.column_id = c.column_id
                WHERE c.team_id = #{teamId}
            """)
    long countTotalTasks(@Param("teamId") Long teamId);

    @Select("""
                SELECT COUNT(*)
                FROM task t
                JOIN columns c ON t.column_id = c.column_id
                WHERE c.team_id = #{teamId}
                  AND t.workflow_status = 'DONE'
            """)
    long countCompletedTasks(@Param("teamId") Long teamId);

    @Select("""
                SELECT COUNT(*)
                FROM task t
                JOIN columns c ON t.column_id = c.column_id
                WHERE c.team_id = #{teamId}
                  AND t.workflow_status <> 'DONE'
            """)
    long countIncompleteTasks(@Param("teamId") Long teamId);

    @Select("""
                SELECT COUNT(*)
                FROM task t
                JOIN columns c ON t.column_id = c.column_id
                WHERE c.team_id = #{teamId}
                  AND t.workflow_status <> 'DONE'
                  AND t.due_date IS NOT NULL
                  AND t.due_date < NOW()
            """)
    long countOverdueTasks(@Param("teamId") Long teamId);

    @Select("""
                SELECT
                    d.date::text AS date,
                    COUNT(t.task_id) AS workload
                FROM (
                    SELECT CURRENT_DATE - gs AS date
                    FROM generate_series(0, #{days} - 1) gs
                ) d
                LEFT JOIN task t
                  ON t.created_at::date = d.date
                 AND t.workflow_status <> 'DONE'
                LEFT JOIN columns c
                  ON t.column_id = c.column_id
                 AND c.team_id = #{teamId}
                GROUP BY d.date
                ORDER BY d.date
            """)
    List<WorkloadByDayDto> selectWorkloadByDay(
            @Param("teamId") Long teamId,
            @Param("days") int days);

    @Select("""
                SELECT
                  d.date,
                  COUNT(t.task_id) AS total,
                  COUNT(CASE WHEN t.workflow_status = 'DONE' THEN 1 END) AS completed
                FROM (
                  SELECT generate_series(
                    CURRENT_DATE - INTERVAL '14 days',
                    CURRENT_DATE,
                    INTERVAL '1 day'
                  )::date AS date
                ) d
                LEFT JOIN task t
                  ON DATE(t.created_at) <= d.date
                LEFT JOIN columns c
                  ON t.column_id = c.column_id
                WHERE c.team_id = #{teamId}
                GROUP BY d.date
                ORDER BY d.date
            """)
    List<TaskCompletionTrendDto> getCompletionTrend(@Param("teamId") Long teamId);

}