import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Documents from "./pages/Document";
import MaintenanceChat from "./pages/MaintenanceChat";
import Drivers from "./pages/Drivers";
import Admins from "./pages/Admins";
import ProtectedLayout from "./layout/ProtectedLayout";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
https://github.com/SolutioneersInfotech/dm_transport_admin/pull/23/conflict?name=src%252FApp.jsx&ancestor_oid=dbb21144f9747e06c6ee12a77ff7c8cffa331845&base_oid=9380e058236bacc65c16e20e10f481ca1ff1989f&head_oid=7fde0341cbbf290c5c3de6c8e1486e20e4984e7a  return (
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
            <Route exact path="/drivers" element={<Drivers />} />
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
