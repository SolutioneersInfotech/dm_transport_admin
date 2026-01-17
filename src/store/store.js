import { configureStore } from "@reduxjs/toolkit";
import documentsReducer from "./slices/documentsSlice";
import usersReducer from "./slices/usersSlice";
import chatThreadsReducer from "./slices/chatThreadsSlice";

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    users: usersReducer,
    chatThreads: chatThreadsReducer,
  },
});
