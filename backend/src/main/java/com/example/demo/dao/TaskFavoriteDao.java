package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.TaskFavorite;

@Mapper
public interface TaskFavoriteDao {
    int insert(TaskFavorite favorite);
    int delete(@Param("taskId") int taskId, @Param("memberNo") int memberNo);
    List<TaskFavorite> listByMember(int memberNo);
    List<TaskFavorite> listByMemberAndTeam(@Param("memberNo") int memberNo, @Param("teamId") int teamId);
    TaskFavorite findOne(@Param("taskId") int taskId, @Param("memberNo") int memberNo);
    int countByMember(int memberNo);
}
