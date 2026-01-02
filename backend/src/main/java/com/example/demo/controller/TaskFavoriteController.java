package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.TaskFavorite;
import com.example.demo.service.TaskFavoriteService;

@RestController
@RequestMapping("/api/task")
public class TaskFavoriteController {

    @Autowired
    private TaskFavoriteService service;

    // 즐겨찾기 추가
    @PostMapping("/{taskId}/favorite/{memberNo}")
    public ResponseEntity<?> addFavorite(
            @PathVariable int taskId,
            @PathVariable int memberNo) {
        int result = service.addFavorite(taskId, memberNo);
        return ResponseEntity.ok(Map.of("success", result > 0, "isFavorite", true));
    }

    // 즐겨찾기 삭제
    @DeleteMapping("/{taskId}/favorite/{memberNo}")
    public ResponseEntity<?> removeFavorite(
            @PathVariable int taskId,
            @PathVariable int memberNo) {
        int result = service.removeFavorite(taskId, memberNo);
        return ResponseEntity.ok(Map.of("success", result > 0, "isFavorite", false));
    }

    // 즐겨찾기 토글
    @PostMapping("/{taskId}/favorite/{memberNo}/toggle")
    public ResponseEntity<?> toggleFavorite(
            @PathVariable int taskId,
            @PathVariable int memberNo) {
        boolean isFavorite = service.toggleFavorite(taskId, memberNo);
        return ResponseEntity.ok(Map.of("success", true, "isFavorite", isFavorite));
    }

    // 즐겨찾기 여부 확인
    @GetMapping("/{taskId}/favorite/{memberNo}")
    public ResponseEntity<?> checkFavorite(
            @PathVariable int taskId,
            @PathVariable int memberNo) {
        boolean isFavorite = service.isFavorite(taskId, memberNo);
        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }

    // 멤버별 즐겨찾기 목록
    @GetMapping("/favorites/member/{memberNo}")
    public ResponseEntity<List<TaskFavorite>> getFavoritesByMember(@PathVariable int memberNo) {
        return ResponseEntity.ok(service.getFavoritesByMember(memberNo));
    }

    // 멤버별 팀 내 즐겨찾기 목록
    @GetMapping("/favorites/member/{memberNo}/team/{teamId}")
    public ResponseEntity<List<TaskFavorite>> getFavoritesByMemberAndTeam(
            @PathVariable int memberNo,
            @PathVariable int teamId) {
        return ResponseEntity.ok(service.getFavoritesByMemberAndTeam(memberNo, teamId));
    }
}
