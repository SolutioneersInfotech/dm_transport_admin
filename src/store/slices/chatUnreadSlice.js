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
      
      // Recalculate totals
      let regularTotal = 0;
      let maintenanceTotal = 0;
      
      Object.values(state.unreadCountsByUser).forEach((counts) => {
        regularTotal += counts.regular || 0;
        maintenanceTotal += counts.maintenance || 0;
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
        const counts = state.unreadCountsByUser[userId];
        state.regularChatUnreadCount -= counts.regular || 0;
        state.maintenanceChatUnreadCount -= counts.maintenance || 0;
        delete state.unreadCountsByUser[userId];
        state.totalUnreadCount = state.regularChatUnreadCount + state.maintenanceChatUnreadCount;
      }
    },
  },
});

export const { setUnreadCountForUser, clearUnreadCounts, removeUserUnreadCounts } = chatUnreadSlice.actions;
export default chatUnreadSlice.reducer;
