package com.example.demo.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.DashboardSummaryDto;
import com.example.demo.dto.TaskCompletionTrendDto;
import com.example.demo.dto.WorkloadByDayDto;
import com.example.demo.service.DashboardService;

@RestController
@RequestMapping("/api/teams")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/{teamId}/dashboard")
    public DashboardSummaryDto getDashboard(@PathVariable Long teamId) {
        return dashboardService.getSummary(teamId);
    }

    @GetMapping("/{teamId}/dashboard/workload-by-day")
    public List<WorkloadByDayDto> getWorkloadByDay(
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "7") int days) {
        return dashboardService.getWorkloadByDay(teamId, days);
    }

    @GetMapping("/{teamId}/dashboard/completion-trend")
    public List<TaskCompletionTrendDto> getCompletionTrend(
            @PathVariable Long teamId) {
        return dashboardService.getCompletionTrend(teamId);
    }

}