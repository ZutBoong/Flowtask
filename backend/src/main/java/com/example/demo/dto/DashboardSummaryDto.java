package com.example.demo.dto;

public class DashboardSummaryDto {

    private long total;
    private long completed;
    private long incomplete;
    private long overdue;
    

    public DashboardSummaryDto(long total, long completed, long incomplete, long overdue) {
        this.total = total;
        this.completed = completed;
        this.incomplete = incomplete;
        this.overdue = overdue;
    }

    public long getTotal() { return total; }
    public long getCompleted() { return completed; }
    public long getIncomplete() { return incomplete; }
    public long getOverdue() { return overdue; }
}