import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindId from './pages/FindId';
import FindPassword from './pages/FindPassword';
import Board from './pages/Board';
import Calendar from './pages/Calendar';
import MyPage from './pages/MyPage';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isBoardPage = location.pathname === '/board';
  const isCalendarPage = location.pathname === '/calendar';
  const isMyPage = location.pathname === '/mypage';
  const hideHeader = ['/', '/login', '/register', '/find-id', '/find-password'].includes(location.pathname);

  // Board, Calendar, MyPage 페이지는 독립적인 레이아웃 사용
  if (isBoardPage) {
    return <Board />;
  }
  if (isCalendarPage) {
    return <Calendar />;
  }
  if (isMyPage) {
    return <MyPage />;
  }

  return (
    <div className="App">
      {!hideHeader && (
        <header className="App-header">
          <h1>Flowtask</h1>
          <nav className="App-nav">
            <Link to="/board">Board</Link>
          </nav>
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
