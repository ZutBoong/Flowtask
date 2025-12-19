import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindId from './pages/FindId';
import FindPassword from './pages/FindPassword';
import Calendar from './pages/Calendar';
import TeamView from './pages/TeamView';
import MyPage from './pages/MyPage';
import MyActivity from './pages/MyActivity';
import CreateTeam from './pages/CreateTeam';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isCalendarPage = location.pathname === '/calendar';
  const isTeamPage = location.pathname.startsWith('/team/');
  const isMyPage = location.pathname === '/mypage';
  const isMyActivity = location.pathname === '/activity';
  const isCreateTeam = location.pathname === '/create-team';
  const hideHeader = ['/', '/login', '/register', '/find-id', '/find-password'].includes(location.pathname);

  // TeamView, Calendar, MyPage, MyActivity, CreateTeam 페이지는 독립적인 레이아웃 사용
  // TeamView는 Routes 내에서 렌더링 (useParams 사용을 위해)
  if (isTeamPage) {
    return (
      <Routes>
        <Route path="/team/:teamId" element={<TeamView />} />
      </Routes>
    );
  }
  if (isCalendarPage) {
    return <Calendar />;
  }
  if (isMyPage) {
    return <MyPage />;
  }
  if (isMyActivity) {
    return <MyActivity />;
  }
  if (isCreateTeam) {
    return <CreateTeam />;
  }

  return (
    <div className="App">
      {!hideHeader && (
        <header className="App-header">
          <h1>Flowtask</h1>
        </header>
      )}
      <main className={hideHeader ? 'no-header' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
