import { useState } from "react";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";

const Chat = () => {
  const [selectedDriver, setSelectedDriver] = useState(null);

  return (
    <div className="flex w-full h-full bg-[#0d1117] text-white overflow-hidden">
      {/* LEFT CHAT LIST (FIXED WIDTH + STICKY) */}
      <div className="w-[320px] min-w-[280px] max-w-[340px] border-r border-gray-700 h-full overflow-hidden">
        <ChatList onSelectDriver={setSelectedDriver} />
      </div>

      {/* RIGHT CHAT WINDOW (TAKES REST SPACE) */}
      <div className="flex-1 h-full overflow-hidden">
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
