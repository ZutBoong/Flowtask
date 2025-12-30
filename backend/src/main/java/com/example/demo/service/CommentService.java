package com.example.demo.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.CommentDao;
import com.example.demo.dao.MemberDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.dao.TaskVerifierDao;
import com.example.demo.dao.TeamDao;
import com.example.demo.dao.SynodosColumnDao;
import com.example.demo.model.Comment;
import com.example.demo.model.Member;
import com.example.demo.model.Task;
import com.example.demo.model.TaskAssignee;
import com.example.demo.model.TaskVerifier;
import com.example.demo.model.TeamMember;
import com.example.demo.model.SynodosColumn;

@Service
public class CommentService {

	// 멘션 패턴: @username (영문, 숫자, 언더스코어)
	private static final Pattern MENTION_PATTERN = Pattern.compile("@([\\w]+)");

	@Autowired
	private CommentDao dao;

	@Autowired
	private TaskDao taskDao;

	@Autowired
	private TaskAssigneeDao assigneeDao;

	@Autowired
	private TaskVerifierDao verifierDao;

	@Autowired
	private SynodosColumnDao columnDao;

	@Autowired
	private MemberDao memberDao;

	@Autowired
	private TeamDao teamDao;

	@Autowired
	private BoardNotificationService notificationService;

	@Autowired
	private NotificationService persistentNotificationService;

	public Comment insert(Comment comment) {
		int result = dao.insert(comment);
		if (result == 1) {
			// 생성된 댓글 조회 (작성자 정보 포함)
			Comment created = dao.content(comment.getCommentId());
			// WebSocket 알림
			notifyCommentEvent("COMMENT_CREATED", created);
			// 태스크 관계자들에게 알림 발송
			notifyTaskParticipants(created);
			// 멘션된 사용자들에게 알림 발송
			notifyMentionedUsers(created);
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
			SynodosColumn column = columnDao.content(task.getColumnId());
			if (column != null) {
				notificationService.notifyCommentEvent(eventType, comment, column.getTeamId());
			}
		}
	}

	// 태스크 관계자들(담당자, 검증자)에게 댓글 알림 발송
	private void notifyTaskParticipants(Comment comment) {
		if (comment == null) return;

		Task task = taskDao.content(comment.getTaskId());
		if (task == null) return;

		SynodosColumn column = columnDao.content(task.getColumnId());
		if (column == null) return;

		int senderNo = comment.getAuthorNo();
		int teamId = column.getTeamId();

		// 알림 수신자 목록 (중복 제거)
		Set<Integer> recipients = new HashSet<>();

		// 담당자들 추가
		List<TaskAssignee> assignees = assigneeDao.listByTask(task.getTaskId());
		for (TaskAssignee assignee : assignees) {
			recipients.add(assignee.getMemberNo());
		}

		// 검증자들 추가
		List<TaskVerifier> verifiers = verifierDao.listByTask(task.getTaskId());
		for (TaskVerifier verifier : verifiers) {
			recipients.add(verifier.getMemberNo());
		}

		// 태스크 생성자 추가
		if (task.getCreatedBy() != null) {
			recipients.add(task.getCreatedBy());
		}

		// 본인 제외하고 알림 발송
		recipients.remove(senderNo);
		for (Integer recipientNo : recipients) {
			persistentNotificationService.notifyCommentAdded(
				recipientNo,
				senderNo,
				task.getTaskId(),
				task.getTitle(),
				teamId
			);
		}
	}

	// 멘션된 사용자들에게 알림 발송
	private void notifyMentionedUsers(Comment comment) {
		if (comment == null || comment.getContent() == null) return;

		Task task = taskDao.content(comment.getTaskId());
		if (task == null) return;

		SynodosColumn column = columnDao.content(task.getColumnId());
		if (column == null) return;

		int senderNo = comment.getAuthorNo();
		int teamId = column.getTeamId();

		// 댓글 내용에서 멘션된 사용자명 추출
		Set<String> mentionedUsernames = new HashSet<>();
		Matcher matcher = MENTION_PATTERN.matcher(comment.getContent());
		while (matcher.find()) {
			mentionedUsernames.add(matcher.group(1).toLowerCase());
		}

		if (mentionedUsernames.isEmpty()) return;

		// 팀 멤버 목록 조회
		List<TeamMember> teamMembers = teamDao.findMembers(teamId);
		Set<Integer> teamMemberNos = new HashSet<>();
		for (TeamMember tm : teamMembers) {
			teamMemberNos.add(tm.getMemberNo());
		}

		// 멘션된 사용자들에게 알림 발송
		for (String username : mentionedUsernames) {
			Member member = memberDao.findByUserid(username);
			if (member != null && member.getNo() != senderNo && teamMemberNos.contains(member.getNo())) {
				persistentNotificationService.notifyMention(
					member.getNo(),
					senderNo,
					task.getTaskId(),
					task.getTitle(),
					teamId
				);
			}
		}
	}
}
