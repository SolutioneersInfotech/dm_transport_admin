import { useState } from "react";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import * as maintenanceChatAPI from "../services/maintenanceChatAPI";

const MaintenanceChat = () => {
  const [selectedDriver, setSelectedDriver] = useState(null);

  return (
    <div className="flex w-full h-full bg-[#0d1117] text-white overflow-hidden">
      <div className="w-[320px] min-w-[280px] max-w-[340px] border-r border-gray-700 h-full overflow-hidden">
        <ChatList
          onSelectDriver={setSelectedDriver}
          chatApi={maintenanceChatAPI}
        />
      </div>

      <div className="flex-1 h-full overflow-hidden">
        {selectedDriver ? (
          <ChatWindow driver={selectedDriver} chatApi={maintenanceChatAPI} />
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500">
            Select a driver to start chat
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceChat;
