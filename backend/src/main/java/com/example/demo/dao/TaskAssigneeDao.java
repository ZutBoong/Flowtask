package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.TaskAssignee;

@Mapper
public interface TaskAssigneeDao {
    int insert(TaskAssignee assignee);
    int delete(@Param("taskId") int taskId, @Param("memberNo") int memberNo);
    int deleteByTask(int taskId);
    List<TaskAssignee> listByTask(int taskId);
    List<TaskAssignee> listByMember(int memberNo);
    int countByTask(int taskId);
}
