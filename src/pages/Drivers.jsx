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
  Circle,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useDriverCountQuery, useDriversQuery } from "../services/driverQueries";
import { fetchAllDrivers } from "../services/driverAPI";
import {
  createDriver,
  updateDriver,
  deactivateDriver,
  deleteDriver,
} from "../services/driverCreateAPI";
import { uploadDriverProfilePhoto } from "../services/driverPhotoUpload";
import { getShowMaintenanceChat, setShowMaintenanceChat } from "../services/driverConfigAPI";
import { sendMessage as sendChatMessage } from "../services/chatAPI";
import { useAppDispatch } from "../store/hooks";
import { updateUserLastMessage } from "../store/slices/usersSlice";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { useAuth } from "../context/AuthContext";
import { ADMIN_PERMISSION_KEYS, hasAdminPermission } from "../utils/adminPermissions";

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

function normalizeSearchText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDriver(driver) {
  return {
    ...driver,
    phone: formatPhone(driver.phone || driver.id),
    lastSeenLabel: formatRelativeTime(driver.lastSeen),
  };
}

function isDriverInactive(driver) {
  return driver?.isDeactivated === true;
}

function mergeUniqueDrivers(...driverGroups) {
  const merged = [];
  const seen = new Set();

  driverGroups.flat().forEach((driver) => {
    const key = driver.id || driver.phone;
    if (!key) {
      merged.push(driver);
      return;
    }

    if (seen.has(key)) return;
    seen.add(key);
    merged.push(driver);
  });

  return merged;
}

function driverMatchesSearch(driver, searchTerm) {
  const normalizedTerm = normalizeSearchText(searchTerm);
  if (!normalizedTerm) return true;

  const terms = normalizedTerm.split(" ").filter(Boolean);
  if (!terms.length) return true;

  const searchFields = [
    driver.name,
    driver.phone,
    driver.id,
    driver.location,
    driver.searchKeywords,
  ]
    .map(normalizeSearchText)
    .filter(Boolean);

  return terms.every((term) =>
    searchFields.some((field) => field.includes(term) || field.startsWith(term))
  );
}

function formatDriverForDisplay(driver) {
  return {
    ...driver,
    phone: formatPhone(driver.phone || driver.id),
    lastSeenLabel: formatRelativeTime(driver.lastSeen),
  };
}

function mergeDrivers(baseDrivers, incomingDrivers) {
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

  baseDrivers.forEach(addDriver);
  incomingDrivers.forEach(addDriver);

  return merged;
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
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadedPhone, setUploadedPhone] = useState("");
  const [detailsWidth, setDetailsWidth] = useState(425);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [passwordSubmitError, setPasswordSubmitError] = useState("");
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [quickMessage, setQuickMessage] = useState("");
  const [isQuickMessageSending, setIsQuickMessageSending] = useState(false);
  const [showMaintenanceChat, setShowMaintenanceChatState] = useState(false);
  const [loadingMaintenanceChat, setLoadingMaintenanceChat] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchCacheRef = useRef([]);
  const hasHydratedSearchCacheRef = useRef(false);
  const isHydratingSearchCacheRef = useRef(false);
  const getCachedSearchDrivers = useCallback(
    () => searchCacheRef.current,
    []
  );
  const setCachedSearchDrivers = useCallback((nextDrivers) => {
    searchCacheRef.current = nextDrivers;
  }, []);
  const [skeletonRows, setSkeletonRows] = useState(8);
  const canManageDrivers = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.manageDrivers),
    [user?.permissions]
  );
  const isFetchingLocalSearchRef = useRef(false);
  const isResizingRef = useRef(false);
  const sectionRef = useRef(null);
  const {
    data: driverData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDriversQuery({ page, limit, search: debouncedSearch });
  const { data: driverCountData, isLoading: isDriverCountLoading } = useDriverCountQuery({
    search: debouncedSearch,
    status: statusFilter,
    category: categoryFilter,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const activeSearch = debouncedSearch.trim();
    if (!activeSearch) {
      setIsSearchLoading(false);
      setSearchError("");
      return;
    }

    const cachedMatches = getCachedSearchDrivers().filter((driver) =>
      driverMatchesSearch(driver, activeSearch)
    );
    setDrivers(cachedMatches);
    setSelectedId(cachedMatches[0]?.id ?? null);
    setHasMore(false);

    if (hasHydratedSearchCacheRef.current || isHydratingSearchCacheRef.current) {
      return;
    }

    let cancelled = false;
    isHydratingSearchCacheRef.current = true;

    const hydrateSearchCache = async () => {
      try {
        isFetchingLocalSearchRef.current = true;
        setIsSearchLoading(true);
        setSearchError("");

        const allDrivers = await fetchAllDrivers({ limit: 100 });
        if (cancelled) return;

        const formattedDrivers = allDrivers.map(formatDriver);
        const mergedCache = mergeUniqueDrivers(
          getCachedSearchDrivers(),
          formattedDrivers
        );
        setCachedSearchDrivers(mergedCache);
        hasHydratedSearchCacheRef.current = true;

        const supplementedMatches = mergedCache.filter((driver) =>
          driverMatchesSearch(driver, activeSearch)
        );
        setDrivers(supplementedMatches);
        setSelectedId(supplementedMatches[0]?.id ?? null);
      } catch {
        if (cancelled) return;
        setSearchError("Unable to load complete search results.");
      } finally {
        isHydratingSearchCacheRef.current = false;
        if (!cancelled) {
          setIsSearchLoading(false);
        }
      }
    };

    hydrateSearchCache();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, getCachedSearchDrivers, setCachedSearchDrivers]);

  useEffect(() => {
    if (!driverData) return;

    // Format drivers coming from the API
    const incoming = driverData.users.map(formatDriver);

    // Preserve existing maintenanceChat flags for matching drivers
    const previousDrivers = drivers || [];
    const maintenanceMap = new Map(
      previousDrivers.map((driver) => {
        const key = driver.id || driver.phone;
        return [key, driver.maintenanceChat];
      })
    );

    const incomingWithMaintenance = incoming.map((driver) => {
      const key = driver.id || driver.phone;
      const maintenanceChat = maintenanceMap.get(key);
      return typeof maintenanceChat === "boolean"
        ? { ...driver, maintenanceChat }
        : driver;
    });

    // Use the enriched list everywhere below instead of the raw incoming list
    setCachedSearchDrivers(
      mergeUniqueDrivers(getCachedSearchDrivers(), incomingWithMaintenance)
    );

    const activeSearch = debouncedSearch.trim();
    if (activeSearch) {
      const supplementedMatches = getCachedSearchDrivers().filter((driver) =>
        driverMatchesSearch(driver, activeSearch)
      );
      setDrivers(supplementedMatches);
      setSelectedId(supplementedMatches[0]?.id ?? null);
      setHasMore(false);
      return;
    }

    const pagination = driverData.pagination || {};
    const derivedHasMore =
      pagination.hasMore ??
      (pagination.currentPage && pagination.totalPages
        ? pagination.currentPage < pagination.totalPages
        : incomingWithMaintenance.length === limit);
    setHasMore(Boolean(derivedHasMore));

    if (page === 1) {
      setDrivers(incomingWithMaintenance);
      return;
    }

    setDrivers((prev) => mergeUniqueDrivers(prev, incomingWithMaintenance));
  }, [
    driverData,
    page,
    limit,
    debouncedSearch,
    getCachedSearchDrivers,
    setCachedSearchDrivers,
  ]);

  useEffect(() => {
    if (drivers.length === 0) return;
    if (drivers.some((driver) => driver.id === selectedId)) return;
    setSelectedId(drivers[0]?.id ?? null);
  }, [drivers, selectedId]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizingRef.current) return;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const minWidth = 280;
      const minListWidth = 320;
      const maxWidth = Math.max(minWidth, rect.width - minListWidth);
      const nextWidth = Math.min(
        maxWidth,
        Math.max(minWidth, rect.right - event.clientX)
      );
      setDetailsWidth(nextWidth);
    };

    const stopResize = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const handleResizeStart = useCallback((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = driverMatchesSearch(driver, search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "inactive"
          ? isDriverInactive(driver)
          : !isDriverInactive(driver));
      const matchesCategory =
        categoryFilter === "all" || driver.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [drivers, search, statusFilter, categoryFilter]);

  const selectedDriver =
    drivers.find((driver) => driver.id === selectedId) ?? drivers[0];
  const hasActiveSearch = Boolean(search.trim());
  const totalDrivers = hasActiveSearch
    ? filteredDrivers.length
    : driverCountData?.totalDrivers ?? null;
  const effectiveImageUrl =
    photoUrl ||
    selectedDriver?.image ||
    selectedDriver?.profilePic ||
    selectedDriver?.profilepic ||
    "";

  const isInitialLoading = (isLoading || isSearchLoading) && drivers.length === 0;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return undefined;

    const minimumRows = 6;
    const rowHeight = 68;

    const updateSkeletonRows = () => {
      const availableHeight = container.clientHeight || 0;
      const nextRows = Math.max(
        minimumRows,
        Math.ceil(availableHeight / rowHeight) + 1
      );
      setSkeletonRows(nextRows);
    };

    updateSkeletonRows();

    const resizeObserver = new ResizeObserver(updateSkeletonRows);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateSkeletonRows);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSkeletonRows);
    };
  }, []);
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

  useEffect(() => {
    if (!selectedDriver) return;

    let cancelled = false;

    async function syncMaintenanceFlag() {
      if (!selectedDriver) return;

      setLoadingMaintenanceChat(true);
      try {
        const value = await getShowMaintenanceChat(selectedDriver);
        if (cancelled) return;
        setShowMaintenanceChatState(value);
        setDrivers((prev) =>
          prev.map((driver) =>
            driver.id === selectedDriver.id
              ? { ...driver, maintenanceChat: value }
              : driver
          )
        );
      } catch (err) {
        console.error("Failed to load maintenance chat flag:", err);
      } finally {
        if (!cancelled) {
          setLoadingMaintenanceChat(false);
        }
      }
    }

    syncMaintenanceFlag();

    return () => {
      cancelled = true;
    };
  }, [selectedDriver?.id, selectedDriver?.phone]);

  async function toggleMaintenanceChat() {
    if (!canManageDrivers || !selectedDriver) return;

    const nextValue = !showMaintenanceChat;
    setShowMaintenanceChatState(nextValue);

    setDrivers((prev) =>
      prev.map((driver) =>
        driver.id === selectedDriver.id
          ? { ...driver, maintenanceChat: nextValue }
          : driver
      )
    );

    try {
      await setShowMaintenanceChat(selectedDriver, nextValue);
    } catch (error) {
      console.error("Failed to update maintenanceChat config:", error);
      setShowMaintenanceChatState(!nextValue);
      setDrivers((prev) =>
        prev.map((driver) =>
          driver.id === selectedDriver.id
            ? { ...driver, maintenanceChat: !nextValue }
            : driver
        )
      );
    }
  }

  // Helper function to get user ID from driver object
  function getUserId(driver) {
    if (!driver) return null;
    return (
      driver.userid ??
      driver.userId ??
      driver.contactId ??
      driver.contactid ??
      driver.uid ??
      driver.id ??
      null
    );
  }

  function getChatTargetFromDriver(driver) {
    if (!driver) return null;

    const userid = getUserId(driver);
    const phoneNumber = String(driver.id ?? driver.phone ?? "")
      .replace(/[^\d+]/g, "")
      .trim();

    return {
      userid,
      userId: userid,
      contactId: driver.contactId ?? driver.contactid ?? userid,
      name: driver.name ?? driver.driver_name ?? "",
      phone: phoneNumber || null,
      phoneNumber: phoneNumber || null,
      email: driver.email ?? null,
    };
  }


  async function handleQuickMessageSend() {
    if (!canManageDrivers || !selectedDriver || isQuickMessageSending) return;
    const text = quickMessage.trim();
    if (!text) return;

    const chatTarget = getChatTargetFromDriver(selectedDriver);
    if (!chatTarget?.userid) return;

    try {
      setIsQuickMessageSending(true);
      const response = await sendChatMessage(chatTarget, text);
      const sentAt = response?.message?.dateTime || new Date().toISOString();
      const selectedDriverId = selectedDriver.id || selectedDriver.phone;

      setDrivers((prev) =>
        prev.map((driver) =>
          (driver.id || driver.phone) === selectedDriverId
            ? {
                ...driver,
                last_message: text,
                last_chat_time: sentAt,
                lastSeen: new Date(sentAt),
                lastSeenLabel: "Just now",
              }
            : driver
        )
      );
      setCachedSearchDrivers(
        getCachedSearchDrivers().map((driver) =>
          (driver.id || driver.phone) === selectedDriverId
            ? {
                ...driver,
                last_message: text,
                last_chat_time: sentAt,
                lastSeen: new Date(sentAt),
                lastSeenLabel: "Just now",
              }
            : driver
        )
      );

      const userId = chatTarget.userid;
      if (userId) {
        dispatch(
          updateUserLastMessage({
            userid: userId,
            lastMessage: text,
            lastChatTime: sentAt,
          })
        );
      }

      setQuickMessage("");
    } catch (error) {
      console.error("Failed to send quick message to driver:", error);
    } finally {
      setIsQuickMessageSending(false);
    }
  }

  function openModal(type) {
    if (!canManageDrivers) return;
    setSubmitError("");
    setIsSubmitting(false);
    setShowDriverPassword(false);
    if (type === "add") {
      setFormState(initialFormState);
      setUploadingPhoto(false);
      setPhotoError("");
      setPhotoUrl("");
      setUploadedPhone("");
    }

    if (type === "edit" && selectedDriver) {
      setFormState({
        name: selectedDriver.name,
        email: selectedDriver.email,
        password: "",
        phone: selectedDriver.phone.replace(/\D/g, ""),
        category: selectedDriver.category,
        country: selectedDriver.country,
        image: null,
      });
      const existingImage =
        selectedDriver?.image ||
        selectedDriver?.profilePic ||
        selectedDriver?.profilepic ||
        "";
      setPhotoUrl(existingImage || "");
      setUploadedPhone(
        selectedDriver.phone ? selectedDriver.phone.replace(/\D/g, "") : ""
      );
      setUploadingPhoto(false);
      setPhotoError("");
    }

    if (type === "password") {
      setPasswordState({ password: "" });
      setPasswordSubmitError("");
    }

    setActiveModal(type);
  }

  function closeModal() {
    setActiveModal(null);
    setSubmitError("");
    setIsSubmitting(false);
    setUploadingPhoto(false);
    setPhotoError("");
    setPhotoUrl("");
    setUploadedPhone("");
    setPasswordSubmitError("");
    setShowDriverPassword(false);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setFormState((prev) => ({ ...prev, image: file }));

    if (!file) {
      return;
    }

    setPhotoError("");
    setPhotoUrl("");
    setUploadedPhone("");
    setUploadingPhoto(true);

    try {
      const url = await uploadDriverProfilePhoto({
        phone: formState.phone,
        file,
      });
      if (!url) {
        throw new Error("Profile image upload failed. Please try again.");
      }
      setPhotoUrl(url);
      setUploadedPhone(formState.phone.trim());
    } catch (error) {
      setPhotoError(error?.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePasswordChange(event) {
    setPasswordState({ password: event.target.value });
    setPasswordSubmitError("");
  }

  const requiredFields = useMemo(
    () =>
      activeModal === "edit"
        ? ["name", "email", "phone", "country", "category"]
        : ["name", "email", "phone", "password", "country", "category"],
    [activeModal]
  );
  const isFormIncomplete = requiredFields.some((field) => {
    const value = formState[field];
    return !String(value ?? "").trim();
  });

  const isSubmitDisabled =
    isSubmitting ||
    uploadingPhoto ||
    ((activeModal === "add" || activeModal === "edit") && isFormIncomplete);

  async function handleSubmit() {
    if (activeModal !== "add" && activeModal !== "edit") {
      // Only handle add/edit here; password is handled separately.
      return;
    }

    if (isSubmitDisabled) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const existingImage =
        selectedDriver?.image ||
        selectedDriver?.profilePic ||
        selectedDriver?.profilepic ||
        null;
      const imageUrl =
        activeModal === "add"
          ? photoUrl || null
          : photoUrl || existingImage || null;

      if (activeModal === "add") {
        await createDriver({
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          password: formState.password,
          country: formState.country,
          category: formState.category,
          image: imageUrl,
          profilePic: imageUrl,
          profilepic: imageUrl,
        });
      } else if (activeModal === "edit" && selectedDriver) {
        const userid = getUserId(selectedDriver);
        if (!userid) {
          throw new Error("Cannot update driver: missing user id.");
        }

        await updateDriver({
          userid,
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          password: formState.password.trim() || undefined,
          country: formState.country,
          category: formState.category,
          image: imageUrl,
        });
      }

      closeModal();
      setFormState(initialFormState);
      setCachedSearchDrivers([]);
      hasHydratedSearchCacheRef.current = false;
      setPage(1);
      await refetch();
    } catch (error) {
      setSubmitError(
        error?.message ||
          (activeModal === "edit"
            ? "Failed to update driver."
            : "Failed to create driver.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit() {
    if (!selectedDriver) {
      setPasswordSubmitError("No driver selected.");
      return;
    }

    const newPassword = String(passwordState.password || "").trim();
    if (!newPassword) {
      setPasswordSubmitError("Please enter a new password.");
      return;
    }

    const userid = getUserId(selectedDriver);
    if (!userid) {
      setPasswordSubmitError("Cannot update password: missing user id.");
      return;
    }

    setIsSubmitting(true);
    setPasswordSubmitError("");

    try {
      await updateDriver({
        userid,
        name: selectedDriver.name,
        email: selectedDriver.email,
        phone: selectedDriver.phone.replace(/\D/g, ""),
        country: selectedDriver.country,
        category: selectedDriver.category,
        password: newPassword,
        image: selectedDriver.image,
      });

      closeModal();
      setPasswordState({ password: "" });
      await refetch();
    } catch (error) {
      setPasswordSubmitError(error?.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActivation() {
    if (!canManageDrivers || !selectedDriver) return;

    const userid = getUserId(selectedDriver);
    if (!userid) {
      console.error("Cannot toggle activation: missing user id");
      return;
    }

    const isCurrentlyDeactivated = isDriverInactive(selectedDriver);
    const nextIsDeactivated = !isCurrentlyDeactivated;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await deactivateDriver({
        userId: userid,
        isDeactivated: nextIsDeactivated,
      });

      await refetch();
    } catch (error) {
      setSubmitError(
        error?.message || "Failed to update driver activation status."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDriver() {
    if (!canManageDrivers || !selectedDriver) return;

    const userid = getUserId(selectedDriver);
    if (!userid) {
      console.error("Cannot delete driver: missing userid");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this driver?"
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await deleteDriver(userid);

      const deletedIds = new Set([selectedDriver.id, userid].filter(Boolean));
      const removeDeletedDriver = (driver) => !deletedIds.has(driver?.id);

      setDrivers((prev) => prev.filter(removeDeletedDriver));
      setCachedSearchDrivers(getCachedSearchDrivers().filter(removeDeletedDriver));
      setSelectedId(null);

      setPage(1);
      await refetch();
    } catch (error) {
      setSubmitError(error?.message || "Failed to delete driver.");
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

  useEffect(() => {
    if (!uploadedPhone) return;
    if (!String(formState.phone ?? "").trim()) return;
    if (formState.phone.trim() === uploadedPhone) return;

    setPhotoUrl("");
    setUploadedPhone("");
    setPhotoError("Phone changed. Please re-upload photo.");
    setFormState((prev) => ({ ...prev, image: null }));
  }, [formState.phone, uploadedPhone]);

  return (
    <div className="flex h-full flex-col gap-2 px-2 py-2">
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

      <section
        ref={sectionRef}
        className="flex flex-1 min-h-0 flex-col items-stretch gap-2 xl:flex-row"
      >
        <div className="flex h-full min-h-0 flex-1 flex-col rounded-m border border-slate-800 bg-slate-950/60">
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
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {["all", "C", "D", "F"].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border font-medium uppercase transition ${
                    categoryFilter === category
                      ? "border-slate-500 bg-slate-800 text-slate-100"
                      : "border-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {category === "all" ? "All" : category}
                </button>
              ))}
              <Popover open={isStatusPopoverOpen} onOpenChange={setIsStatusPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      statusFilter === "all"
                        ? "border-slate-700 text-slate-300 hover:border-slate-500"
                        : statusFilter === "active"
                          ? "border-emerald-400/50 text-emerald-300"
                          : "border-rose-400/50 text-rose-300"
                    }`}
                    aria-label={`Status filter: ${statusFilter}`}
                    title={`Status: ${statusFilter}`}
                  >
                    <Circle
                      className={`h-4 w-4 ${
                        statusFilter === "all"
                          ? "fill-none"
                          : statusFilter === "active"
                            ? "fill-emerald-400"
                            : "fill-rose-400"
                      }`}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  className="w-40 border border-slate-700 bg-slate-950 p-1 text-slate-100"
                >
                  {["all", "active", "inactive"].map((status) => {
                    const isActive = statusFilter === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(status);
                          setIsStatusPopoverOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-800 ${
                          isActive ? "bg-slate-800" : ""
                        }`}
                      >
                        <span>
                          {status === "all"
                            ? "All status"
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        {isActive && (
                          <span
                            className={`h-2 w-2 rounded-full ${
                              status === "all"
                                ? "bg-slate-400"
                                : status === "active"
                                  ? "bg-emerald-400"
                                  : "bg-rose-400"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="drivers-scroll flex-1 overflow-y-auto"
          >
            {isInitialLoading && (
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: skeletonRows }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="grid w-full grid-cols-12 items-center gap-2 rounded-xl border border-slate-900 px-3 py-3"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <span className="h-10 w-10 animate-pulse rounded-full bg-slate-900/70" />
                      <span className="space-y-2">
                        <span className="block h-3 w-28 animate-pulse rounded-full bg-slate-900/70" />
                        <span className="block h-2.5 w-20 animate-pulse rounded-full bg-slate-900/60" />
                      </span>
                    </div>
                    <span className="col-span-3 h-3 w-28 animate-pulse rounded-full bg-slate-900/70" />
                    <span className="col-span-2 h-3 w-20 animate-pulse rounded-full bg-slate-900/70" />
                    <span className="col-span-1 h-6 w-16 animate-pulse rounded-full bg-slate-900/70" />
                    <span className="col-span-1 h-6 w-12 animate-pulse rounded-full bg-slate-900/70" />
                    <span className="col-span-1 ml-auto h-3 w-16 animate-pulse rounded-full bg-slate-900/70" />
                  </div>
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
            {searchError && !isInitialLoading && !isError && (
              <div className="px-4 py-3 text-xs text-amber-300">{searchError}</div>
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
                    className={`grid w-full grid-cols-12 items-center gap-2 border-b border-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-900/70 ${
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
                    <span className="col-span-1 text-slate-400">
                      {driver.country || "—"}
                    </span>
                    <span className="col-span-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          statusStyles[isDriverInactive(driver) ? "inactive" : "active"] ||
                          "border-slate-700 text-slate-400"
                        }`}
                      >
                        {isDriverInactive(driver) ? "Inactive" : "Active"}
                      </span>
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
                    <span className="col-span-1 text-right text-xs text-slate-400">
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
            <span className="flex items-center gap-2">
              Total drivers:{" "}
              {isDriverCountLoading && totalDrivers === null ? (
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400"
                  aria-label="Loading total drivers"
                  role="status"
                />
              ) : (
                totalDrivers ?? "-"
              )}
            </span>
            <button
              type="button"
              onClick={() => openModal("add")}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500"
            >
              + Add Driver
            </button>
          </div>
        </div>

        {!isInitialLoading && (
          <aside
            className="relative flex w-full max-w-full flex-none flex-col gap-4 self-start overflow-auto rounded-m border border-slate-800 bg-slate-950/60 p-7 xl:min-w-[320px]"
            style={{ width: detailsWidth, maxWidth: "100%" }}
          >
            <div
              className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
              role="separator"
              aria-orientation="vertical"
              onMouseDown={handleResizeStart}
            />
            <div className="flex flex-1 flex-col gap-4">
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
                  {loadingMaintenanceChat ? (
                    <div className="flex items-center justify-center h-6 w-10">
                      <div className="maintenance-spinner" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleMaintenanceChat}
                      disabled={loadingMaintenanceChat || !canManageDrivers}
                      className={`relative h-7 w-12 rounded-full transition ${
                        showMaintenanceChat ? "bg-emerald-500/40" : "bg-slate-700"
                      }`}
                      aria-pressed={showMaintenanceChat}
                    >
                      <span
                        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition ${
                          showMaintenanceChat ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick message to driver */}
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold text-slate-100 mb-2">
                  Message driver
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Send a quick message to this driver. It will appear in the general chat thread.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="Type message to send to driver..."
                    disabled={isQuickMessageSending}
                    className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleQuickMessageSend}
                    disabled={!quickMessage.trim() || !selectedDriver || isQuickMessageSending || !canManageDrivers}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      !quickMessage.trim() || !selectedDriver || isQuickMessageSending || !canManageDrivers
                        ? "cursor-not-allowed border border-slate-800 text-slate-500 bg-slate-900"
                        : "border border-sky-500/60 bg-sky-500/10 text-sky-100 hover:border-sky-400 hover:bg-sky-500/20"
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {isQuickMessageSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {/* <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
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
                </div> */}

                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openModal("edit")}
                      disabled={!canManageDrivers}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit driver
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal("password");
                      }}
                      disabled={!canManageDrivers}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      Change password
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleToggleActivation}
                      disabled={isSubmitting || !canManageDrivers}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                        selectedDriver?.status === "inactive" || selectedDriver?.isDeactivated
                          ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400"
                          : "border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:border-rose-400"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <Ban className="h-4 w-4" />
                      {selectedDriver?.status === "inactive" || selectedDriver?.isDeactivated
                        ? "Activate Driver"
                        : "Deactivate Driver"}
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteDriver}
                      disabled={isSubmitting || !canManageDrivers}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-red-600/70 bg-red-600/10 px-4 py-2 text-sm text-red-200 transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Driver
                    </button>
                  </div>
                </div>
              </div>
            </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                  Select a driver to view details.
                </div>
              )}
            </div>
          </aside>
        )}
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
                    onClick={handlePasswordSubmit}
                    disabled={isSubmitting || !passwordState.password.trim()}
                    className={`rounded-full border px-10 py-2 text-sm font-semibold transition ${
                      isSubmitting || !passwordState.password.trim()
                        ? "cursor-not-allowed border-slate-800 text-slate-500"
                        : "border-sky-500/60 bg-sky-500/10 text-sky-100 hover:border-sky-400 hover:bg-sky-500/20"
                    }`}
                  >
                    {isSubmitting ? "Updating..." : "Change Password"}
                  </button>
                </div>
                {passwordSubmitError && (
                  <p className="text-center text-sm text-rose-300">{passwordSubmitError}</p>
                )}
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
                      className="mt-2 w-full rounded-none border-x-0 border-t-0 border-b border-slate-700 bg-slate-900/80 pb-2 text-base text-slate-100 transition focus:border-sky-500 placeholder:text-slate-500 autofill:[-webkit-text-fill-color:theme(colors.slate.100)] autofill:[box-shadow:inset_0_0_0px_1000px_theme(colors.slate.900)]"
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
                      <div className="relative mt-2">
                        <Input
                          key={showDriverPassword ? "driver-password-visible" : "driver-password-hidden"}
                          type={showDriverPassword ? "text" : "password"}
                          name="password"
                          value={formState.password}
                          onChange={handleFormChange}
                          autoComplete="new-password"
                          placeholder="Enter password"
                          className="w-full rounded-none border-x-0 border-t-0 border-b border-slate-700 bg-slate-900/80 pb-2 pr-10 text-base text-slate-100 transition focus:border-sky-500 placeholder:text-slate-500 autofill:[-webkit-text-fill-color:theme(colors.slate.100)] autofill:[box-shadow:inset_0_0_0px_1000px_theme(colors.slate.900)]"
                        />
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setShowDriverPassword((prev) => !prev)}
                          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded bg-slate-900/90 p-1 text-slate-300 transition hover:text-slate-100"
                          aria-label={showDriverPassword ? "Hide password" : "Show password"}
                        >
                          {showDriverPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-900">
                    {effectiveImageUrl ? (
                      <img
                        src={effectiveImageUrl}
                        className="h-10 w-10 rounded-full object-cover"
                        alt="Driver"
                      />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2">
                    <span className="text-sm text-slate-400">
                      {formState.image
                        ? formState.image.name
                        : "No image selected"}
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
                <div className="space-y-1">
                  {uploadingPhoto && (
                    <p className="text-xs text-slate-400">Uploading...</p>
                  )}
                  {photoError && (
                    <p className="text-xs text-rose-300">{photoError}</p>
                  )}
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
