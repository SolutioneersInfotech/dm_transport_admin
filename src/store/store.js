import { configureStore } from "@reduxjs/toolkit";
import documentsReducer from "./slices/documentsSlice";
import usersReducer from "./slices/usersSlice";

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    users: usersReducer,
  },
});

