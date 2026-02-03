import { createSlice } from "@reduxjs/toolkit";

const chatUnreadSlice = createSlice({
  name: "chatUnread",
  initialState: {
    totalUnreadCount: 0,
    regularChatUnreadCount: 0,
    maintenanceChatUnreadCount: 0,
    unreadCountsByUser: {}, // { userId: { regular: number, maintenance: number } }
  },
  reducers: {
    setUnreadCountForUser: (state, action) => {
      const { userId, chatType, count } = action.payload;
      // chatType: 'regular' or 'maintenance'
      if (!state.unreadCountsByUser[userId]) {
        state.unreadCountsByUser[userId] = { regular: 0, maintenance: 0 };
      }
      state.unreadCountsByUser[userId][chatType] = count;
      
      // Recalculate totals (count users with unread, not messages)
      let regularTotal = 0;
      let maintenanceTotal = 0;
      
      Object.values(state.unreadCountsByUser).forEach((counts) => {
        if ((counts.regular || 0) > 0) regularTotal += 1;
        if ((counts.maintenance || 0) > 0) maintenanceTotal += 1;
      });
      
      state.regularChatUnreadCount = regularTotal;
      state.maintenanceChatUnreadCount = maintenanceTotal;
      state.totalUnreadCount = regularTotal + maintenanceTotal;
    },
    clearUnreadCounts: (state) => {
      state.totalUnreadCount = 0;
      state.regularChatUnreadCount = 0;
      state.maintenanceChatUnreadCount = 0;
      state.unreadCountsByUser = {};
    },
    removeUserUnreadCounts: (state, action) => {
      const userId = action.payload;
      if (state.unreadCountsByUser[userId]) {
        delete state.unreadCountsByUser[userId];
        let regularTotal = 0;
        let maintenanceTotal = 0;
        Object.values(state.unreadCountsByUser).forEach((counts) => {
          if ((counts.regular || 0) > 0) regularTotal += 1;
          if ((counts.maintenance || 0) > 0) maintenanceTotal += 1;
        });
        state.regularChatUnreadCount = regularTotal;
        state.maintenanceChatUnreadCount = maintenanceTotal;
        state.totalUnreadCount = regularTotal + maintenanceTotal;
      }
    },
  },
});

export const { setUnreadCountForUser, clearUnreadCounts, removeUserUnreadCounts } = chatUnreadSlice.actions;
export default chatUnreadSlice.reducer;
