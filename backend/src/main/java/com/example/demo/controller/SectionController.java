package com.example.demo.controller;

import com.example.demo.model.Section;
import com.example.demo.service.SectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/section")
@CrossOrigin("*")
public class SectionController {

    @Autowired
    private SectionService sectionService;

    @PostMapping
    public ResponseEntity<Section> create(@RequestBody Section section) {
        Section created = sectionService.create(section);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<Section>> listByTeam(@PathVariable int teamId) {
        List<Section> sections = sectionService.listByTeam(teamId);
        return ResponseEntity.ok(sections);
    }

    @GetMapping("/team/{teamId}/with-tasks")
    public ResponseEntity<List<Section>> listByTeamWithTasks(@PathVariable int teamId) {
        List<Section> sections = sectionService.listByTeamWithTasks(teamId);
        return ResponseEntity.ok(sections);
    }

    @GetMapping("/{sectionId}")
    public ResponseEntity<Section> getById(@PathVariable int sectionId) {
        Section section = sectionService.getById(sectionId);
        if (section == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(section);
    }

    @PutMapping("/{sectionId}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable int sectionId,
            @RequestBody Section section) {
        section.setSectionId(sectionId);
        int result = sectionService.update(section);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{sectionId}/position")
    public ResponseEntity<Map<String, Object>> updatePosition(
            @PathVariable int sectionId,
            @RequestBody Section section) {
        section.setSectionId(sectionId);
        int result = sectionService.updatePosition(section);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{sectionId}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable int sectionId) {
        int result = sectionService.delete(sectionId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }
}
