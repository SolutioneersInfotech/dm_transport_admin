import { configureStore } from "@reduxjs/toolkit";
import documentsReducer from "./slices/documentsSlice";
import chatThreadsReducer from "./slices/chatThreadsSlice";
import usersReducer from "./slices/usersSlice";
import maintenanceUsersReducer from "./slices/maintenanceUsersSlice";
import chatUnreadReducer from "./slices/chatUnreadSlice";

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    chatThreads: chatThreadsReducer,
    users: usersReducer,
    maintenanceUsers: maintenanceUsersReducer,
    chatUnread: chatUnreadReducer,
  },
});
