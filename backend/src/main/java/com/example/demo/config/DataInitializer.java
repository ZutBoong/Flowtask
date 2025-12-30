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
    private final SynodosColumnDao columnDao;
    private final TaskDao taskDao;
    private final TaskAssigneeDao taskAssigneeDao;
    private final TaskVerifierDao taskVerifierDao;
    private final TaskFavoriteDao taskFavoriteDao;
    private final TaskArchiveDao taskArchiveDao;
    private final CommentDao commentDao;

    private List<Member> members;
    private List<Team> teams;

    @Override
    public void run(String... args) throws Exception {
        logger.info("데이터베이스 초기화 시작...");

        // 0. 테이블 자동 생성
        createTablesIfNotExist();

        // 데이터가 이미 존재하면 건너뛰기
        Integer memberCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM member", Integer.class);
        if (memberCount != null && memberCount > 0) {
            logger.info("기존 데이터가 존재합니다. 샘플 데이터 생성을 건너뜁니다. (회원 수: {})", memberCount);
            return;
        }

        logger.info("샘플 데이터 생성 시작...");

        // 1. 기존 데이터 삭제 (외래키 순서 고려)
        clearAllData();

        // 2. 회원 40명 생성 (admin 10명 + user 30명)
        createMembers();

        // 3. 팀 10개 생성
        createTeams();

        // 4. 팀당 데이터 생성
        for (Team team : teams) {
            createTeamData(team);
        }

        logger.info("샘플 데이터 생성 완료!");
    }

    private void createTablesIfNotExist() {
        logger.info("테이블 생성 확인 중...");

        // 시퀀스 생성
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS member_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS team_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS column_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS task_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS comment_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS chat_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS file_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS email_verification_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS notification_seq START WITH 1 INCREMENT BY 1");
        executeIgnoreError("CREATE SEQUENCE IF NOT EXISTS task_archive_seq START WITH 1 INCREMENT BY 1");

        // 회원 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS member (
                no INTEGER PRIMARY KEY,
                userid VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(100) NOT NULL,
                name VARCHAR(50) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(20),
                email_verified BOOLEAN DEFAULT FALSE,
                profile_image VARCHAR(500),
                register TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 팀 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS team (
                team_id INTEGER PRIMARY KEY,
                team_name VARCHAR(100) NOT NULL,
                team_code VARCHAR(20) NOT NULL UNIQUE,
                leader_no INTEGER NOT NULL REFERENCES member(no),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 팀 멤버 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS team_member (
                team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
                member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'MEMBER',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (team_id, member_no)
            )
            """);

        // 컬럼 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS columns (
                column_id INTEGER PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                position INTEGER NOT NULL,
                team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE
            )
            """);

        // 태스크 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS task (
                task_id INTEGER PRIMARY KEY,
                column_id INTEGER NOT NULL REFERENCES columns(column_id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                position INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                assignee_no INTEGER REFERENCES member(no) ON DELETE SET NULL,
                priority VARCHAR(20) DEFAULT 'MEDIUM',
                start_date TIMESTAMP,
                due_date TIMESTAMP,
                workflow_status VARCHAR(20) DEFAULT 'WAITING',
                rejection_reason TEXT,
                rejected_at TIMESTAMP,
                rejected_by INTEGER REFERENCES member(no) ON DELETE SET NULL
            )
            """);

        // 댓글 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS comment (
                comment_id INTEGER PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
                author_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                content VARCHAR(2000) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 채팅 메시지 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS chat_message (
                message_id INTEGER PRIMARY KEY,
                team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
                sender_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                content VARCHAR(2000) NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 태스크 즐겨찾기 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS task_favorite (
                task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
                member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (task_id, member_no)
            )
            """);

        // 태스크 아카이브 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS task_archive (
                archive_id INTEGER PRIMARY KEY,
                member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                original_task_id INTEGER NOT NULL,
                team_id INTEGER,
                team_name VARCHAR(100),
                column_id INTEGER,
                column_title VARCHAR(100),
                task_snapshot JSONB NOT NULL,
                archive_note VARCHAR(500),
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 알림 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS notification (
                notification_id INTEGER PRIMARY KEY,
                recipient_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                sender_no INTEGER REFERENCES member(no) ON DELETE SET NULL,
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message VARCHAR(500),
                team_id INTEGER REFERENCES team(team_id) ON DELETE CASCADE,
                column_id INTEGER REFERENCES columns(column_id) ON DELETE CASCADE,
                task_id INTEGER REFERENCES task(task_id) ON DELETE CASCADE,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 태스크 담당자 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS task_assignee (
                task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
                member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                assigned_by INTEGER REFERENCES member(no) ON DELETE SET NULL,
                accepted BOOLEAN DEFAULT FALSE,
                accepted_at TIMESTAMP,
                completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP,
                PRIMARY KEY (task_id, member_no)
            )
            """);

        // 태스크 검증자 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS task_verifier (
                task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
                member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved BOOLEAN DEFAULT FALSE,
                approved_at TIMESTAMP,
                rejection_reason TEXT,
                PRIMARY KEY (task_id, member_no)
            )
            """);

        // 파일 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS file (
                file_id INTEGER PRIMARY KEY,
                team_id INTEGER REFERENCES team(team_id) ON DELETE CASCADE,
                task_id INTEGER REFERENCES task(task_id) ON DELETE CASCADE,
                uploader_no INTEGER NOT NULL REFERENCES member(no) ON DELETE SET NULL,
                original_name VARCHAR(255) NOT NULL,
                stored_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT,
                mime_type VARCHAR(100),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 이메일 인증 테이블
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS email_verification (
                id INTEGER PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                code VARCHAR(6) NOT NULL,
                type VARCHAR(20) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """);

        // 인덱스 생성 (에러 무시)
        createIndexes();

        logger.info("테이블 생성 완료");
    }

    private void executeIgnoreError(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            // 이미 존재하는 경우 무시
        }
    }

    private void createIndexes() {
        String[] indexes = {
            "CREATE INDEX IF NOT EXISTS idx_member_userid ON member(userid)",
            "CREATE INDEX IF NOT EXISTS idx_member_email ON member(email)",
            "CREATE INDEX IF NOT EXISTS idx_team_leader ON team(leader_no)",
            "CREATE INDEX IF NOT EXISTS idx_team_code ON team(team_code)",
            "CREATE INDEX IF NOT EXISTS idx_teammember_team ON team_member(team_id)",
            "CREATE INDEX IF NOT EXISTS idx_teammember_member ON team_member(member_no)",
            "CREATE INDEX IF NOT EXISTS idx_column_position ON columns(position)",
            "CREATE INDEX IF NOT EXISTS idx_column_team ON columns(team_id)",
            "CREATE INDEX IF NOT EXISTS idx_task_column ON task(column_id)",
            "CREATE INDEX IF NOT EXISTS idx_task_position ON task(column_id, position)",
            "CREATE INDEX IF NOT EXISTS idx_task_assignee ON task(assignee_no)",
            "CREATE INDEX IF NOT EXISTS idx_task_workflow_status ON task(workflow_status)",
            "CREATE INDEX IF NOT EXISTS idx_task_priority ON task(priority)",
            "CREATE INDEX IF NOT EXISTS idx_task_due_date ON task(due_date)",
            "CREATE INDEX IF NOT EXISTS idx_task_start_date ON task(start_date)",
            "CREATE INDEX IF NOT EXISTS idx_comment_task ON comment(task_id)",
            "CREATE INDEX IF NOT EXISTS idx_comment_created ON comment(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_chat_team ON chat_message(team_id)",
            "CREATE INDEX IF NOT EXISTS idx_chat_sent ON chat_message(sent_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_task_favorite_task ON task_favorite(task_id)",
            "CREATE INDEX IF NOT EXISTS idx_task_favorite_member ON task_favorite(member_no)",
            "CREATE INDEX IF NOT EXISTS idx_task_archive_member ON task_archive(member_no)",
            "CREATE INDEX IF NOT EXISTS idx_task_archive_team ON task_archive(team_id)",
            "CREATE INDEX IF NOT EXISTS idx_task_archive_archived ON task_archive(archived_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification(recipient_no)",
            "CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(notification_type)",
            "CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(is_read)",
            "CREATE INDEX IF NOT EXISTS idx_notification_created ON notification(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_task_assignee_task ON task_assignee(task_id)",
            "CREATE INDEX IF NOT EXISTS idx_task_assignee_member ON task_assignee(member_no)",
            "CREATE INDEX IF NOT EXISTS idx_task_verifier_task ON task_verifier(task_id)",
            "CREATE INDEX IF NOT EXISTS idx_task_verifier_member ON task_verifier(member_no)",
            "CREATE INDEX IF NOT EXISTS idx_file_team ON file(team_id)",
            "CREATE INDEX IF NOT EXISTS idx_file_task ON file(task_id)",
            "CREATE INDEX IF NOT EXISTS idx_file_uploader ON file(uploader_no)",
            "CREATE INDEX IF NOT EXISTS idx_file_uploaded ON file(uploaded_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification(email)",
            "CREATE INDEX IF NOT EXISTS idx_email_verification_code ON email_verification(code)",
            "CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification(expires_at)"
        };

        for (String index : indexes) {
            executeIgnoreError(index);
        }
    }

    private void clearAllData() {
        logger.info("기존 데이터 삭제 중...");

        // 외래키 순서 고려하여 삭제
        jdbcTemplate.execute("DELETE FROM task_archive");
        jdbcTemplate.execute("DELETE FROM task_favorite");
        jdbcTemplate.execute("DELETE FROM task_verifier");
        jdbcTemplate.execute("DELETE FROM task_assignee");
        jdbcTemplate.execute("DELETE FROM comment");
        jdbcTemplate.execute("DELETE FROM task");
        jdbcTemplate.execute("DELETE FROM columns");
        jdbcTemplate.execute("DELETE FROM chat_message");
        jdbcTemplate.execute("DELETE FROM team_member");
        jdbcTemplate.execute("DELETE FROM team");
        jdbcTemplate.execute("DELETE FROM member");
        jdbcTemplate.execute("DELETE FROM notification");
        jdbcTemplate.execute("DELETE FROM file");

        // 시퀀스 초기화
        jdbcTemplate.execute("ALTER SEQUENCE member_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE team_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE column_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE task_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE comment_seq RESTART WITH 1");
        jdbcTemplate.execute("ALTER SEQUENCE chat_seq RESTART WITH 1");

        logger.info("기존 데이터 삭제 완료");
    }

    private void createMembers() {
        logger.info("회원 40명 생성 중 (관리자 10명 + 일반 30명)...");
        members = new ArrayList<>();

        // 관리자 이름 (팀 리더용)
        String[] adminNames = {
            "관리자A", "관리자B", "관리자C", "관리자D", "관리자E",
            "관리자F", "관리자G", "관리자H", "관리자I", "관리자J"
        };

        // 일반 회원 이름
        String[] userNames = {
            "김철수", "이영희", "박민수", "정수진", "최동훈",
            "강서연", "윤재호", "임지은", "한승우", "오혜진",
            "서준영", "남궁민", "황지훈", "배수지", "신동엽",
            "권나라", "송민호", "안유진", "조성민", "장윤아",
            "허준혁", "문채원", "노태우", "곽동희", "변우석",
            "설인아", "탁재훈", "라미란", "마동석", "사공민"
        };

        // 1. 관리자 계정 생성 (admin1 ~ admin10)
        for (int i = 1; i <= 10; i++) {
            Member member = new Member();
            member.setUserid("admin" + i);
            member.setPassword(passwordEncoder.encode("1234"));
            member.setName(adminNames[i - 1]);
            member.setEmail("admin" + i + "@synodos.com");
            member.setPhone("010-" + String.format("%04d", random.nextInt(10000)) + "-" + String.format("%04d", random.nextInt(10000)));
            member.setEmailVerified(true);

            memberDao.insert(member);

            Member created = memberDao.findByUserid("admin" + i);
            members.add(created);
        }

        // 2. 일반 회원 생성 (user1 ~ user30)
        for (int i = 1; i <= 30; i++) {
            Member member = new Member();
            member.setUserid("user" + i);
            member.setPassword(passwordEncoder.encode("1234"));
            member.setName(userNames[i - 1]);
            member.setEmail("user" + i + "@synodos.com");
            member.setPhone("010-" + String.format("%04d", random.nextInt(10000)) + "-" + String.format("%04d", random.nextInt(10000)));
            member.setEmailVerified(true);

            memberDao.insert(member);

            Member created = memberDao.findByUserid("user" + i);
            members.add(created);
        }

        logger.info("회원 40명 생성 완료 (admin1~10, user1~30)");
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
            // 팀장은 admin1, admin2, ... admin10 순서대로 (members 리스트의 0~9번)
            Member leader = members.get(i);

            Team team = new Team();
            team.setTeamName(teamNames[i]);
            team.setDescription(descriptions[i]);
            team.setLeaderNo(leader.getNo());
            team.setTeamCode(generateTeamCode());

            teamDao.insertTeam(team);

            // 생성된 팀 조회
            Team created = jdbcTemplate.queryForObject(
                "SELECT * FROM team WHERE team_name = ?",
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

        // 팀장을 team_member 테이블에 추가
        jdbcTemplate.update(
            "INSERT INTO team_member (team_id, member_no, role) VALUES (?, ?, ?)",
            team.getTeamId(), team.getLeaderNo(), "LEADER"
        );

        for (int i = 1; i < memberCount; i++) {
            Member member = members.get(random.nextInt(members.size()));

            // 중복 체크
            if (!addedMembers.contains(member.getNo())) {
                addedMembers.add(member.getNo());

                jdbcTemplate.update(
                    "INSERT INTO team_member (team_id, member_no, role) VALUES (?, ?, ?)",
                    team.getTeamId(), member.getNo(), "MEMBER"
                );
            }
        }
    }

    private void createTeamData(Team team) {
        logger.info("팀 '" + team.getTeamName() + "' 데이터 생성 중...");

        // 컬럼 10개 생성
        List<SynodosColumn> columns = createColumns(team);

        // 태스크 50개 생성
        createTasks(team, columns);
    }

    private List<SynodosColumn> createColumns(Team team) {
        List<SynodosColumn> columns = new ArrayList<>();

        String[] columnTitles = {
            "백로그", "할 일", "진행 중", "검토 중", "완료",
            "보류", "긴급", "개선사항", "버그", "문서화"
        };

        for (int i = 0; i < 10; i++) {
            SynodosColumn column = new SynodosColumn();
            column.setTeamId(team.getTeamId());
            column.setTitle(columnTitles[i]);
            column.setPosition(i);

            columnDao.insert(column);

            // 생성된 컬럼 조회
            SynodosColumn created = jdbcTemplate.queryForObject(
                "SELECT * FROM columns WHERE team_id = ? AND title = ?",
                (rs, rowNum) -> {
                    SynodosColumn c = new SynodosColumn();
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

    private void createTasks(Team team, List<SynodosColumn> columns) {
        // 팀 멤버 조회
        List<Member> teamMembers = jdbcTemplate.query(
            "SELECT m.* FROM member m JOIN team_member tm ON m.no = tm.member_no WHERE tm.team_id = ?",
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

        // 팀장 찾기
        Member leader = teamMembers.stream()
            .filter(m -> m.getNo() == team.getLeaderNo())
            .findFirst()
            .orElse(teamMembers.get(0));

        String[] taskTitles = {
            "API 엔드포인트 구현", "UI 컴포넌트 개발", "데이터베이스 스키마 설계",
            "버그 수정", "성능 최적화", "코드 리뷰", "테스트 케이스 작성",
            "문서 업데이트", "배포 스크립트 작성", "보안 취약점 점검",
            "사용자 피드백 반영", "신규 기능 기획", "리팩토링 작업",
            "로깅 시스템 구축", "모니터링 대시보드 개발", "알림 기능 구현",
            "검색 기능 개선", "페이지네이션 추가", "캐싱 전략 수립",
            "CI/CD 파이프라인 구성", "인증 시스템 강화", "권한 관리 구현",
            "파일 업로드 기능", "이메일 발송 기능", "실시간 알림 구현"
        };

        String[] priorities = {"URGENT", "HIGH", "MEDIUM", "LOW"};

        List<Task> createdTasks = new ArrayList<>();

        for (int i = 1; i <= 50; i++) {
            SynodosColumn column = columns.get(random.nextInt(columns.size()));

            // 검증자 유무 결정 (50% 확률)
            boolean hasVerifiers = random.nextDouble() < 0.5;

            // 상태 결정 (논리적으로 가능한 상태만 선택)
            String status = determineWorkflowStatus(hasVerifiers);

            Task task = new Task();
            task.setColumnId(column.getColumnId());
            task.setTitle(taskTitles[random.nextInt(taskTitles.length)] + " #" + i);
            task.setDescription("태스크 설명입니다. " + team.getTeamName() + "의 " + i + "번째 작업입니다.\n\n상세 내용:\n- 작업 범위 정의\n- 예상 소요 시간 산정\n- 관련 문서 참조");
            task.setPriority(priorities[random.nextInt(priorities.length)]);
            task.setWorkflowStatus(status);

            // 날짜 설정 (최근 30일 ~ 앞으로 60일)
            LocalDate startDate = LocalDate.now().minusDays(random.nextInt(30));
            LocalDate dueDate = startDate.plusDays(7 + random.nextInt(30));

            task.setStartDate(Date.valueOf(startDate));
            task.setDueDate(Date.valueOf(dueDate));
            task.setPosition(i);

            taskDao.insert(task);

            // 생성된 태스크 조회
            Task created = jdbcTemplate.queryForObject(
                "SELECT * FROM task WHERE column_id = ? AND title = ?",
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

            // 담당자 추가 (상태에 맞게)
            List<Integer> assigneeNos = addTaskAssignees(created, teamMembers, leader, status);

            // 검증자 추가 (REVIEW, DONE, REJECTED는 반드시 검증자 필요)
            if (hasVerifiers || status.equals("REVIEW") || status.equals("REJECTED")) {
                addTaskVerifiers(created, teamMembers, status, assigneeNos);
            }

            // REJECTED/DECLINED 상태인 경우 사유 추가
            if (status.equals("REJECTED") || status.equals("DECLINED")) {
                String reason = status.equals("REJECTED")
                    ? "요구사항이 충족되지 않았습니다. 수정 후 재검토 필요합니다."
                    : "현재 업무 과중으로 수행이 어렵습니다.";
                int rejectedBy = assigneeNos.isEmpty()
                    ? teamMembers.get(random.nextInt(teamMembers.size())).getNo()
                    : assigneeNos.get(0);
                jdbcTemplate.update(
                    "UPDATE task SET rejection_reason = ?, rejected_by = ?, rejected_at = CURRENT_TIMESTAMP WHERE task_id = ?",
                    reason, rejectedBy, created.getTaskId()
                );
            }

            // 댓글 추가 (50% 확률로 1~5개)
            if (random.nextDouble() < 0.5) {
                addComments(created, teamMembers);
            }
        }

        // 즐겨찾기 추가 (유저마다 0~10개, 시간차 두고)
        addFavorites(createdTasks, teamMembers);

        // 아카이브 추가 (유저마다 0~5개)
        addArchives(createdTasks, teamMembers);
    }

    /**
     * 워크플로우 상태 결정
     * - WAITING: 담당자 미수락
     * - IN_PROGRESS: 담당자 수락, 작업 중
     * - REVIEW: 담당자 완료, 검증자 검토 중 (검증자 필수)
     * - DONE: 모든 작업 완료 (검증자 있으면 승인 완료)
     * - REJECTED: 검증자가 반려 (검증자 필수)
     * - DECLINED: 담당자가 거부
     */
    private String determineWorkflowStatus(boolean hasVerifiers) {
        int rand = random.nextInt(100);

        if (rand < 15) {
            return "WAITING";       // 15%
        } else if (rand < 40) {
            return "IN_PROGRESS";   // 25%
        } else if (rand < 55 && hasVerifiers) {
            return "REVIEW";        // 15% (검증자 있을 때만)
        } else if (rand < 75) {
            return "DONE";          // 20~35%
        } else if (rand < 85 && hasVerifiers) {
            return "REJECTED";      // 10% (검증자 있을 때만)
        } else if (rand < 95) {
            return "DECLINED";      // 10%
        } else {
            return "IN_PROGRESS";   // 나머지
        }
    }

    /**
     * 담당자 추가 - 상태에 맞게 accepted/completed 설정
     * - WAITING: accepted=false, completed=false
     * - IN_PROGRESS: accepted=true, completed=false
     * - REVIEW/DONE/REJECTED: accepted=true, completed=true
     * - DECLINED: accepted=false (거부)
     */
    private List<Integer> addTaskAssignees(Task task, List<Member> teamMembers, Member leader, String status) {
        int assigneeCount = 1 + random.nextInt(3); // 1~3명
        List<Integer> addedAssignees = new ArrayList<>();

        // 팀장도 30% 확률로 담당자에 포함
        if (random.nextDouble() < 0.3) {
            addedAssignees.add(leader.getNo());
        }

        // 추가 담당자 선택
        for (int i = 0; i < assigneeCount && addedAssignees.size() < assigneeCount; i++) {
            Member member = teamMembers.get(random.nextInt(teamMembers.size()));
            if (!addedAssignees.contains(member.getNo())) {
                addedAssignees.add(member.getNo());
            }
        }

        // 최소 1명 보장
        if (addedAssignees.isEmpty()) {
            addedAssignees.add(teamMembers.get(random.nextInt(teamMembers.size())).getNo());
        }

        // 상태에 따른 accepted/completed 설정
        for (Integer memberNo : addedAssignees) {
            boolean accepted;
            boolean completed;

            switch (status) {
                case "WAITING":
                    accepted = false;
                    completed = false;
                    break;
                case "IN_PROGRESS":
                    accepted = true;
                    completed = false;
                    break;
                case "REVIEW":
                case "DONE":
                case "REJECTED":
                    accepted = true;
                    completed = true;
                    break;
                case "DECLINED":
                    accepted = false;
                    completed = false;
                    break;
                default:
                    accepted = false;
                    completed = false;
            }

            jdbcTemplate.update(
                "INSERT INTO task_assignee (task_id, member_no, accepted, completed) VALUES (?, ?, ?, ?)",
                task.getTaskId(), memberNo, accepted, completed
            );
        }

        return addedAssignees;
    }

    /**
     * 검증자 추가 - 상태에 맞게 approved 설정
     * - REVIEW: approved=false (검토 중)
     * - DONE: approved=true (승인 완료)
     * - REJECTED: approved=false (반려)
     * - 담당자와 중복되지 않도록 설정
     */
    private void addTaskVerifiers(Task task, List<Member> teamMembers, String status, List<Integer> assigneeNos) {
        int verifierCount = 1 + random.nextInt(2); // 1~2명
        List<Integer> addedVerifiers = new ArrayList<>();

        // 담당자가 아닌 멤버 중에서 검증자 선택
        List<Member> availableVerifiers = teamMembers.stream()
            .filter(m -> !assigneeNos.contains(m.getNo()))
            .collect(java.util.stream.Collectors.toList());

        // 가능한 검증자가 없으면 전체에서 선택
        if (availableVerifiers.isEmpty()) {
            availableVerifiers = teamMembers;
        }

        for (int i = 0; i < verifierCount && i < availableVerifiers.size(); i++) {
            Member member = availableVerifiers.get(random.nextInt(availableVerifiers.size()));

            if (!addedVerifiers.contains(member.getNo())) {
                addedVerifiers.add(member.getNo());

                // 상태에 따라 approved 설정
                boolean approved = status.equals("DONE");

                jdbcTemplate.update(
                    "INSERT INTO task_verifier (task_id, member_no, approved) VALUES (?, ?, ?)",
                    task.getTaskId(), member.getNo(), approved
                );
            }
        }
    }

    private void addComments(Task task, List<Member> teamMembers) {
        String[] commentTemplates = {
            "진행 상황 업데이트합니다. 현재 %d%% 완료되었습니다.",
            "관련 문서 확인 부탁드립니다.",
            "이 부분은 추가 논의가 필요할 것 같습니다.",
            "테스트 완료했습니다. 이상 없습니다.",
            "코드 리뷰 부탁드립니다.",
            "수정 사항 반영했습니다.",
            "일정 조율이 필요합니다.",
            "좋은 접근 방식인 것 같습니다!",
            "이 이슈와 연관된 작업입니다. 참고 부탁드립니다.",
            "마감일 전까지 완료 가능할 것 같습니다."
        };

        int commentCount = 1 + random.nextInt(5); // 1~5개

        for (int i = 0; i < commentCount; i++) {
            Member author = teamMembers.get(random.nextInt(teamMembers.size()));
            String content = String.format(commentTemplates[random.nextInt(commentTemplates.length)], 10 + random.nextInt(90));

            jdbcTemplate.update(
                "INSERT INTO comment (comment_id, task_id, author_no, content, created_at, updated_at) VALUES (nextval('comment_seq'), ?, ?, ?, CURRENT_TIMESTAMP - INTERVAL '" + random.nextInt(72) + " hours', CURRENT_TIMESTAMP - INTERVAL '" + random.nextInt(24) + " hours')",
                task.getTaskId(), author.getNo(), content
            );
        }
    }

    private void addFavorites(List<Task> tasks, List<Member> teamMembers) {
        for (Member member : teamMembers) {
            int favoriteCount = random.nextInt(11); // 0~10개
            List<Integer> addedFavorites = new ArrayList<>();
            int timeOffset = 0;

            for (int i = 0; i < favoriteCount && i < tasks.size(); i++) {
                Task task = tasks.get(random.nextInt(tasks.size()));

                if (!addedFavorites.contains(task.getTaskId())) {
                    addedFavorites.add(task.getTaskId());

                    // 즐겨찾기 시간을 다르게 설정하여 정렬 순서 유지 (가장 최근 것이 가장 나중에 추가됨)
                    jdbcTemplate.update(
                        "INSERT INTO task_favorite (task_id, member_no, created_at) VALUES (?, ?, CURRENT_TIMESTAMP - INTERVAL '" + timeOffset + " minutes')",
                        task.getTaskId(), member.getNo()
                    );
                    timeOffset += 5 + random.nextInt(30); // 5~35분 간격
                }
            }
        }
    }

    private void addArchives(List<Task> tasks, List<Member> teamMembers) {
        String[] archiveNotes = {
            "참고용으로 보관", "완료된 작업 아카이브", "나중에 재활용할 수 있음",
            "중요 작업 백업", "프로젝트 정리용", ""
        };

        for (Member member : teamMembers) {
            int archiveCount = random.nextInt(6); // 0~5개
            List<Integer> addedArchives = new ArrayList<>();
            int timeOffset = 0;

            for (int i = 0; i < archiveCount && i < tasks.size(); i++) {
                Task task = tasks.get(random.nextInt(tasks.size()));

                if (!addedArchives.contains(task.getTaskId())) {
                    addedArchives.add(task.getTaskId());

                    // task_snapshot을 JSON 형태로 저장 (description에서 특수문자 제거)
                    String safeDescription = task.getDescription().replace("\"", "\\\"").replace("\n", "\\n");
                    String taskSnapshot = String.format(
                        "{\"taskId\":%d,\"title\":\"%s\",\"description\":\"%s\",\"priority\":\"%s\",\"workflowStatus\":\"%s\"}",
                        task.getTaskId(), task.getTitle(), safeDescription, task.getPriority(), task.getWorkflowStatus()
                    );

                    String note = archiveNotes[random.nextInt(archiveNotes.length)];

                    jdbcTemplate.update(
                        "INSERT INTO task_archive (archive_id, original_task_id, member_no, task_snapshot, archive_note, archived_at) VALUES (nextval('task_archive_seq'), ?, ?, ?::jsonb, ?, CURRENT_TIMESTAMP - INTERVAL '" + timeOffset + " hours')",
                        task.getTaskId(), member.getNo(), taskSnapshot, note
                    );
                    timeOffset += 1 + random.nextInt(48); // 1~49시간 간격
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
