package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TaskArchiveDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.model.TaskArchive;
import com.example.demo.model.Task;
import com.example.demo.model.FlowtaskColumn;
import com.example.demo.model.Team;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class TaskArchiveService {

    @Autowired
    private TaskArchiveDao archiveDao;

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private FlowtaskColumnDao columnDao;

    @Autowired
    private TeamDao teamDao;

    private ObjectMapper objectMapper = new ObjectMapper();

    // 태스크 아카이브 생성
    public int archiveTask(int taskId, int memberNo, String archiveNote) {
        Task task = taskDao.content(taskId);
        if (task == null) {
            return 0;
        }

        // 컬럼 정보 조회
        FlowtaskColumn column = null;
        if (task.getColumnId() > 0) {
            column = columnDao.content(task.getColumnId());
        }

        // 팀 정보 조회
        Team team = null;
        if (column != null && column.getTeamId() > 0) {
            team = teamDao.findById(column.getTeamId());
        }

        // 태스크 정보를 JSON으로 변환
        String taskJson = "{}";
        try {
            taskJson = objectMapper.writeValueAsString(task);
        } catch (Exception e) {
            e.printStackTrace();
        }

        TaskArchive archive = new TaskArchive();
        archive.setMemberNo(memberNo);
        archive.setOriginalTaskId(taskId);
        archive.setTeamId(column != null ? column.getTeamId() : null);
        archive.setTeamName(team != null ? team.getTeamName() : null);
        archive.setColumnId(task.getColumnId());
        archive.setColumnTitle(column != null ? column.getTitle() : null);
        archive.setTaskSnapshot(taskJson);
        archive.setArchiveNote(archiveNote);

        return archiveDao.insert(archive);
    }

    // 아카이브 삭제
    public int deleteArchive(int archiveId) {
        return archiveDao.delete(archiveId);
    }

    // 아카이브 상세 조회
    public TaskArchive getArchive(int archiveId) {
        return archiveDao.findById(archiveId);
    }

    // 멤버별 아카이브 목록
    public List<TaskArchive> getArchivesByMember(int memberNo) {
        return archiveDao.listByMember(memberNo);
    }

    // 멤버의 아카이브 수
    public int countArchives(int memberNo) {
        return archiveDao.countByMember(memberNo);
    }
}
