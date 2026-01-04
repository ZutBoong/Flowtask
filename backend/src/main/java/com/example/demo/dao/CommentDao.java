package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.Comment;

@Mapper
public interface CommentDao {
	int insert(Comment comment);
	List<Comment> listByTask(int taskId);
	Comment content(int commentId);
	int update(Comment comment);
	int delete(int commentId);
	int countByTask(int taskId);

	// GitHub 동기화용
	Comment findByGithubCommentId(Long githubCommentId);
	int updateGithubCommentId(int commentId, Long githubCommentId);
}
