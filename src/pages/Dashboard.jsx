import DocumentCard from "../components/DocumentCard";

const summaryStats = [
  { label: "Active Chats", value: "148", trend: "+12% vs last week" },
  { label: "Pending Documents", value: "1,294", trend: "324 need review" },
  { label: "Open Tasks", value: "37", trend: "8 high priority" },
  { label: "Response Time", value: "4m 12s", trend: "Within SLA" },
];

const milestones = [
  {
    title: "Milestone 1: React Rebuild",
    progress: 78,
    items: [
      "Freeze & lag fixes",
      "Chat badge accuracy",
      "Document filters & sorting",
    ],
  },
  {
    title: "Milestone 2: Broadcast + Archival",
    progress: 45,
    items: [
      "Broadcast composer",
      "Chat notifications",
      "Data retention controls",
    ],
  },
  {
    title: "Milestone 3: Responsive + Themes",
    progress: 22,
    items: ["Sidebar collapse", "Adaptive tables", "Theme toggles"],
  },
];

const documents = [
  { title: "Pickup Docs", count: 2, priority: "High" },
  { title: "Delivery Proofs", count: 1, priority: "Normal" },
  { title: "Load Images", count: 141, priority: "High" },
  { title: "Fuel Receipts", count: 65, priority: "Normal" },
  { title: "Stamp Papers", count: 744, priority: "High" },
  { title: "Driver Expenses", count: 56, priority: "Normal" },
  { title: "Trip Envelopes", count: 170, priority: "Normal" },
  { title: "City Worksheets", count: 126, priority: "Normal" },
  { title: "Trip Envelopes (DM Trans)", count: 0, priority: "Low" },
  { title: "Repair & Maintenance", count: 69, priority: "Normal" },
  { title: "CTPAT", count: 61, priority: "Normal" },
];

const quickActions = [
  { title: "Broadcast Message", description: "Send updates to multiple drivers." },
  { title: "Review Chat Alerts", description: "Resolve new escalations." },
  { title: "Verify Documents", description: "Approve or reject pending uploads." },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-8">
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

      <section className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-[#11161c] border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">
              Milestone Progress
            </h3>
            <span className="text-xs text-gray-500">
              Agreement-aligned delivery
            </span>
          </div>
          <div className="mt-5 space-y-5">
            {milestones.map((milestone) => (
              <div key={milestone.title} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-200">
                    {milestone.title}
                  </p>
                  <span className="text-xs text-gray-400">
                    {milestone.progress}%
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400">
                  {milestone.items.map((item) => (
                    <li
                      key={item}
                      className="bg-[#161b22] border border-gray-800 rounded-lg px-3 py-2"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#11161c] border border-gray-700 rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-100">Quick Actions</h3>
          <div className="space-y-4">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="bg-[#161b22] border border-gray-800 rounded-xl p-4"
              >
                <p className="text-sm font-medium text-gray-100">
                  {action.title}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {action.description}
                </p>
                <button className="mt-3 text-xs font-semibold text-emerald-400">
                  View details →
                </button>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-emerald-500/20 to-transparent border border-emerald-600/40 rounded-xl p-4 text-sm text-gray-200">
            AI Analytics launch is scheduled for Milestone 4. Prepare your team
            by tagging driver conversations for sentiment tracking.
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-100">
              Unseen Documents
            </h3>
            <p className="text-sm text-gray-400">
              Prioritized queues aligned to compliance objectives.
            </p>
          </div>
          <span className="bg-red-600 text-xs px-3 py-1 rounded-full text-white">
            999+ pending
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {documents.map((doc) => (
            <div key={doc.title} className="relative">
              <DocumentCard title={doc.title} count={doc.count} />
              <span
                className={`absolute top-4 right-4 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${
                  doc.priority === "High"
                    ? "bg-red-500/20 text-red-300"
                    : doc.priority === "Low"
                    ? "bg-gray-500/20 text-gray-300"
                    : "bg-amber-500/20 text-amber-200"
                }`}
              >
                {doc.priority}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
