package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.CommentDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.FlowtaskColumnDao;
import com.example.demo.model.Comment;
import com.example.demo.model.Task;
import com.example.demo.model.FlowtaskColumn;

@Service
public class CommentService {

	@Autowired
	private CommentDao dao;

	@Autowired
	private TaskDao taskDao;

	@Autowired
	private FlowtaskColumnDao columnDao;

	@Autowired
	private BoardNotificationService notificationService;

	public Comment insert(Comment comment) {
		int result = dao.insert(comment);
		if (result == 1) {
			// 생성된 댓글 조회 (작성자 정보 포함)
			Comment created = dao.content(comment.getCommentId());
			// WebSocket 알림
			notifyCommentEvent("COMMENT_CREATED", created);
			return created;
		}
		return null;
	}

	public List<Comment> listByTask(int taskId) {
		return dao.listByTask(taskId);
	}

	public Comment content(int commentId) {
		return dao.content(commentId);
	}

	public int update(Comment comment) {
		int result = dao.update(comment);
		if (result == 1) {
			Comment updated = dao.content(comment.getCommentId());
			notifyCommentEvent("COMMENT_UPDATED", updated);
		}
		return result;
	}

	public int delete(int commentId) {
		Comment comment = dao.content(commentId);
		int result = dao.delete(commentId);
		if (result == 1 && comment != null) {
			notifyCommentEvent("COMMENT_DELETED", comment);
		}
		return result;
	}

	public int countByTask(int taskId) {
		return dao.countByTask(taskId);
	}

	// 댓글 이벤트에 대한 WebSocket 알림
	private void notifyCommentEvent(String eventType, Comment comment) {
		if (comment == null) return;

		// Task에서 Column을 찾고, Column에서 TeamId를 가져옴
		Task task = taskDao.content(comment.getTaskId());
		if (task != null) {
			FlowtaskColumn column = columnDao.content(task.getColumnId());
			if (column != null) {
				notificationService.notifyCommentEvent(eventType, comment, column.getTeamId());
			}
		}
	}
}
