package com.example.demo.service;

import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.demo.dao.NotificationDao;
import com.example.demo.dao.TaskAssigneeDao;
import com.example.demo.dao.TaskDao;
import com.example.demo.model.Notification;
import com.example.demo.model.Task;
import com.example.demo.model.TaskAssignee;

import lombok.extern.slf4j.Slf4j;

/**
 * 마감일 알림 스케줄러 서비스
 * - 마감일 임박 태스크 알림 (1일 이내)
 * - 마감일 초과 태스크 알림
 */
@Slf4j
@Service
public class DeadlineSchedulerService {

    @Autowired
    private TaskDao taskDao;

    @Autowired
    private TaskAssigneeDao assigneeDao;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationDao notificationDao;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 매일 오전 9시에 마감일 알림 발송
     * cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDeadlineNotifications() {
        log.info("Starting deadline notification scheduler...");

        int approachingCount = sendApproachingDeadlineNotifications();
        int overdueCount = sendOverdueNotifications();

        log.info("Deadline notification complete. Approaching: {}, Overdue: {}",
            approachingCount, overdueCount);
    }

    /**
     * 마감일 임박 알림 발송 (1일 이내)
     */
    public int sendApproachingDeadlineNotifications() {
        List<Task> tasks = taskDao.listTasksApproachingDeadline(1);
        int count = 0;

        for (Task task : tasks) {
            try {
                // 이미 같은 날 알림을 보냈는지 확인 (중복 방지)
                if (hasRecentNotification(task.getTaskId(), Notification.TYPE_DEADLINE_APPROACHING)) {
                    log.debug("Skipping approaching deadline notification for task {} - already notified",
                        task.getTaskId());
                    continue;
                }

                String dueDate = task.getDueDate() != null
                    ? task.getDueDate().toLocalDate().format(DATE_FORMATTER)
                    : "미정";
                int teamId = task.getTeamId() != null ? task.getTeamId() : 0;

                // 담당자들에게 알림 발송
                Set<Integer> notified = new HashSet<>();
                List<TaskAssignee> assignees = assigneeDao.listByTask(task.getTaskId());

                for (TaskAssignee assignee : assignees) {
                    if (!notified.contains(assignee.getMemberNo())) {
                        notificationService.notifyDeadlineApproaching(
                            assignee.getMemberNo(),
                            task.getTaskId(),
                            task.getTitle(),
                            dueDate,
                            teamId
                        );
                        notified.add(assignee.getMemberNo());
                        count++;
                    }
                }

                log.debug("Sent approaching deadline notification for task {}: {}",
                    task.getTaskId(), task.getTitle());
            } catch (Exception e) {
                log.error("Failed to send approaching deadline notification for task {}: {}",
                    task.getTaskId(), e.getMessage());
            }
        }

        return count;
    }

    /**
     * 마감일 초과 알림 발송
     */
    public int sendOverdueNotifications() {
        List<Task> tasks = taskDao.listOverdueTasks();
        int count = 0;

        for (Task task : tasks) {
            try {
                // 이미 같은 날 알림을 보냈는지 확인 (중복 방지)
                if (hasRecentNotification(task.getTaskId(), Notification.TYPE_DEADLINE_OVERDUE)) {
                    log.debug("Skipping overdue notification for task {} - already notified",
                        task.getTaskId());
                    continue;
                }

                String dueDate = task.getDueDate() != null
                    ? task.getDueDate().toLocalDate().format(DATE_FORMATTER)
                    : "미정";
                int teamId = task.getTeamId() != null ? task.getTeamId() : 0;

                // 담당자들에게 알림 발송
                Set<Integer> notified = new HashSet<>();
                List<TaskAssignee> assignees = assigneeDao.listByTask(task.getTaskId());

                for (TaskAssignee assignee : assignees) {
                    if (!notified.contains(assignee.getMemberNo())) {
                        notificationService.notifyDeadlineOverdue(
                            assignee.getMemberNo(),
                            task.getTaskId(),
                            task.getTitle(),
                            dueDate,
                            teamId
                        );
                        notified.add(assignee.getMemberNo());
                        count++;
                    }
                }

                log.debug("Sent overdue notification for task {}: {}",
                    task.getTaskId(), task.getTitle());
            } catch (Exception e) {
                log.error("Failed to send overdue notification for task {}: {}",
                    task.getTaskId(), e.getMessage());
            }
        }

        return count;
    }

    /**
     * 최근 24시간 이내에 같은 타입의 알림이 발송되었는지 확인
     */
    private boolean hasRecentNotification(int taskId, String notificationType) {
        // NotificationDao에 조회 메서드 추가 필요 시 여기서 체크
        // 현재는 단순화를 위해 false 반환 (중복 알림 가능)
        // TODO: 중복 알림 방지 로직 구현
        return false;
    }

    /**
     * 수동으로 마감일 알림 발송 (테스트/관리용)
     */
    public void triggerDeadlineNotifications() {
        log.info("Manually triggering deadline notifications...");
        sendDeadlineNotifications();
    }
}
