import { configureStore } from "@reduxjs/toolkit";
import documentsReducer from "./slices/documentsSlice";
import chatThreadsReducer from "./slices/chatThreadsSlice";
import usersReducer from "./slices/usersSlice";

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    chatThreads: chatThreadsReducer,
    users: usersReducer,
  },
});
