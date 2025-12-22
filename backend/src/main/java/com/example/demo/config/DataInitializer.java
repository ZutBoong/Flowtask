package com.example.demo.config;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.demo.dao.*;
import com.example.demo.model.*;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
    private final Random random = new Random();

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    private final MemberDao memberDao;
    private final TeamDao teamDao;
    private final FlowtaskColumnDao columnDao;
    private final TaskDao taskDao;
    private final TaskAssigneeDao taskAssigneeDao;
    private final TaskVerifierDao taskVerifierDao;
    private final TaskFavoriteDao taskFavoriteDao;
    private final TaskArchiveDao taskArchiveDao;
    private final TagDao tagDao;
    private final CommentDao commentDao;

    private List<Member> members;
    private List<Team> teams;

    @Override
    public void run(String... args) throws Exception {
        logger.info("샘플 데이터 생성 시작...");

        // 1. 기존 데이터 삭제 (외래키 순서 고려)
        clearAllData();

        // 2. 회원 30명 생성
        createMembers();

        // 3. 팀 10개 생성
        createTeams();

        // 4. 팀당 데이터 생성
        for (Team team : teams) {
            createTeamData(team);
        }

        logger.info("샘플 데이터 생성 완료!");
    }

    private void clearAllData() {
        logger.info("기존 데이터 삭제 중...");

        // 외래키 순서 고려하여 삭제
        jdbcTemplate.execute("DELETE FROM flowtask_task_commit");
        jdbcTemplate.execute("DELETE FROM flowtask_task_archive");
        jdbcTemplate.execute("DELETE FROM flowtask_task_favorite");
        jdbcTemplate.execute("DELETE FROM flowtask_task_verifier");
        jdbcTemplate.execute("DELETE FROM flowtask_task_assignee");
        jdbcTemplate.execute("DELETE FROM flowtask_task_tag");
        jdbcTemplate.execute("DELETE FROM flowtask_comment");
        jdbcTemplate.execute("DELETE FROM flowtask_tag");
        jdbcTemplate.execute("DELETE FROM flowtask_task");
        jdbcTemplate.execute("DELETE FROM flowtask_column_archive");
        jdbcTemplate.execute("DELETE FROM flowtask_column_favorite");
        jdbcTemplate.execute("DELETE FROM flowtask_column");
        jdbcTemplate.execute("DELETE FROM flowtask_section");
        jdbcTemplate.execute("DELETE FROM flowtask_chat_message");
        jdbcTemplate.execute("DELETE FROM flowtask_team_member");
        jdbcTemplate.execute("DELETE FROM flowtask_team");
        jdbcTemplate.execute("DELETE FROM flowtask_member");
        jdbcTemplate.execute("DELETE FROM flowtask_notification");
        jdbcTemplate.execute("DELETE FROM flowtask_git_repo");
        jdbcTemplate.execute("DELETE FROM flowtask_file");

        // 시퀀스 초기화
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_member_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_team_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_column_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_task_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_tag_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_comment_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_chat_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE flowtask_section_seq RESTART WITH 1");

        logger.info("기존 데이터 삭제 완료");
    }

    private void createMembers() {
        logger.info("회원 30명 생성 중...");
        members = new ArrayList<>();

        String[] names = {
            "김철수", "이영희", "박민수", "정수진", "최동훈",
            "강서연", "윤재호", "임지은", "한승우", "오혜진",
            "서준영", "남궁민", "황지훈", "배수지", "신동엽",
            "권나라", "송민호", "안유진", "조성민", "장윤아",
            "허준혁", "문채원", "노태우", "곽동희", "변우석",
            "설인아", "탁재훈", "라미란", "마동석", "사공민"
        };

        for (int i = 1; i <= 30; i++) {
            Member member = new Member();
            member.setUserid("user" + i);
            member.setPassword(passwordEncoder.encode("1234"));
            member.setName(names[i - 1]);
            member.setEmail("user" + i + "@flowtask.com");
            member.setPhone("010-" + String.format("%04d", random.nextInt(10000)) + "-" + String.format("%04d", random.nextInt(10000)));
            member.setEmailVerified(true);

            memberDao.insert(member);

            // 생성된 회원 조회하여 리스트에 추가
            Member created = memberDao.findByUserid("user" + i);
            members.add(created);
        }

        logger.info("회원 30명 생성 완료");
    }

    private void createTeams() {
        logger.info("팀 10개 생성 중...");
        teams = new ArrayList<>();

        String[] teamNames = {
            "프론트엔드팀", "백엔드팀", "디자인팀", "기획팀", "마케팅팀",
            "데이터팀", "인프라팀", "QA팀", "운영팀", "경영지원팀"
        };

        String[] descriptions = {
            "사용자 인터페이스 개발을 담당합니다",
            "서버 및 API 개발을 담당합니다",
            "UI/UX 디자인을 담당합니다",
            "서비스 기획 및 분석을 담당합니다",
            "브랜드 마케팅 및 홍보를 담당합니다",
            "데이터 분석 및 머신러닝을 담당합니다",
            "인프라 구축 및 운영을 담당합니다",
            "품질 보증 및 테스트를 담당합니다",
            "서비스 운영 및 고객 지원을 담당합니다",
            "경영 지원 및 인사 관리를 담당합니다"
        };

        for (int i = 0; i < 10; i++) {
            // 무작위 팀장 선택
            Member leader = members.get(random.nextInt(members.size()));

            Team team = new Team();
            team.setTeamName(teamNames[i]);
            team.setDescription(descriptions[i]);
            team.setLeaderNo(leader.getNo());
            team.setTeamCode(generateTeamCode());

            teamDao.insertTeam(team);

            // 생성된 팀 조회
            Team created = jdbcTemplate.queryForObject(
                "SELECT * FROM flowtask_team WHERE team_name = ?",
                (rs, rowNum) -> {
                    Team t = new Team();
                    t.setTeamId(rs.getInt("team_id"));
                    t.setTeamName(rs.getString("team_name"));
                    t.setDescription(rs.getString("description"));
                    t.setLeaderNo(rs.getInt("leader_no"));
                    t.setTeamCode(rs.getString("team_code"));
                    t.setCreatedAt(new Date(rs.getTimestamp("created_at").getTime()));
                    return t;
                },
                teamNames[i]
            );
            teams.add(created);

            // 팀 멤버 추가 (5~15명 무작위)
            addTeamMembers(created);
        }

        logger.info("팀 10개 생성 완료");
    }

    private void addTeamMembers(Team team) {
        int memberCount = 5 + random.nextInt(11); // 5~15명
        List<Integer> addedMembers = new ArrayList<>();
        addedMembers.add(team.getLeaderNo()); // 팀장은 기본 포함

        // 팀장을 flowtask_team_member 테이블에 추가
        jdbcTemplate.update(
            "INSERT INTO flowtask_team_member (team_id, member_no, role) VALUES (?, ?, ?)",
            team.getTeamId(), team.getLeaderNo(), "LEADER"
        );

        for (int i = 1; i < memberCount; i++) {
            Member member = members.get(random.nextInt(members.size()));

            // 중복 체크
            if (!addedMembers.contains(member.getNo())) {
                addedMembers.add(member.getNo());

                jdbcTemplate.update(
                    "INSERT INTO flowtask_team_member (team_id, member_no, role) VALUES (?, ?, ?)",
                    team.getTeamId(), member.getNo(), "MEMBER"
                );
            }
        }
    }

    private void createTeamData(Team team) {
        logger.info("팀 '" + team.getTeamName() + "' 데이터 생성 중...");

        // 컬럼 10개 생성
        List<FlowtaskColumn> columns = createColumns(team);

        // 태스크 50개 생성
        createTasks(team, columns);
    }

    private List<FlowtaskColumn> createColumns(Team team) {
        List<FlowtaskColumn> columns = new ArrayList<>();

        String[] columnTitles = {
            "백로그", "할 일", "진행 중", "검토 중", "완료",
            "보류", "긴급", "개선사항", "버그", "문서화"
        };

        for (int i = 0; i < 10; i++) {
            FlowtaskColumn column = new FlowtaskColumn();
            column.setTeamId(team.getTeamId());
            column.setTitle(columnTitles[i]);
            column.setPosition(i);

            columnDao.insert(column);

            // 생성된 컬럼 조회
            FlowtaskColumn created = jdbcTemplate.queryForObject(
                "SELECT * FROM flowtask_column WHERE team_id = ? AND title = ?",
                (rs, rowNum) -> {
                    FlowtaskColumn c = new FlowtaskColumn();
                    c.setColumnId(rs.getInt("column_id"));
                    c.setTeamId(rs.getInt("team_id"));
                    c.setTitle(rs.getString("title"));
                    c.setPosition(rs.getInt("position"));
                    return c;
                },
                team.getTeamId(), columnTitles[i]
            );
            columns.add(created);
        }

        return columns;
    }

    private void createTasks(Team team, List<FlowtaskColumn> columns) {
        // 팀 멤버 조회
        List<Member> teamMembers = jdbcTemplate.query(
            "SELECT m.* FROM flowtask_member m JOIN flowtask_team_member tm ON m.no = tm.member_no WHERE tm.team_id = ?",
            (rs, rowNum) -> {
                Member m = new Member();
                m.setNo(rs.getInt("no"));
                m.setUserid(rs.getString("userid"));
                m.setName(rs.getString("name"));
                m.setEmail(rs.getString("email"));
                return m;
            },
            team.getTeamId()
        );

        if (teamMembers.isEmpty()) {
            return;
        }

        String[] taskPrefixes = {
            "개발", "설계", "분석", "테스트", "배포",
            "리뷰", "문서화", "회의", "조사", "개선"
        };

        String[] priorities = {"CRITICAL", "HIGH", "MEDIUM", "LOW"};
        String[] workflowStatuses = {"WAITING", "IN_PROGRESS", "REVIEW", "DONE"};

        List<Task> createdTasks = new ArrayList<>();

        for (int i = 1; i <= 50; i++) {
            FlowtaskColumn column = columns.get(random.nextInt(columns.size()));

            Task task = new Task();
            task.setColumnId(column.getColumnId());
            task.setTitle(taskPrefixes[random.nextInt(taskPrefixes.length)] + " #" + i);
            task.setDescription("태스크 설명입니다. " + team.getTeamName() + "의 " + (i) + "번째 작업입니다.");
            task.setPriority(priorities[random.nextInt(priorities.length)]);
            task.setWorkflowStatus(workflowStatuses[random.nextInt(workflowStatuses.length)]);

            // 날짜 설정 (최근 30일 ~ 앞으로 60일)
            LocalDate startDate = LocalDate.now().minusDays(random.nextInt(30));
            LocalDate dueDate = startDate.plusDays(7 + random.nextInt(30));

            task.setStartDate(Date.valueOf(startDate));
            task.setDueDate(Date.valueOf(dueDate));
            task.setPosition(i);

            taskDao.insert(task);

            // 생성된 태스크 조회
            Task created = jdbcTemplate.queryForObject(
                "SELECT * FROM flowtask_task WHERE column_id = ? AND title = ?",
                (rs, rowNum) -> {
                    Task t = new Task();
                    t.setTaskId(rs.getInt("task_id"));
                    t.setColumnId(rs.getInt("column_id"));
                    t.setTitle(rs.getString("title"));
                    t.setDescription(rs.getString("description"));
                    t.setPriority(rs.getString("priority"));
                    t.setWorkflowStatus(rs.getString("workflow_status"));
                    t.setStartDate(rs.getDate("start_date"));
                    t.setDueDate(rs.getDate("due_date"));
                    t.setPosition(rs.getInt("position"));
                    return t;
                },
                column.getColumnId(), task.getTitle()
            );
            createdTasks.add(created);

            // 담당자 추가 (1~3명)
            addTaskAssignees(created, teamMembers);

            // 일부 태스크에 검증자 추가 (30% 확률)
            if (random.nextDouble() < 0.3) {
                addTaskVerifiers(created, teamMembers);
            }
        }

        // 즐겨찾기 추가 (유저마다 0~10개)
        addFavorites(createdTasks, teamMembers);

        // 아카이브 추가 (유저마다 0~5개)
        addArchives(createdTasks, teamMembers);
    }

    private void addTaskAssignees(Task task, List<Member> teamMembers) {
        int assigneeCount = 1 + random.nextInt(3); // 1~3명
        List<Integer> addedAssignees = new ArrayList<>();

        for (int i = 0; i < assigneeCount && i < teamMembers.size(); i++) {
            Member member = teamMembers.get(random.nextInt(teamMembers.size()));

            if (!addedAssignees.contains(member.getNo())) {
                addedAssignees.add(member.getNo());

                jdbcTemplate.update(
                    "INSERT INTO flowtask_task_assignee (task_id, member_no) VALUES (?, ?)",
                    task.getTaskId(), member.getNo()
                );
            }
        }
    }

    private void addTaskVerifiers(Task task, List<Member> teamMembers) {
        int verifierCount = 1 + random.nextInt(2); // 1~2명
        List<Integer> addedVerifiers = new ArrayList<>();

        for (int i = 0; i < verifierCount && i < teamMembers.size(); i++) {
            Member member = teamMembers.get(random.nextInt(teamMembers.size()));

            if (!addedVerifiers.contains(member.getNo())) {
                addedVerifiers.add(member.getNo());

                jdbcTemplate.update(
                    "INSERT INTO flowtask_task_verifier (task_id, member_no) VALUES (?, ?)",
                    task.getTaskId(), member.getNo()
                );
            }
        }
    }

    private void addFavorites(List<Task> tasks, List<Member> teamMembers) {
        for (Member member : teamMembers) {
            int favoriteCount = random.nextInt(11); // 0~10개
            List<Integer> addedFavorites = new ArrayList<>();

            for (int i = 0; i < favoriteCount && i < tasks.size(); i++) {
                Task task = tasks.get(random.nextInt(tasks.size()));

                if (!addedFavorites.contains(task.getTaskId())) {
                    addedFavorites.add(task.getTaskId());

                    jdbcTemplate.update(
                        "INSERT INTO flowtask_task_favorite (task_id, member_no) VALUES (?, ?)",
                        task.getTaskId(), member.getNo()
                    );
                }
            }
        }
    }

    private void addArchives(List<Task> tasks, List<Member> teamMembers) {
        for (Member member : teamMembers) {
            int archiveCount = random.nextInt(6); // 0~5개
            List<Integer> addedArchives = new ArrayList<>();

            for (int i = 0; i < archiveCount && i < tasks.size(); i++) {
                Task task = tasks.get(random.nextInt(tasks.size()));

                if (!addedArchives.contains(task.getTaskId())) {
                    addedArchives.add(task.getTaskId());

                    // task_snapshot을 JSON 형태로 저장
                    String taskSnapshot = String.format(
                        "{\"taskId\":%d,\"title\":\"%s\",\"description\":\"%s\",\"priority\":\"%s\",\"workflowStatus\":\"%s\"}",
                        task.getTaskId(), task.getTitle(), task.getDescription(), task.getPriority(), task.getWorkflowStatus()
                    );

                    jdbcTemplate.update(
                        "INSERT INTO flowtask_task_archive (archive_id, original_task_id, member_no, task_snapshot, archive_note) VALUES (nextval('flowtask_task_archive_seq'), ?, ?, ?::jsonb, ?)",
                        task.getTaskId(), member.getNo(), taskSnapshot, "샘플 아카이브"
                    );
                }
            }
        }
    }

    private String generateTeamCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        return code.toString();
    }
}
