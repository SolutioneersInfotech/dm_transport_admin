import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchMaintenanceUsersRoute } from "../../utils/apiRoutes";

const defaultState = {
  users: [],
  loading: false,
  error: null,
  hasLoaded: false,
};

export const fetchMaintenanceUsers = createAsyncThunk(
  "maintenanceUsers/fetchMaintenanceUsers",
  async ({ limit = -1, search = undefined } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchMaintenanceUsersRoute(limit, search);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to fetch maintenance users");
      }

      return {
        users: data.users || [],
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch maintenance users");
    }
  }
);

const matchUserId = (u, userid) =>
  u.userid === userid ||
  u.userId === userid ||
  u.contactId === userid ||
  u.contactid === userid ||
  u.uid === userid ||
  u.id === userid;

const maintenanceUsersSlice = createSlice({
  name: "maintenanceUsers",
  initialState: defaultState,
  reducers: {
    clearMaintenanceUsers: (state) => {
      state.users = [];
      state.error = null;
      state.hasLoaded = false;
    },
    updateMaintenanceUserLastMessage: (state, action) => {
      const { userid, lastMessage, lastChatTime } = action.payload;
      const user = state.users.find((u) => matchUserId(u, userid));
      if (user) {
        user.last_message = lastMessage;
        user.last_chat_time = lastChatTime;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaintenanceUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMaintenanceUsers.fulfilled, (state, action) => {
        // Strip last_message/last_chat_time so ChatList re-fetches from Firebase and sorts by real order
        state.users = (action.payload.users || []).map((u) => ({
          ...u,
          last_message: undefined,
          last_chat_time: undefined,
        }));
        state.loading = false;
        state.hasLoaded = true;
        state.error = null;
      })
      .addCase(fetchMaintenanceUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.hasLoaded = true;
      });
  },
});

export const { clearMaintenanceUsers, updateMaintenanceUserLastMessage } =
  maintenanceUsersSlice.actions;
export default maintenanceUsersSlice.reducer;
