package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.TaskArchive;
import com.example.demo.service.TaskArchiveService;

@RestController
@RequestMapping("/api/task")
public class TaskArchiveController {

    @Autowired
    private TaskArchiveService service;

    // 태스크 아카이브 생성
    @PostMapping("/{taskId}/archive")
    public ResponseEntity<?> archiveTask(
            @PathVariable int taskId,
            @RequestBody Map<String, Object> body) {
        int memberNo = (Integer) body.get("memberNo");
        String archiveNote = (String) body.getOrDefault("archiveNote", "");

        int result = service.archiveTask(taskId, memberNo, archiveNote);
        if (result > 0) {
            return ResponseEntity.ok(Map.of("success", true, "message", "태스크가 아카이브되었습니다."));
        } else {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "태스크를 찾을 수 없습니다."));
        }
    }

    // 아카이브 삭제
    @DeleteMapping("/archive/{archiveId}")
    public ResponseEntity<?> deleteArchive(@PathVariable int archiveId) {
        int result = service.deleteArchive(archiveId);
        return ResponseEntity.ok(Map.of("success", result > 0));
    }

    // 아카이브 상세 조회
    @GetMapping("/archive/{archiveId}")
    public ResponseEntity<?> getArchive(@PathVariable int archiveId) {
        TaskArchive archive = service.getArchive(archiveId);
        if (archive != null) {
            return ResponseEntity.ok(archive);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 멤버별 아카이브 목록
    @GetMapping("/archives/member/{memberNo}")
    public ResponseEntity<List<TaskArchive>> getArchivesByMember(@PathVariable int memberNo) {
        return ResponseEntity.ok(service.getArchivesByMember(memberNo));
    }

    // 멤버의 아카이브 수
    @GetMapping("/archives/member/{memberNo}/count")
    public ResponseEntity<?> countArchives(@PathVariable int memberNo) {
        return ResponseEntity.ok(Map.of("count", service.countArchives(memberNo)));
    }
}
