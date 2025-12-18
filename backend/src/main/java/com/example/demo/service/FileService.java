package com.example.demo.service;

import com.example.demo.dao.FileDao;
import com.example.demo.model.ProjectFile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    @Autowired
    private FileDao fileDao;

    @Autowired
    private BoardNotificationService boardNotificationService;

    @Value("${flowtask.upload.path:uploads}")
    private String uploadPath;

    @Transactional
    public ProjectFile upload(MultipartFile file, Integer teamId, Integer taskId, int uploaderNo) throws IOException {
        // 저장 경로 생성
        String subDir = teamId != null ? teamId.toString() : "common";
        Path uploadDir = Paths.get(uploadPath, subDir);
        Files.createDirectories(uploadDir);

        // 파일명 생성 (UUID + 원본 확장자)
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String storedName = UUID.randomUUID().toString() + extension;
        Path filePath = uploadDir.resolve(storedName);

        // 파일 저장
        Files.copy(file.getInputStream(), filePath);

        // DB 저장
        ProjectFile projectFile = new ProjectFile();
        projectFile.setTeamId(teamId);
        projectFile.setTaskId(taskId);
        projectFile.setUploaderNo(uploaderNo);
        projectFile.setOriginalName(originalName);
        projectFile.setStoredName(storedName);
        projectFile.setFilePath(filePath.toString());
        projectFile.setFileSize(file.getSize());
        projectFile.setMimeType(file.getContentType());

        fileDao.insert(projectFile);

        // WebSocket 알림
        if (teamId != null) {
            boardNotificationService.notifyFileUploaded(projectFile, teamId);
        }

        return projectFile;
    }

    public List<ProjectFile> listByTeam(int teamId) {
        return fileDao.listByTeam(teamId);
    }

    public List<ProjectFile> listByTask(int taskId) {
        return fileDao.listByTask(taskId);
    }

    public ProjectFile getById(int fileId) {
        return fileDao.getById(fileId);
    }

    public Resource loadAsResource(int fileId) throws IOException {
        ProjectFile file = fileDao.getById(fileId);
        if (file == null) {
            throw new IOException("File not found");
        }

        Path filePath = Paths.get(file.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return resource;
        } else {
            throw new IOException("Could not read file: " + file.getOriginalName());
        }
    }

    @Transactional
    public int delete(int fileId) {
        ProjectFile file = fileDao.getById(fileId);
        if (file == null) {
            return 0;
        }

        // 물리 파일 삭제
        try {
            Path filePath = Paths.get(file.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // 로그만 남기고 계속 진행
            System.err.println("Failed to delete file: " + file.getFilePath());
        }

        int result = fileDao.delete(fileId);

        // WebSocket 알림
        if (result > 0 && file.getTeamId() != null) {
            boardNotificationService.notifyFileDeleted(fileId, file.getTeamId());
        }

        return result;
    }
}
