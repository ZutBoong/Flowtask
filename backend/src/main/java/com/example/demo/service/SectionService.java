package com.example.demo.service;

import com.example.demo.dao.SectionDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.model.Section;
import com.example.demo.model.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SectionService {

    @Autowired
    private SectionDao sectionDao;

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private BoardNotificationService boardNotificationService;

    @Transactional
    public Section create(Section section) {
        if (section.getColor() == null || section.getColor().isEmpty()) {
            section.setColor("#6c757d");
        }
        // Set position to max + 1
        int maxPos = sectionDao.getMaxPosition(section.getTeamId());
        section.setPosition(maxPos + 1);

        sectionDao.insert(section);

        // Notify via WebSocket
        boardNotificationService.notifySectionCreated(section, section.getTeamId());

        return section;
    }

    public List<Section> listByTeam(int teamId) {
        return sectionDao.listByTeam(teamId);
    }

    public List<Section> listByTeamWithTasks(int teamId) {
        List<Section> sections = sectionDao.listByTeam(teamId);
        for (Section section : sections) {
            List<Task> tasks = taskDao.listBySection(section.getSectionId());
            section.setTasks(tasks);
        }
        return sections;
    }

    public Section getById(int sectionId) {
        return sectionDao.getById(sectionId);
    }

    @Transactional
    public int update(Section section) {
        int result = sectionDao.update(section);
        if (result > 0) {
            Section updated = sectionDao.getById(section.getSectionId());
            boardNotificationService.notifySectionUpdated(updated, updated.getTeamId());
        }
        return result;
    }

    @Transactional
    public int updatePosition(Section section) {
        return sectionDao.updatePosition(section);
    }

    @Transactional
    public int delete(int sectionId) {
        Section section = sectionDao.getById(sectionId);
        int result = sectionDao.delete(sectionId);
        if (result > 0 && section != null) {
            boardNotificationService.notifySectionDeleted(sectionId, section.getTeamId());
        }
        return result;
    }
}
