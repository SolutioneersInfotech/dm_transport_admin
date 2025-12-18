// import { useEffect, useState } from "react";
// import ChatListItem from "./ChatListItem";
// import { fetchDrivers } from "../services/chatAPI";

// const ChatList = ({ onSelectDriver }) => {
//   const [drivers, setDrivers] = useState([]);
//   const [search, setSearch] = useState("");

//   useEffect(() => {
//     loadDrivers();
//   }, []);

//   async function loadDrivers() {
//     const res = await fetchDrivers();
//     setDrivers(res?.drivers || []);
//   }

//   const filtered = drivers.filter((d) =>
//     d.driver_name.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div className="h-full">

//       {/* SEARCH BAR */}
//       <div className="p-3 border-b border-gray-700">
//         <input
//           type="text"
//           placeholder="Search drivers..."
//           className="w-full p-2 bg-[#1f2937] rounded outline-none"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//       </div>

//       {/* DRIVER LIST */}
//       <div className="overflow-y-auto h-[calc(100%-60px)]">
//         {filtered.map((driver) => (
//           <ChatListItem
//             key={driver.userid}
//             driver={driver}
//             onClick={() => onSelectDriver(driver)}
//           />
//         ))}
//       </div>

//     </div>
//   );
// };

// export default ChatList;


// import { useEffect, useState } from "react";
// import ChatListItem from "./ChatListItem";
// import { fetchUsersForChat } from "../services/chatAPI";

// const ChatList = ({ onSelectDriver }) => {
//   const [drivers, setDrivers] = useState([]);
//   const [search, setSearch] = useState("");

//   useEffect(() => {
//     loadDrivers();
//   }, []);

//   async function loadDrivers() {
//     const res = await fetchUsersForChat();

//     console.log("CHAT USERS RESPONSE:", res); // 🔥 check this output once

//     // Mapping based on /fetchusers response structure
//     const mapped =
//       res?.users?.map((u) => ({
//         userid: u.userid,
//         driver_name: u.name || u.driver_name,
//         driver_image: u.profilePic || u.image || null,
//         last_message: "",
//         last_chat_time: "",
//       })) || [];

//     setDrivers(mapped);
//   }

//   const filtered = drivers.filter((d) =>
//     d.driver_name?.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div className="h-full">

//       {/* SEARCH BAR */}
//       <div className="p-3 border-b border-gray-700">
//         <input
//           type="text"
//           placeholder="Search drivers..."
//           className="w-full p-2 bg-[#1f2937] rounded outline-none"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//       </div>

//       {/* DRIVER LIST */}
//       <div className="overflow-y-auto h-[calc(100%-60px)]">
//         {filtered.map((driver) => (
//           <ChatListItem
//             key={driver.userid}
//             driver={driver}
//             onClick={() => onSelectDriver(driver)}
//           />
//         ))}
//       </div>

//     </div>
//   );
// };

// export default ChatList;

import { useEffect, useState } from "react";
import ChatListItem from "./ChatListItem";
import { fetchUsersForChat } from "../services/chatAPI";

const ChatList = ({ onSelectDriver }) => {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    const res = await fetchUsersForChat();

    const mapped =
      res?.users?.map((u) => ({
        userid: u.userid,
        driver_name: u.name || u.driver_name,
        driver_image: u.profilePic || u.image || null,
      })) || [];

    setDrivers(mapped);
  }

  const filtered = drivers.filter((d) =>
    d.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">

      {/* SEARCH BAR (STICKY) */}
      <div className="p-3 border-b border-gray-700 sticky top-0 bg-[#0d1117] z-20">
        <input
          type="text"
          placeholder="Search drivers..."
          className="w-full p-2 bg-[#1f2937] rounded outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* DRIVER LIST (SCROLL ONLY THIS) */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((driver) => (
          <ChatListItem
            key={driver.userid}
            driver={driver}
            onClick={() => onSelectDriver(driver)}
          />
        ))}
      </div>

    </div>
  );
};

export default ChatList;
