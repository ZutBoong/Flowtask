package com.example.demo.dto;

public class TaskCompletionTrendDto {

    private String date;
    private long total;
    private long completed;

    public TaskCompletionTrendDto(String date, long total, long completed) {
        this.date = date;
        this.total = total;
        this.completed = completed;
    }

    public String getDate() { return date; }
    public long getTotal() { return total; }
    public long getCompleted() { return completed; }
}
