package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.TaskFavoriteDao;
import com.example.demo.model.TaskFavorite;

@Service
public class TaskFavoriteService {

    @Autowired
    private TaskFavoriteDao dao;

    public int addFavorite(int taskId, int memberNo) {
        TaskFavorite favorite = new TaskFavorite();
        favorite.setTaskId(taskId);
        favorite.setMemberNo(memberNo);
        return dao.insert(favorite);
    }

    public int removeFavorite(int taskId, int memberNo) {
        return dao.delete(taskId, memberNo);
    }

    public List<TaskFavorite> getFavoritesByMember(int memberNo) {
        return dao.listByMember(memberNo);
    }

    public List<TaskFavorite> getFavoritesByMemberAndTeam(int memberNo, int teamId) {
        return dao.listByMemberAndTeam(memberNo, teamId);
    }

    public boolean isFavorite(int taskId, int memberNo) {
        return dao.findOne(taskId, memberNo) != null;
    }

    public int countFavorites(int memberNo) {
        return dao.countByMember(memberNo);
    }

    // 즐겨찾기 토글
    public boolean toggleFavorite(int taskId, int memberNo) {
        TaskFavorite existing = dao.findOne(taskId, memberNo);
        if (existing != null) {
            dao.delete(taskId, memberNo);
            return false; // 즐겨찾기 해제됨
        } else {
            TaskFavorite favorite = new TaskFavorite();
            favorite.setTaskId(taskId);
            favorite.setMemberNo(memberNo);
            dao.insert(favorite);
            return true; // 즐겨찾기 추가됨
        }
    }
}
