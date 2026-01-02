package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.SynodosColumn;

@Mapper
public interface SynodosColumnDao {
	int insert(SynodosColumn column);
	List<SynodosColumn> list();
	List<SynodosColumn> listByTeam(int teamId);
	SynodosColumn content(int columnId);
	int update(SynodosColumn column);
	int delete(int columnId);
	int updatePosition(SynodosColumn column);
	int updateGithubPrefix(SynodosColumn column);
}
