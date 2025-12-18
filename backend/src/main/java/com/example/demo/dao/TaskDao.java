package com.example.demo.dao;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.Task;

@Mapper
public interface TaskDao {
	int insert(Task task);
	List<Task> listByColumn(int columnId);
	List<Task> listAll();
	List<Task> listByTeam(int teamId);
	List<Task> listByProject(int projectId);
	Task content(int taskId);
	int update(Task task);
	int delete(int taskId);
	int updatePosition(Task task);
	int getMaxPosition(int columnId);

	// Issue Tracker 확장 메서드
	List<Task> listByAssignee(int memberNo);
	List<Task> listByStatusAndTeam(Map<String, Object> params);
	int updateAssignee(Task task);

	// 워크플로우 관련 메서드
	int updateWorkflowStatus(Task task);
	int updateRejection(Task task);
	List<Task> listPendingVerification(int memberNo);

	// 캘린더용 날짜 범위 조회
	List<Task> listByDateRange(Map<String, Object> params);

	// 섹션별 조회
	List<Task> listBySection(int sectionId);

	// 섹션 업데이트
	int updateSection(Task task);

	// 날짜 업데이트 (타임라인용)
	int updateDates(Task task);
}
