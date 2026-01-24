import { configureStore } from "@reduxjs/toolkit";
import documentsReducer from "./slices/documentsSlice";
import usersReducer from "./slices/usersSlice";
import chatUnreadReducer from "./slices/chatUnreadSlice";

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    users: usersReducer,
    chatUnread: chatUnreadReducer,
  },
});

