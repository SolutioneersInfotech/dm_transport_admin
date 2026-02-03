import { createSlice } from "@reduxjs/toolkit";

const chatUnreadSlice = createSlice({
  name: "chatUnread",
  initialState: {
    totalUnreadUsersCount: 0,
    regularUnreadUsersCount: 0,
    maintenanceUnreadUsersCount: 0,
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
        if ((counts.regular || 0) > 0) {
          regularTotal += 1;
        }
        if ((counts.maintenance || 0) > 0) {
          maintenanceTotal += 1;
        }
      });
      
      state.regularUnreadUsersCount = regularTotal;
      state.maintenanceUnreadUsersCount = maintenanceTotal;
      state.totalUnreadUsersCount = regularTotal + maintenanceTotal;
    },
    clearUnreadCounts: (state) => {
      state.totalUnreadUsersCount = 0;
      state.regularUnreadUsersCount = 0;
      state.maintenanceUnreadUsersCount = 0;
      state.unreadCountsByUser = {};
    },
    removeUserUnreadCounts: (state, action) => {
      const userId = action.payload;
      if (state.unreadCountsByUser[userId]) {
        delete state.unreadCountsByUser[userId];

        let regularTotal = 0;
        let maintenanceTotal = 0;

        Object.values(state.unreadCountsByUser).forEach((counts) => {
          if ((counts.regular || 0) > 0) {
            regularTotal += 1;
          }
          if ((counts.maintenance || 0) > 0) {
            maintenanceTotal += 1;
          }
        });

        state.regularUnreadUsersCount = regularTotal;
        state.maintenanceUnreadUsersCount = maintenanceTotal;
        state.totalUnreadUsersCount = regularTotal + maintenanceTotal;
      }
    },
  },
});

export const { setUnreadCountForUser, clearUnreadCounts, removeUserUnreadCounts } = chatUnreadSlice.actions;
export default chatUnreadSlice.reducer;
