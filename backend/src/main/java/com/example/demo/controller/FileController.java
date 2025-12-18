package com.example.demo.controller;

import com.example.demo.model.ProjectFile;
import com.example.demo.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/file")
@CrossOrigin("*")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "teamId", required = false) Integer teamId,
            @RequestParam(value = "taskId", required = false) Integer taskId,
            @RequestParam("uploaderNo") int uploaderNo) {

        Map<String, Object> response = new HashMap<>();

        try {
            ProjectFile uploaded = fileService.upload(file, teamId, taskId, uploaderNo);
            response.put("success", true);
            response.put("file", uploaded);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            response.put("success", false);
            response.put("message", "파일 업로드 실패: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<ProjectFile>> listByTeam(@PathVariable int teamId) {
        List<ProjectFile> files = fileService.listByTeam(teamId);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<ProjectFile>> listByTask(@PathVariable int taskId) {
        List<ProjectFile> files = fileService.listByTask(taskId);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<ProjectFile> getById(@PathVariable int fileId) {
        ProjectFile file = fileService.getById(fileId);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(file);
    }

    @GetMapping("/download/{fileId}")
    public ResponseEntity<Resource> download(@PathVariable int fileId) {
        try {
            ProjectFile fileInfo = fileService.getById(fileId);
            if (fileInfo == null) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = fileService.loadAsResource(fileId);
            String encodedFileName = URLEncoder.encode(fileInfo.getOriginalName(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(fileInfo.getMimeType() != null
                            ? fileInfo.getMimeType()
                            : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename*=UTF-8''" + encodedFileName)
                    .body(resource);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable int fileId) {
        int result = fileService.delete(fileId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", result > 0);
        return ResponseEntity.ok(response);
    }
}
