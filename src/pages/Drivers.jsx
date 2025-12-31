import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  CalendarClock,
  MessageCircle,
  Ban,
  Star,
  X,
  UploadCloud,
  KeyRound,
  Pencil,
} from "lucide-react";
import { useDriversQuery } from "../services/driverQueries";

const initialDrivers = [
  {
    id: "DRV-221",
    name: "Deepak Jeed",
    phone: "(313) 819-6325",
    country: "CA",
    category: "C",
    status: "active",
    lastSeen: "5m ago",
    email: "deepak.jeed@dmtransport.io",
    location: "Winnipeg, MB",
    route: "Calgary → Toronto",
    loadsCompleted: 42,
    rating: 4.8,
    complianceScore: 92,
    maintenanceChat: true,
  },
  {
    id: "DRV-284",
    name: "Raman Montreal",
    phone: "(416) 456-0737",
    country: "CA",
    category: "C",
    status: "active",
    lastSeen: "12m ago",
    email: "raman.montreal@dmtransport.io",
    location: "Montreal, QC",
    route: "Montreal → Boston",
    loadsCompleted: 38,
    rating: 4.6,
    complianceScore: 88,
    maintenanceChat: false,
  },
  {
    id: "DRV-295",
    name: "Amandeep Singh",
    phone: "(204) 899-0384",
    country: "CA",
    category: "C",
    status: "active",
    lastSeen: "30m ago",
    email: "amandeep.singh@dmtransport.io",
    location: "Regina, SK",
    route: "Saskatoon → Edmonton",
    loadsCompleted: 28,
    rating: 4.3,
    complianceScore: 90,
    maintenanceChat: true,
  },
  {
    id: "DRV-307",
    name: "Birnishan",
    phone: "(204) 210-0003",
    country: "CA",
    category: "D",
    status: "inactive",
    lastSeen: "2 days ago",
    email: "birnishan@dmtransport.io",
    location: "Winnipeg, MB",
    route: "Winnipeg → Fargo",
    loadsCompleted: 64,
    rating: 4.1,
    complianceScore: 75,
    maintenanceChat: false,
  },
  {
    id: "DRV-318",
    name: "Hardeep Saini",
    phone: "(647) 720-0423",
    country: "CA",
    category: "C",
    status: "active",
    lastSeen: "1h ago",
    email: "hardeep.saini@dmtransport.io",
    location: "Brampton, ON",
    route: "Toronto → Detroit",
    loadsCompleted: 57,
    rating: 4.5,
    complianceScore: 86,
    maintenanceChat: true,
  },
  {
    id: "DRV-325",
    name: "Haradev City 764",
    phone: "(404) 937-0694",
    country: "US",
    category: "F",
    status: "active",
    lastSeen: "3h ago",
    email: "haradev.city@dmtransport.io",
    location: "Chicago, IL",
    route: "Chicago → Atlanta",
    loadsCompleted: 33,
    rating: 4.0,
    complianceScore: 82,
    maintenanceChat: false,
  },
  {
    id: "DRV-332",
    name: "Jaswinder K",
    phone: "(204) 891-2692",
    country: "CA",
    category: "C",
    status: "active",
    lastSeen: "6h ago",
    email: "jaswinder.k@dmtransport.io",
    location: "Calgary, AB",
    route: "Calgary → Vancouver",
    loadsCompleted: 49,
    rating: 4.7,
    complianceScore: 95,
    maintenanceChat: true,
  },
  {
    id: "DRV-340",
    name: "Joseph Correya",
    phone: "(905) 325-3005",
    country: "CA",
    category: "D",
    status: "inactive",
    lastSeen: "5 days ago",
    email: "joseph.correya@dmtransport.io",
    location: "Burlington, ON",
    route: "Hamilton → New York",
    loadsCompleted: 71,
    rating: 3.9,
    complianceScore: 70,
    maintenanceChat: false,
  },
];

const statusStyles = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  inactive: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

const categoryStyles = {
  C: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  D: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  F: "bg-purple-500/15 text-purple-300 border-purple-500/20",
};

function formatPhone(phone) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatRelativeTime(date) {
  if (!date) return "—";
  const delta = Date.now() - date.getTime();
  const minutes = Math.floor(delta / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Drivers() {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(initialDrivers[0]?.id ?? null);
  const [activeModal, setActiveModal] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    category: "C",
    country: "IN",
    image: null,
  });
  const [passwordState, setPasswordState] = useState({
    password: "",
  });
  const { data: driverData = [], isLoading, isError } = useDriversQuery();

  const mergedDrivers = useMemo(() => {
    if (driverData.length > 0) {
      return driverData.map((driver) => ({
        ...driver,
        phone: formatPhone(driver.phone || driver.id),
        lastSeenLabel: formatRelativeTime(driver.lastSeen),
      }));
    }

    return initialDrivers.map((driver) => ({
      ...driver,
      lastSeenLabel: driver.lastSeen,
    }));
  }, [driverData]);

  useEffect(() => {
    if (isLoading || isError) return;
    setDrivers(mergedDrivers);
  }, [isLoading, isError, mergedDrivers]);

  useEffect(() => {
    if (drivers.length === 0) return;
    if (drivers.some((driver) => driver.id === selectedId)) return;
    setSelectedId(drivers[0]?.id ?? null);
  }, [drivers, selectedId]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = [
        driver.name,
        driver.phone,
        driver.id,
        driver.location,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || driver.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || driver.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [drivers, search, statusFilter, categoryFilter]);

  const selectedDriver =
    drivers.find((driver) => driver.id === selectedId) ?? drivers[0];
  const totalDrivers = drivers.length || 0;
  const activeDrivers = drivers.filter(
    (driver) => driver.status === "active"
  ).length;
  const complianceAlerts = drivers.filter(
    (driver) => driver.complianceScore !== null && driver.complianceScore < 80
  ).length;
  const averageRating = useMemo(() => {
    const ratings = drivers
      .map((driver) => driver.rating)
      .filter((rating) => typeof rating === "number");
    if (!ratings.length) return "—";
    const avg =
      ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
    return avg.toFixed(1);
  }, [drivers]);

  function toggleMaintenanceChat() {
    if (!selectedDriver) return;

    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === selectedDriver.id
          ? { ...driver, maintenanceChat: !driver.maintenanceChat }
          : driver
      )
    );
  }

  function openModal(type) {
    if (type === "add") {
      setFormState({
        name: "",
        email: "",
        password: "",
        phone: "",
        category: "C",
        country: "IN",
        image: null,
      });
    }

    if (type === "edit" && selectedDriver) {
      setFormState({
        name: selectedDriver.name,
        email: selectedDriver.email,
        password: "••••••••",
        phone: selectedDriver.phone.replace(/\D/g, ""),
        category: selectedDriver.category,
        country: selectedDriver.country,
        image: null,
      });
    }

    if (type === "password") {
      setPasswordState({ password: "" });
    }

    setActiveModal(type);
  }

  function closeModal() {
    setActiveModal(null);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setFormState((prev) => ({ ...prev, image: file }));
  }

  function handlePasswordChange(event) {
    setPasswordState({ password: event.target.value });
  }

  const isModalOpen = activeModal !== null;
  const modalTitle =
    activeModal === "add"
      ? "Enter the following details"
      : activeModal === "edit"
        ? "Edit driver details"
        : "Change Password";

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Operations · Drivers
          </p>
          <h1 className="text-3xl font-semibold text-slate-100">Drivers</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Monitor your fleet roster, review compliance metrics, and manage
            driver availability from a single, modernized workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
          >
            Export roster
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Total Drivers</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">
            {totalDrivers}
          </p>
          <p className="mt-2 text-xs text-emerald-400">+6 added this month</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Active on road</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">
            {activeDrivers}
          </p>
          <p className="mt-2 text-xs text-slate-500">12 on city assignments</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Compliance alerts</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">
            {complianceAlerts}
          </p>
          <p className="mt-2 text-xs text-amber-400">5 expiring licenses</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Average rating</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">
            {averageRating}
          </p>
          <p className="mt-2 text-xs text-slate-500">Across 2,140 trips</p>
        </div>
      </section>

      <section className="grid flex-1 min-h-0 items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex h-[640px] flex-col rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, route, or phone"
                className="w-full rounded-full border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["all", "active", "inactive"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3 py-1 transition ${
                    statusFilter === status
                      ? "border-sky-500 bg-sky-500/20 text-sky-200"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {status === "all"
                    ? "All status"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-xs text-slate-400">
            <div className="flex flex-wrap gap-2">
              {["all", "C", "D", "F"].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-full border px-3 py-1 transition ${
                    categoryFilter === category
                      ? "border-slate-500 bg-slate-800 text-slate-100"
                      : "border-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {category === "all" ? "All categories" : `Category ${category}`}
                </button>
              ))}
            </div>
            <span>{filteredDrivers.length} drivers</span>
          </div>

          <div className="grid grid-cols-12 gap-2 border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span className="col-span-4">Driver</span>
            <span className="col-span-3">Phone</span>
            <span className="col-span-2">Country</span>
            <span className="col-span-1">Cat</span>
            <span className="col-span-2 text-right">Last seen</span>
          </div>

          <div className="drivers-scroll flex-1 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-6 text-sm text-slate-400">
                Loading drivers…
              </div>
            )}
            {isError && (
              <div className="px-4 py-6 text-sm text-rose-300">
                Unable to load drivers. Showing cached view.
              </div>
            )}
            {filteredDrivers.map((driver) => {
              const isSelected = driver.id === selectedId;
              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => setSelectedId(driver.id)}
                  className={`grid w-full grid-cols-12 items-center gap-2 border-b border-slate-900 px-4 py-3 text-left text-sm transition hover:bg-slate-900/70 ${
                    isSelected ? "bg-slate-900/80" : "bg-transparent"
                  }`}
                >
                  <span className="col-span-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-semibold text-slate-100">
                      {driver.image ? (
                        <img
                          src={driver.image}
                          alt={driver.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(driver.name)
                      )}
                    </span>
                    <span>
                      <span className="block font-medium text-slate-100">
                        {driver.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {driver.id}
                      </span>
                    </span>
                  </span>
                  <span className="col-span-3 text-slate-300">
                    {driver.phone}
                  </span>
                  <span className="col-span-2 text-slate-400">
                    {driver.country}
                  </span>
                  <span className="col-span-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        categoryStyles[driver.category]
                      }`}
                    >
                      {driver.category}
                    </span>
                  </span>
                  <span className="col-span-2 text-right text-xs text-slate-400">
                    {driver.lastSeenLabel ?? driver.lastSeen}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-800 bg-slate-950/95 px-4 py-3 text-sm text-slate-400 backdrop-blur">
            <span>Total drivers: {totalDrivers}</span>
            <button
              type="button"
              onClick={() => openModal("add")}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500"
            >
              + Add Driver
            </button>
          </div>
        </div>

        <aside className="flex flex-col gap-4 self-start rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          {selectedDriver ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 text-lg font-semibold text-slate-100">
                    {selectedDriver.image ? (
                      <img
                        src={selectedDriver.image}
                        alt={selectedDriver.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedDriver.name)
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-100">
                      {selectedDriver.name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {selectedDriver.id} · {selectedDriver.route || "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusStyles[selectedDriver.status]
                  }`}
                >
                  {selectedDriver.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-500" />
                  {selectedDriver.phone}
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  {selectedDriver.email || "—"}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {selectedDriver.location || "—"}
                </div>
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  Last seen {selectedDriver.lastSeenLabel ?? selectedDriver.lastSeen}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400">Loads completed</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">
                    {selectedDriver.loadsCompleted ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400">Rating</p>
                  <p className="mt-2 flex items-center gap-1 text-lg font-semibold text-slate-100">
                    <Star className="h-4 w-4 text-amber-400" />
                    {selectedDriver.rating ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400">Compliance</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">
                    {selectedDriver.complianceScore ?? "—"}
                    {selectedDriver.complianceScore !== null ? "%" : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Show maintenance chat
                    </p>
                    <p className="text-xs text-slate-500">
                      Enable direct access for maintenance updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleMaintenanceChat}
                    className={`relative h-7 w-12 rounded-full transition ${
                      selectedDriver.maintenanceChat
                        ? "bg-emerald-500/40"
                        : "bg-slate-700"
                    }`}
                    aria-pressed={selectedDriver.maintenanceChat}
                  >
                    <span
                      className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition ${
                        selectedDriver.maintenanceChat ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Latest activity
                  </p>
                  <div className="mt-3 space-y-3 text-sm text-slate-300">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      License verified · Compliance check passed
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-sky-400" />
                      Assigned to {selectedDriver.route}
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-4 w-4 text-purple-400" />
                      2 active chats with dispatch
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message driver
                  </button>
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400"
                  >
                    <Ban className="h-4 w-4" />
                    Deactivate
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openModal("edit")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit driver
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal("password")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              Select a driver to view details.
            </div>
          )}
        </aside>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold">{modalTitle}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-800 p-2 text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeModal === "password" ? (
              <div className="space-y-6 px-6 py-6">
                <label className="block text-sm text-slate-300">
                  New Password
                  <input
                    type="password"
                    value={passwordState.password}
                    onChange={handlePasswordChange}
                    className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 outline-none transition focus:border-sky-500"
                  />
                </label>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="rounded-full border border-slate-700 px-6 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 px-6 py-6">
                <div className="space-y-4">
                  <label className="block text-sm text-slate-300">
                    Name
                    <input
                      type="text"
                      name="name"
                      value={formState.name}
                      onChange={handleFormChange}
                      placeholder="Driver name"
                      className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 outline-none transition focus:border-sky-500"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Email
                      <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleFormChange}
                        placeholder="driver@email.com"
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <label className="block text-sm text-slate-300">
                      Password
                      <input
                        type="password"
                        name="password"
                        value={formState.password}
                        onChange={handleFormChange}
                        placeholder="••••••••"
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 outline-none transition focus:border-sky-500"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Phone
                      <input
                        type="tel"
                        name="phone"
                        value={formState.phone}
                        onChange={handleFormChange}
                        placeholder="6477200423"
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 outline-none transition focus:border-sky-500"
                      />
                    </label>
                    <label className="block text-sm text-slate-300">
                      Category
                      <select
                        name="category"
                        value={formState.category}
                        onChange={handleFormChange}
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 outline-none transition focus:border-sky-500"
                      >
                        <option className="text-slate-900" value="C">
                          C
                        </option>
                        <option className="text-slate-900" value="D">
                          D
                        </option>
                        <option className="text-slate-900" value="F">
                          F
                        </option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-slate-300">Select Country</p>
                  <div className="flex w-full max-w-xs overflow-hidden rounded-full border border-slate-700 text-sm">
                    {["IN", "US", "CA"].map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({ ...prev, country }))
                        }
                        className={`flex-1 px-4 py-1.5 transition ${
                          formState.country === country
                            ? "bg-slate-800 text-slate-100"
                            : "text-slate-400"
                        }`}
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900">
                    <UploadCloud className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2">
                    <span className="text-sm text-slate-400">
                      {formState.image ? formState.image.name : "No image selected"}
                    </span>
                    <label className="cursor-pointer rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
                      Browse
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    className="rounded-full border border-slate-700 px-10 py-2 text-sm font-semibold text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
