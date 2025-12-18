package com.example.demo.model;

import lombok.Data;
import java.util.Date;
import java.util.List;

@Data
public class Section {
    private int sectionId;
    private int teamId;
    private String sectionName;
    private int position;
    private String color;
    private Date createdAt;

    // For loading tasks within section
    private List<Task> tasks;
}
