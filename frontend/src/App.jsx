import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreatePoll from './pages/CreatePoll';
import Poll from './pages/Poll';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <Router>
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-poll" element={<CreatePoll />} />
          <Route path="/poll/:id" element={<Poll />} />
          <Route path="/analytics/:id" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>QuickPoll &copy; {new Date().getFullYear()}</p>
      </footer>
    </Router>
  );
}

export default App;
