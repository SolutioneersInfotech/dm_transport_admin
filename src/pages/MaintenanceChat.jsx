import { useState, useCallback } from "react";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import * as maintenanceChatAPI from "../services/maintenanceChatAPI";
import { useAppDispatch } from "../store/hooks";
import { fetchMaintenanceUsers } from "../store/slices/maintenanceUsersSlice";
import useAppResumeSync from "../hooks/useAppResumeSync";

const MaintenanceChat = () => {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const dispatch = useAppDispatch();

  const handleResume = useCallback(() => {
    dispatch(fetchMaintenanceUsers({ limit: -1 }));

    if (selectedDriver) {
      setRefreshSignal((prev) => prev + 1);
    }
  }, [dispatch, selectedDriver]);

  useAppResumeSync(handleResume);

  return (
    <div className="flex w-full h-full bg-[#0d1117] text-white overflow-hidden">
      <div className="w-[320px] min-w-[280px] max-w-[340px] border-r border-gray-700 h-full overflow-hidden">
        <ChatList
          onSelectDriver={setSelectedDriver}
          selectedDriver={selectedDriver}
          chatApi={maintenanceChatAPI}
        />
      </div>

      <div className="flex-1 h-full overflow-hidden">
        {selectedDriver ? (
          <ChatWindow driver={selectedDriver} chatApi={maintenanceChatAPI} refreshSignal={refreshSignal} />
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
