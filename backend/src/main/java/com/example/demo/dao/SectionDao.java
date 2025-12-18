package com.example.demo.dao;

import com.example.demo.model.Section;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface SectionDao {
    int insert(Section section);
    List<Section> listByTeam(int teamId);
    Section getById(int sectionId);
    int update(Section section);
    int updatePosition(Section section);
    int delete(int sectionId);
    int getMaxPosition(int teamId);
}
