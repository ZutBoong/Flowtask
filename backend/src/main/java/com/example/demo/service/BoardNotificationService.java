package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.demo.dto.BoardEvent;
import com.example.demo.model.FlowtaskColumn;
import com.example.demo.model.Task;
import com.example.demo.model.Comment;
import com.example.demo.model.Section;
import com.example.demo.model.ProjectFile;

@Service
public class BoardNotificationService {

	@Autowired
	private SimpMessagingTemplate messagingTemplate;

	// Column Events
	public void notifyColumnCreated(FlowtaskColumn column) {
		sendBoardEvent(column.getTeamId(), "COLUMN_CREATED", "column", column);
	}

	public void notifyColumnUpdated(FlowtaskColumn column) {
		sendBoardEvent(column.getTeamId(), "COLUMN_UPDATED", "column", column);
	}

	public void notifyColumnDeleted(int teamId, int columnId) {
		sendBoardEvent(teamId, "COLUMN_DELETED", "column", columnId);
	}

	public void notifyColumnMoved(FlowtaskColumn column) {
		sendBoardEvent(column.getTeamId(), "COLUMN_MOVED", "column", column);
	}

	// Task Events
	public void notifyTaskCreated(Task task, int teamId) {
		sendBoardEvent(teamId, "TASK_CREATED", "task", task);
	}

	public void notifyTaskUpdated(Task task, int teamId) {
		sendBoardEvent(teamId, "TASK_UPDATED", "task", task);
	}

	public void notifyTaskDeleted(int teamId, int taskId) {
		sendBoardEvent(teamId, "TASK_DELETED", "task", taskId);
	}

	public void notifyTaskMoved(Task task, int teamId) {
		sendBoardEvent(teamId, "TASK_MOVED", "task", task);
	}

	// Comment Events
	public void notifyCommentEvent(String eventType, Comment comment, int teamId) {
		sendBoardEvent(teamId, eventType, "comment", comment);
	}

	// Section Events
	public void notifySectionCreated(Section section, int teamId) {
		sendBoardEvent(teamId, "SECTION_CREATED", "section", section);
	}

	public void notifySectionUpdated(Section section, int teamId) {
		sendBoardEvent(teamId, "SECTION_UPDATED", "section", section);
	}

	public void notifySectionDeleted(int sectionId, int teamId) {
		sendBoardEvent(teamId, "SECTION_DELETED", "section", sectionId);
	}

	// File Events
	public void notifyFileUploaded(ProjectFile file, int teamId) {
		sendBoardEvent(teamId, "FILE_UPLOADED", "file", file);
	}

	public void notifyFileDeleted(int fileId, int teamId) {
		sendBoardEvent(teamId, "FILE_DELETED", "file", fileId);
	}

	// Task Date Events (for Timeline sync)
	public void notifyTaskDatesChanged(Task task, int teamId) {
		sendBoardEvent(teamId, "TASK_DATES_CHANGED", "task", task);
	}

	private void sendBoardEvent(int teamId, String eventType, String entityType, Object payload) {
		BoardEvent event = new BoardEvent(
			eventType,
			entityType,
			payload,
			teamId,
			System.currentTimeMillis()
		);
		String destination = "/topic/team/" + teamId;
		System.out.println("WebSocket broadcast to " + destination + ": " + eventType);
		messagingTemplate.convertAndSend(destination, event);
	}
}
