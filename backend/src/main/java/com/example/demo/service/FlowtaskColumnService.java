package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.model.FlowtaskColumn;

@Service
public class FlowtaskColumnService {

	@Autowired
	private FlowtaskColumnDao dao;

	@Autowired
	private BoardNotificationService notificationService;

	public int insert(FlowtaskColumn column) {
		int result = dao.insert(column);
		if (result == 1) {
			// Fetch latest columns to get the created one with generated ID
			List<FlowtaskColumn> columns = dao.listByTeam(column.getTeamId());
			if (!columns.isEmpty()) {
				FlowtaskColumn created = columns.get(columns.size() - 1);
				notificationService.notifyColumnCreated(created);
			}
		}
		return result;
	}

	public List<FlowtaskColumn> list() {
		return dao.list();
	}

	public List<FlowtaskColumn> listByTeam(int teamId) {
		return dao.listByTeam(teamId);
	}

	public List<FlowtaskColumn> listByProject(int projectId) {
		return dao.listByProject(projectId);
	}

	public FlowtaskColumn content(int columnId) {
		return dao.content(columnId);
	}

	public int update(FlowtaskColumn column) {
		int result = dao.update(column);
		if (result == 1) {
			FlowtaskColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnUpdated(updated);
			}
		}
		return result;
	}

	public int delete(int columnId) {
		FlowtaskColumn column = dao.content(columnId);
		int result = dao.delete(columnId);
		if (result == 1 && column != null) {
			notificationService.notifyColumnDeleted(column.getTeamId(), columnId);
		}
		return result;
	}

	public int updatePosition(FlowtaskColumn column) {
		int result = dao.updatePosition(column);
		if (result == 1) {
			FlowtaskColumn updated = dao.content(column.getColumnId());
			if (updated != null) {
				notificationService.notifyColumnMoved(updated);
			}
		}
		return result;
	}
}
