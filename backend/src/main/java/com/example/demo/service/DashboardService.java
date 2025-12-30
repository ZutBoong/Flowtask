package com.example.demo.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.demo.dao.DashboardMapper;
import com.example.demo.dto.DashboardSummaryDto;
import com.example.demo.dto.TaskCompletionTrendDto;
import com.example.demo.dto.WorkloadByDayDto;

@Service
public class DashboardService {

    private final DashboardMapper dashboardMapper;

    public DashboardService(DashboardMapper dashboardMapper) {
        this.dashboardMapper = dashboardMapper;
    }

    public DashboardSummaryDto getSummary(Long teamId) {

        long total = dashboardMapper.countTotalTasks(teamId);
        long completed = dashboardMapper.countCompletedTasks(teamId);
        long incomplete = dashboardMapper.countIncompleteTasks(teamId);
        long overdue = dashboardMapper.countOverdueTasks(teamId);

        return new DashboardSummaryDto(
            total, completed, incomplete, overdue
        );
    }

    public List<WorkloadByDayDto> getWorkloadByDay(Long teamId, int days) {
        return dashboardMapper.selectWorkloadByDay(teamId, days);
    }

    public List<TaskCompletionTrendDto> getCompletionTrend(Long teamId) {
    return dashboardMapper.getCompletionTrend(teamId);
    }

}