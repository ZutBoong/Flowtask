package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.TaskVerifier;

@Mapper
public interface TaskVerifierDao {
    int insert(TaskVerifier verifier);
    int delete(@Param("taskId") int taskId, @Param("memberNo") int memberNo);
    int deleteByTask(int taskId);
    List<TaskVerifier> listByTask(int taskId);
    List<TaskVerifier> listByMember(int memberNo);
    int countByTask(int taskId);

    // 검증 관련 메서드
    int approveTask(@Param("taskId") int taskId, @Param("memberNo") int memberNo);
    int rejectTask(@Param("taskId") int taskId, @Param("memberNo") int memberNo, @Param("reason") String reason);
    boolean allVerifiersApproved(int taskId);
    int resetApproval(int taskId);
}
