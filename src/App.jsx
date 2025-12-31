// import Sidebar from "./components/Sidebar";
// import Navbar from "./components/Navbar";
// import Dashboard from "./pages/Dashboard";
// import Chat from "./pages/chat";

// export default function App() {
//   return (
//     <div className="flex bg-[#101418] text-white min-h-screen">
//       <Sidebar />
//       <Chat />
//       <div className="flex-1">
//         <Navbar />
//         <Dashboard />
//       </div>
//     </div>
//   );
// }

// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Sidebar from "./components/Sidebar";
// import Navbar from "./components/Navbar";
// import Dashboard from "./pages/Dashboard";
// import Chat from "./pages/chat";
// import Documents from "./pages/Document";

// export default function App() {
//   return (
//     <BrowserRouter>
//       <div className="flex bg-[#101418] text-white min-h-screen">
//         {/* Sidebar always visible */}
//         <Sidebar />

//         {/* Main Area */}
//         <div className="flex-1 relative">
//           {/* 🔥 FIXED Navbar */}
//           <div className="fixed top-0 left-20 right-0 z-50">
//             <Navbar />
//           </div>

//           {/* 🔥 Scrollable Content (navbar height = ~70px) */}
//           <div className="pt-[70px] h-screen overflow-y-auto">
//             <Routes>
//               <Route path="/" element={<Dashboard />} />
//               <Route path="/chat" element={<Chat />} />
//               <Route path="/documents" element={<Documents />} />
//             </Routes>
//           </div>
//         </div>
//       </div>
//     </BrowserRouter>
//   );
// }

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Documents from "./pages/Document";
import MaintenanceChat from "./pages/MaintenanceChat";
import Drivers from "./pages/Drivers";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <BrowserRouter>
      {isLoggedIn ? (
        <div className="flex bg-[#101418] text-white min-h-screen">
          <Sidebar />

          <div className="flex-1 h-screen overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/maintenance-chat" element={<MaintenanceChat />} />
              <Route path="/drivers" element={<Drivers />} />
            </Routes>
          </div>
        </div>
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </BrowserRouter>
  );
}
