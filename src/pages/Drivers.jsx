import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { createDriver } from "../services/driverCreateAPI";
import { uploadDriverProfilePic } from "../services/driverActionsAPI";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

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
  if (!date || Number.isNaN(date.getTime())) return "—";
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
  if (!name) return "—";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const initialFormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  category: "C",
  country: "IN",
  image: null,
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const scrollContainerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const limit = 20;
  const [formState, setFormState] = useState(initialFormState);
  const [passwordState, setPasswordState] = useState({
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const {
    data: driverData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDriversQuery({ page, limit, search: debouncedSearch });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setDrivers([]);
    setSelectedId(null);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!driverData) return;
    const incoming = driverData.users.map((driver) => ({
      ...driver,
      phone: formatPhone(driver.phone || driver.id),
      lastSeenLabel: formatRelativeTime(driver.lastSeen),
    }));

    const pagination = driverData.pagination || {};
    const derivedHasMore =
      pagination.hasMore ??
      (pagination.currentPage && pagination.totalPages
        ? pagination.currentPage < pagination.totalPages
        : incoming.length === limit);
    setHasMore(Boolean(derivedHasMore));

    if (page === 1) {
      setDrivers(incoming);
      return;
    }

    setDrivers((prev) => {
      const merged = [];
      const seen = new Set();

      const addDriver = (driver) => {
        const key = driver.id || driver.phone;
        if (key) {
          if (seen.has(key)) return;
          seen.add(key);
        }
        merged.push(driver);
      };

      prev.forEach(addDriver);
      incoming.forEach(addDriver);

      return merged;
    });
  }, [driverData, page, limit]);

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

  const isInitialLoading = isLoading && drivers.length === 0;
  const isLoadingMore = isFetching && page > 1;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetching || isInitialLoading) return;
    setPage((prev) => prev + 1);
  }, [hasMore, isFetching, isInitialLoading]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "120px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [handleLoadMore]);

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
    setSubmitError("");
    setIsSubmitting(false);
    if (type === "add") {
      setFormState(initialFormState);
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
    setSubmitError("");
    setIsSubmitting(false);
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

  const requiredFields = useMemo(
    () => ["name", "email", "phone", "password", "country", "category"],
    []
  );
  const isSubmitDisabled =
    isSubmitting ||
    (activeModal === "add" &&
      requiredFields.some((field) => {
        const value = formState[field];
        return !String(value ?? "").trim();
      }));

  async function handleSubmit() {
    if (activeModal !== "add") {
      return;
    }

    if (isSubmitDisabled) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      let imageUrl = null;

      if (formState.image) {
        imageUrl = await uploadDriverProfilePic({
          file: formState.image,
          phone: formState.phone,
        });

        if (!imageUrl) {
          throw new Error("Profile image upload failed. Please try again.");
        }
      }

      await createDriver({
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        password: formState.password,
        country: formState.country,
        category: formState.category,
        image: imageUrl,
      });

      closeModal();
      setFormState(initialFormState);
      setPage(1);
      await refetch();
    } catch (error) {
      setSubmitError(error?.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isModalOpen = activeModal !== null;
  const modalTitle =
    activeModal === "add"
      ? "Enter the following details"
      : activeModal === "edit"
        ? "Edit driver details"
        : "Change Password";

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      </section> */}

      <section className="grid flex-1 min-h-0 items-stretch gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 z-10" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, route, or phone"
                className="w-full rounded-full border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500"
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

          <div
            ref={scrollContainerRef}
            className="drivers-scroll flex-1 overflow-y-auto"
          >
            {isInitialLoading && (
              <div className="space-y-3 px-4 py-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="h-10 w-full animate-pulse rounded-xl bg-slate-900/70"
                  />
                ))}
              </div>
            )}
            {isError && !isInitialLoading && (
              <div className="flex flex-col gap-3 px-4 py-6 text-sm text-rose-300">
                <span>Unable to load drivers.</span>
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!isInitialLoading && !isError && filteredDrivers.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400">
                No drivers found.
              </div>
            )}
            {!isInitialLoading &&
              !isError &&
              filteredDrivers.map((driver) => {
                const isSelected = driver.id === selectedId;
                return (
                  <button
                    key={driver.id || driver.phone}
                    type="button"
                    onClick={() => setSelectedId(driver.id || driver.phone)}
                    className={`grid w-full grid-cols-12 items-center gap-2 border-b border-slate-900 px-4 py-3 text-left text-sm transition hover:bg-slate-900/70 ${
                      isSelected ? "bg-slate-900/80" : "bg-transparent"
                    }`}
                  >
                    <span className="col-span-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-semibold text-slate-100">
                        {driver.image ? (
                          <img
                            src={driver.image}
                            alt={driver.name || "Driver"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(driver.name || "—")
                        )}
                      </span>
                      <span>
                        <span className="block font-medium text-slate-100">
                          {driver.name || "—"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {driver.id || "—"}
                        </span>
                      </span>
                    </span>
                    <span className="col-span-3 text-slate-300">
                      {driver.phone || "—"}
                    </span>
                    <span className="col-span-2 text-slate-400">
                      {driver.country || "—"}
                    </span>
                    <span className="col-span-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          categoryStyles[driver.category] ||
                          "border-slate-700 text-slate-400"
                        }`}
                      >
                        {driver.category || "—"}
                      </span>
                    </span>
                    <span className="col-span-2 text-right text-xs text-slate-400">
                      {driver.lastSeenLabel ?? driver.lastSeen ?? "—"}
                    </span>
                  </button>
                );
              })}
            {isLoadingMore && (
              <div className="px-4 py-4 text-xs text-slate-400">
                Loading more drivers…
              </div>
            )}
            <div ref={loadMoreRef} className="h-1" />
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

        <aside className="flex resize-y flex-col gap-4 self-start overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-7">
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
                      {selectedDriver.name || "—"}
                    </p>
                    <p className="text-sm text-slate-400">
                      {selectedDriver.id || "—"} · {selectedDriver.route || "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusStyles[selectedDriver.status] ||
                    "border-slate-700 bg-slate-800 text-slate-200"
                  }`}
                >
                  {selectedDriver.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-500" />
                  {selectedDriver.phone || "—"}
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
                  Last seen{" "}
                  {selectedDriver.lastSeenLabel ??
                    selectedDriver.lastSeen ??
                    "—"}
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
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
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
                  <Input
                    type="password"
                    value={passwordState.password}
                    onChange={handlePasswordChange}
                    className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 rounded-none border-x-0 border-t-0 transition focus:border-sky-500"
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
                    <Input
                      type="text"
                      name="name"
                      value={formState.name}
                      onChange={handleFormChange}
                      placeholder="Driver name"
                      className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 rounded-none border-x-0 border-t-0 transition focus:border-sky-500"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Email
                      <Input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleFormChange}
                        placeholder="driver@email.com"
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 rounded-none border-x-0 border-t-0 transition focus:border-sky-500"
                      />
                    </label>
                    <label className="block text-sm text-slate-300">
                      Password
                      <Input
                        type="password"
                        name="password"
                        value={formState.password}
                        onChange={handleFormChange}
                        placeholder="••••••••"
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 rounded-none border-x-0 border-t-0 transition focus:border-sky-500"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Phone
                      <Input
                        type="tel"
                        name="phone"
                        value={formState.phone}
                        onChange={handleFormChange}
                        placeholder="6477200423"
                        className="mt-2 w-full border-b border-slate-700 bg-transparent pb-2 text-base text-slate-100 rounded-none border-x-0 border-t-0 transition focus:border-sky-500"
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
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    className={`rounded-full border px-10 py-2 text-sm font-semibold transition ${
                      isSubmitDisabled
                        ? "cursor-not-allowed border-slate-800 text-slate-500"
                        : "border-sky-500/60 bg-sky-500/10 text-sky-100 hover:border-sky-400 hover:bg-sky-500/20"
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
                {submitError && (
                  <p className="text-center text-sm text-rose-300">
                    {submitError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
