// import { useState } from "react";
// import ChatList from "../components/ChatList";
// import ChatWindow from "../components/ChatWindow";

// const Chat = () => {
//   const [selectedDriver, setSelectedDriver] = useState(null);

//   return (
//     <div className="flex w-full h-screen bg-[#0d1117] text-white">

//       {/* LEFT CHAT LIST */}
//       <div className="w-[30%] border-r border-gray-700">
//         <ChatList onSelectDriver={setSelectedDriver} />
//       </div>

//       {/* RIGHT CHAT WINDOW */}
//       <div className="w-[70%]">
//         {selectedDriver ? (
//           <ChatWindow driver={selectedDriver} />
//         ) : (
//           <div className="flex justify-center items-center h-full text-gray-500">
//             Select a driver to start chat
//           </div>
//         )}
//       </div>

//     </div>
//   );
// };

// export default Chat;

import { useState } from "react";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";

const Chat = () => {
  const [selectedDriver, setSelectedDriver] = useState(null);

  return (
    <div className="flex w-full h-screen bg-[#0d1117] text-white overflow-hidden">

      {/* LEFT CHAT LIST */}
      <div className="w-[30%] h-full border-r border-gray-700 overflow-y-auto">
        <ChatList onSelectDriver={setSelectedDriver} />
      </div>

      {/* RIGHT CHAT WINDOW */}
      <div className="w-[70%] h-full overflow-hidden">
        {selectedDriver ? (
          <ChatWindow driver={selectedDriver} />
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500">
            Select a driver to start chat
          </div>
        )}
      </div>

    </div>
  );
};

export default Chat;
