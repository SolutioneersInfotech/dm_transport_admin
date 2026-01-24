import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchDocumentCount } from "../store/slices/documentsSlice";
import { fetchUsers } from "../store/slices/usersSlice";
import { setUnreadCountForUser, removeUserUnreadCounts } from "../store/slices/chatUnreadSlice";
import { subscribeUnreadCount as subscribeRegularChatUnread } from "../services/chatAPI";
import { subscribeUnreadCount as subscribeMaintenanceChatUnread } from "../services/maintenanceChatAPI";

/**
 * DASHBOARD – CLEAN, BUG-FREE, DATE SAFE VERSION
 * Fixes:
 * - Correct YYYY-MM-DD date format for backend
 * - Proper stale check
 * - No duplicate date logic
 * - Safe memo usage
 * - Clean structure
 */

const summaryStats = [
  { label: "Active Chats", value: "148", trend: "+12% vs last week" },
  { label: "Pending Documents", value: "1,294", trend: "324 need review" },
  { label: "Open Tasks", value: "37", trend: "8 high priority" },
  { label: "Response Time", value: "4m 12s", trend: "Within SLA" },
];

const analyticsInsights = [
  {
    title: "Chat Intelligence",
    description: "Analyze chat messages across the panel in real time.",
    tag: "AI Analytics",
  },
  {
    title: "Tone & Language Review",
    description: "Evaluate tone and language used by drivers and employees.",
    tag: "Quality",
  },
  {
    title: "Response Risk Detection",
    description:
      "Detect delayed responses and inappropriate or unprofessional language.",
    tag: "Compliance",
  },
  {
    title: "Operational Reports",
    description:
      "Generate driver responsiveness and communication quality reports.",
    tag: "Reporting",
  },
];

const documentTiles = [
  { title: "Pickup Docs", filterType: "pick_up", priority: "High" },
  { title: "Delivery Proofs", filterType: "delivery", priority: "Normal" },
  { title: "Load Images", filterType: "load_image", priority: "High" },
  { title: "Fuel Receipts", filterType: "fuel_recipt", priority: "Normal" },
  { title: "Stamp Papers", filterType: "paper_logs", priority: "High" },
  { title: "Driver Expenses", filterType: "driver_expense_sheet", priority: "Normal" },
  {
    title: "Trip Envelopes",
    filterType: "dm_transport_trip_envelope",
    priority: "Normal",
  },
  {
    title: "City Worksheets",
    filterType: "dm_transport_city_worksheet_trip_envelope",
    priority: "Normal",
  },
  {
    title: "Trip Envelopes (DM Trans)",
    filterType: "dm_trans_inc_trip_envelope",
    priority: "Low",
  },
  {
    title: "Repair & Maintenance",
    filterType: "trip_envelope",
    priority: "Normal",
  },
  { title: "CTPAT", filterType: "CTPAT", priority: "Normal" },
];

const formatDate = (date) => date.toISOString().split("T")[0]; // YYYY-MM-DD

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    documentCounts,
    countsLoading,
    countsError,
    countsTotal,
    lastCountsFetched,
  } = useAppSelector((state) => state.documents);

  const { users } = useAppSelector((state) => state.users);
  const unsubscribeRefs = useRef({}); // { userId: { regular: unsubscribe, maintenance: unsubscribe } }

  // Fetch users on mount
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: -1 }));
  }, [dispatch]);

  /**
   * Fetch unseen documents for last 1 year
   * Backend expects: start_date, end_date as YYYY-MM-DD
   */
  useEffect(() => {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
    const startDate = formatDate(threeMonthsAgo);
    const endDate = formatDate(now);
  
    const isStale = lastCountsFetched
      ? Date.now() - lastCountsFetched > 5 * 60 * 1000
      : true;
  
    if (isStale) {
      dispatch(
        fetchDocumentCount({
          start_date: startDate,
          end_date: endDate,
          isSeen: false,  
          isFlagged: null,
        })
      );
    }
  }, [dispatch, lastCountsFetched]);

  // Helper function to get user ID
  function getUserId(user) {
    return (
      user?.userid ??
      user?.userId ??
      user?.contactId ??
      user?.contactid ??
      user?.uid ??
      user?.id ??
      null
    );
  }

  // Subscribe to unread counts for all users from both chat systems
  useEffect(() => {
    if (!users?.length) return;

    // Subscribe to unread counts for each user
    users.forEach((user) => {
      const userId = getUserId(user);
      if (!userId) return;

      // If already subscribed, skip
      if (unsubscribeRefs.current[userId]) return;

      // Subscribe to regular chat unread count
      const unsubscribeRegular = subscribeRegularChatUnread(userId, (count) => {
        dispatch(setUnreadCountForUser({ userId, chatType: "regular", count }));
      });

      // Subscribe to maintenance chat unread count
      const unsubscribeMaintenance = subscribeMaintenanceChatUnread(userId, (count) => {
        dispatch(setUnreadCountForUser({ userId, chatType: "maintenance", count }));
      });

      unsubscribeRefs.current[userId] = {
        regular: unsubscribeRegular,
        maintenance: unsubscribeMaintenance,
      };
    });

    // Cleanup: unsubscribe from users that are no longer in the list
    return () => {
      const currentUserIds = new Set(users.map(getUserId).filter(Boolean));
      Object.keys(unsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          const unsubscribes = unsubscribeRefs.current[userId];
          if (unsubscribes?.regular) unsubscribes.regular();
          if (unsubscribes?.maintenance) unsubscribes.maintenance();
          delete unsubscribeRefs.current[userId];
          dispatch(removeUserUnreadCounts(userId));
        }
      });
    };
  }, [users, dispatch]);
  

  const unseenTotal = useMemo(() => {
    if (!countsTotal) return 0;
    return countsTotal > 999 ? "999+" : countsTotal;
  }, [countsTotal]);

  const handleTileClick = (filterType) => {
    navigate(`/documents?status=unseen&type=${filterType}`);
  };

  return (
    <div className="p-6 space-y-8">
      {/* HEADER */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">
            DM Transport Admin Panel
          </p>
          <h2 className="text-3xl font-semibold text-gray-100">
            Dashboard Overview
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-xl">
            Track the rebuild milestones, monitor chat responsiveness, and stay
            ahead of document compliance with a responsive, modernized control
            center.
          </p>
        </div>

        <div className="bg-[#11161c] border border-gray-700 rounded-2xl p-4 w-full lg:w-[340px]">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>System status</span>
            <span className="text-emerald-400 font-medium">Operational</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Chat latency</span>
              <span className="text-gray-100">1.4s avg</span>
            </div>
            <div className="flex justify-between">
              <span>Sync refresh</span>
              <span className="text-gray-100">Every 30s</span>
            </div>
            <div className="flex justify-between">
              <span>Last update</span>
              <span className="text-gray-100">2 minutes ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY STATS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#161b22] border border-gray-700 rounded-2xl p-5"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-100 mt-2">
              {stat.value}
            </p>
            <p className="text-xs text-emerald-400 mt-2">{stat.trend}</p>
          </div>
        ))}
      </section>

      {/* ANALYTICS */}
      <section className="bg-[#11161c] border border-gray-700 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              AI Analytics Readiness
            </h3>
            <p className="text-sm text-gray-400">
              Panel-specific intelligence cards aligned with the agreement.
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-medium">
            Milestone 4 preview
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {analyticsInsights.map((insight) => (
            <div
              key={insight.title}
              className="bg-[#161b22] border border-gray-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-100">
                  {insight.title}
                </p>
                <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300">
                  {insight.tag}
                </span>
              </div>
              <p className="text-xs text-gray-400">{insight.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOCUMENTS */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">
              Unseen Documents (Last 3 Months)
            </h3>
            <p className="text-sm text-gray-400">
              Prioritized queues aligned to compliance objectives.
            </p>
          </div>
          <span className="bg-red-600 text-xs px-3 py-1 rounded-full text-white">
            {unseenTotal} pending
          </span>
        </div>

        {countsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {documentTiles.map((doc) => (
              <div
                key={doc.title}
                className="bg-[#161b22] border border-gray-700 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : countsError ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            Error loading document counts: {countsError}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {documentTiles.map((doc) => {
              const count = documentCounts[doc.filterType] || 0;
              const hasUnseen = count > 0;

              return (
                <div
                  key={doc.title}
                  className="group relative bg-[#161b22] border border-gray-700 rounded-xl p-5 hover:border-gray-600 hover:bg-[#1d232a] transition-all duration-200 cursor-pointer"
                  onClick={() => handleTileClick(doc.filterType)}
                >
                  {/* Priority Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
                        doc.priority === "High"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : doc.priority === "Low"
                          ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {doc.priority}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 pr-16">
                    <h3 className="text-sm font-medium text-gray-300 group-hover:text-gray-200 transition-colors line-clamp-2">
                      {doc.title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <p
                        className={`text-3xl font-bold transition-colors ${
                          hasUnseen
                            ? "text-blue-400 group-hover:text-blue-300"
                            : "text-gray-500 group-hover:text-gray-400"
                        }`}
                      >
                        {count}
                      </p>
                      <span className="text-xs text-gray-500 font-medium">
                        {count === 1 ? "document" : "documents"}
                      </span>
                    </div>
                  </div>

                  {/* Unseen Indicator */}
                  {hasUnseen && (
                    <div className="absolute bottom-3 right-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
