import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Documents from "./pages/Document";
import MaintenanceChat from "./pages/MaintenanceChat";
import Admins from "./pages/Admins";
import ProtectedLayout from "./layout/ProtectedLayout";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route exact path="/" element={<Dashboard />} />
            <Route exact path="/chat" element={<Chat />} />
            <Route exact path="/documents" element={<Documents />} />
            <Route exact path="/maintenance-chat" element={<MaintenanceChat />} />
            <Route exact path="/admins" element={<Admins />} />
          </Route>

          {/* Public Routes */}
          <Route exact path="/login" element={<Login />} />

          {/* 404 - Catch all route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
