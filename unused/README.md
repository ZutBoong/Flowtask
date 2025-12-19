# Unused Files Archive

이 폴더에는 현재 사용되지 않는 것으로 판단된 파일들이 보관되어 있습니다.

## 이동된 파일 목록

### 프론트엔드 (2024-12-19)

#### Pages
- `TeamList.js` - App.js의 라우팅에 정의되지 않음
- `TeamList.css` - TeamList.js의 스타일
- `Board.js` - `/board` 경로 사용하지 않음 (BoardView로 대체)
- `Board.css` - Board.js의 스타일

#### API
- `projectApi.js` - 어떤 컴포넌트에서도 import되지 않음

### 백엔드 (2024-12-19)

#### Controller
- `ProjectController.java` - 프론트엔드에서 호출되지 않음

#### Service
- `ProjectService.java` - ProjectController에서만 사용

#### DAO
- `ProjectDao.java` - ProjectService에서만 사용

#### Model
- `Project.java` - Project 관련 클래스에서만 사용

#### Mapper
- `ProjectMapper.xml` - (존재하지 않음)

---

## 복구 방법

테스트 중 문제가 발생하면 다음 명령어로 파일을 복구할 수 있습니다:

### 프론트엔드 복구
```bash
# TeamList 복구
mv unused/frontend/pages/TeamList.js frontend/src/pages/
mv unused/frontend/pages/TeamList.css frontend/src/pages/

# Board 복구
mv unused/frontend/pages/Board.js frontend/src/pages/
mv unused/frontend/pages/Board.css frontend/src/pages/
# App.js에서 import 및 라우팅도 복구 필요

# projectApi 복구
mv unused/frontend/api/projectApi.js frontend/src/api/
```

### 백엔드 복구
```bash
# Project 관련 파일 복구
mv unused/backend/controller/ProjectController.java backend/src/main/java/com/example/demo/controller/
mv unused/backend/service/ProjectService.java backend/src/main/java/com/example/demo/service/
mv unused/backend/dao/ProjectDao.java backend/src/main/java/com/example/demo/dao/
mv unused/backend/model/Project.java backend/src/main/java/com/example/demo/model/
```

---

## 완전 삭제

테스트가 완료되고 문제가 없다면 이 폴더 전체를 삭제하면 됩니다:
```bash
rm -rf unused/
```

---

## 참고사항

- AdminView는 구현되어 있지만 TeamView의 탭에 등록되지 않아 접근할 수 없습니다
- AdminView를 활성화하려면 `TeamView.js`의 TABS 배열에 추가하면 됩니다
- Project 관련 기능은 전체적으로 구현되지 않은 것으로 보입니다
- Board.js는 `/board` 경로로 사용되었으나, 현재는 `/team/:teamId`에서 BoardView를 사용하므로 불필요

## 통계

- **프론트엔드**: 5개 파일 (TeamList.js, TeamList.css, Board.js, Board.css, projectApi.js)
- **백엔드**: 5개 파일 (ProjectController.java, ProjectService.java, ProjectDao.java, Project.java, project.xml)
- **총 10개 파일**
