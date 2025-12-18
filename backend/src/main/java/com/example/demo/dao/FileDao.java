package com.example.demo.dao;

import com.example.demo.model.ProjectFile;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface FileDao {
    int insert(ProjectFile file);
    List<ProjectFile> listByTeam(int teamId);
    List<ProjectFile> listByTask(int taskId);
    ProjectFile getById(int fileId);
    int delete(int fileId);
}
