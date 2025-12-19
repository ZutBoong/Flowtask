package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.TaskArchive;

@Mapper
public interface TaskArchiveDao {
    int insert(TaskArchive archive);
    int delete(int archiveId);
    TaskArchive findById(int archiveId);
    List<TaskArchive> listByMember(int memberNo);
    int countByMember(int memberNo);
}
