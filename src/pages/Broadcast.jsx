import { useState, useEffect } from "react";
import { Send, Megaphone, ChevronDown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sendBroadcast, fetchBroadcastHistory } from "../services/broadcastAPI";
import Loader from "../components/Loader";
import { toast } from "sonner";
import { useAppSelector } from "../store/hooks";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";

export default function Broadcast() {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState("all");
  const [selectedAdmins, setSelectedAdmins] = useState("all");
  const [showDriverList, setShowDriverList] = useState(false);
  const [showAdminList, setShowAdminList] = useState(false);
  const [selectAllDrivers, setSelectAllDrivers] = useState(true);
  const [selectAllAdmins, setSelectAllAdmins] = useState(true);
  const [driverSelections, setDriverSelections] = useState({});
  const [adminSelections, setAdminSelections] = useState({});

  // Get users and maintenance users from Redux
  const { users: drivers } = useAppSelector((state) => state.users);
  const maintenanceUsers = useAppSelector((state) => state?.maintenanceUsers?.users || []);

  const recipientOptions = [
    { value: "all", label: "All Users" },
    { value: "drivers", label: "Drivers" },
    { value: "admins", label: "Admins" },
  ];

  useEffect(() => {
    loadBroadcastHistory();
  }, []);

  // Initialize selections when drivers/admins load
  useEffect(() => {
    if (drivers && drivers.length > 0) {
      const initialSelections = {};
      drivers.forEach((driver) => {
        const driverId = driver?.userid ?? driver?.id;
        initialSelections[driverId] = true;
      });
      setDriverSelections(initialSelections);
    }
  }, [drivers]);

  useEffect(() => {
    if (maintenanceUsers && maintenanceUsers.length > 0) {
      const initialSelections = {};
      maintenanceUsers.forEach((admin) => {
        const adminId = admin?.userid ?? admin?.id;
        initialSelections[adminId] = true;
      });
      setAdminSelections(initialSelections);
    }
  }, [maintenanceUsers]);

  const loadBroadcastHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchBroadcastHistory();
      setBroadcastHistory(data || []);
    } catch (error) {
      console.error("Error loading broadcast history:", error);
      toast.error("Failed to load broadcast history");
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelection = (driverId) => {
    setDriverSelections((prev) => ({
      ...prev,
      [driverId]: !prev[driverId],
    }));
  };

  const handleAdminSelection = (adminId) => {
    setAdminSelections((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  const toggleAllDrivers = () => {
    const newState = !selectAllDrivers;
    setSelectAllDrivers(newState);
    const selections = {};
    drivers.forEach((driver) => {
      const driverId = driver?.userid ?? driver?.id;
      selections[driverId] = newState;
    });
    setDriverSelections(selections);
  };

  const toggleAllAdmins = () => {
    const newState = !selectAllAdmins;
    setSelectAllAdmins(newState);
    const selections = {};
    maintenanceUsers.forEach((admin) => {
      const adminId = admin?.userid ?? admin?.id;
      selections[adminId] = newState;
    });
    setAdminSelections(selections);
  };

  const getSelectedDriverIds = () => {
    return Object.entries(driverSelections)
      .filter(([_, isSelected]) => isSelected)
      .map(([driverId, _]) => driverId);
  };

  const getSelectedAdminIds = () => {
    return Object.entries(adminSelections)
      .filter(([_, isSelected]) => isSelected)
      .map(([adminId, _]) => adminId);
  };

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (recipients === "drivers" && getSelectedDriverIds().length === 0) {
      toast.error("Please select at least one driver");
      return;
    }

    if (recipients === "admins" && getSelectedAdminIds().length === 0) {
      toast.error("Please select at least one admin");
      return;
    }

    setBroadcasting(true);
    try {
      await sendBroadcast(
        recipients,
        message.trim(),
        drivers || [],
        maintenanceUsers || [],
        getSelectedDriverIds(),
        getSelectedAdminIds()
      );

      toast.success("Broadcast sent successfully!");
      setMessage("");
      
      // Reload history
      await loadBroadcastHistory();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  const selectedDriverCount = getSelectedDriverIds().length;
  const selectedAdminCount = getSelectedAdminIds().length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ArrowLeft className="h-8 w-8 text-white cursor-pointer hover:text-blue-300 transition" onClick={() => navigate(-1)} title="Go back" />
            <Megaphone className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Broadcast Messages</h1>
          </div>
          <p className="text-slate-400">Send messages to drivers, admins, or all users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Broadcast Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Send Broadcast</h2>

              {/* Recipients Select */}
              <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Recipients
                </label>
                <select
                  value={recipients}
                  onChange={(e) => {
                    setRecipients(e.target.value);
                    setShowDriverList(false);
                    setShowAdminList(false);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition"
                >
                  {recipientOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drivers Selection */}
              {recipients === "drivers" && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Select Drivers
                    </label>
                    <span className="text-xs text-slate-400">
                      {selectedDriverCount}/{drivers?.length || 0} selected
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDriverList(!showDriverList)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition flex items-center justify-between"
                  >
                    <span>
                      {selectedDriverCount === drivers?.length
                        ? "All Drivers"
                        : `${selectedDriverCount} Driver${selectedDriverCount !== 1 ? "s" : ""} Selected`}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition ${showDriverList ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showDriverList && (
                    <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
                        <Checkbox
                          checked={selectAllDrivers}
                          onCheckedChange={toggleAllDrivers}
                          className="rounded"
                        />
                        <label className="text-sm font-medium text-slate-300 cursor-pointer flex-1">
                          Select All
                        </label>
                      </div>
                      <div className="space-y-2">
                        {drivers?.map((driver) => {
                          const driverId = driver?.userid ?? driver?.id;
                          return (
                            <div key={driverId} className="flex items-center gap-2">
                              <Checkbox
                                checked={driverSelections[driverId] || false}
                                onCheckedChange={() => handleDriverSelection(driverId)}
                                className="rounded"
                              />
                              <label className="text-sm text-slate-300 cursor-pointer flex-1">
                                {driver?.name || driver?.driver_name || "Unknown"}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admins Selection */}
              {recipients === "admins" && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Select Admins
                    </label>
                    <span className="text-xs text-slate-400">
                      {selectedAdminCount}/{maintenanceUsers?.length || 0} selected
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAdminList(!showAdminList)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition flex items-center justify-between"
                  >
                    <span>
                      {selectedAdminCount === maintenanceUsers?.length
                        ? "All Admins"
                        : `${selectedAdminCount} Admin${selectedAdminCount !== 1 ? "s" : ""} Selected`}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition ${showAdminList ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showAdminList && (
                    <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
                        <Checkbox
                          checked={selectAllAdmins}
                          onCheckedChange={toggleAllAdmins}
                          className="rounded"
                        />
                        <label className="text-sm font-medium text-slate-300 cursor-pointer flex-1">
                          Select All
                        </label>
                      </div>
                      <div className="space-y-2">
                        {maintenanceUsers?.map((admin) => {
                          const adminId = admin?.userid ?? admin?.id;
                          return (
                            <div key={adminId} className="flex items-center gap-2">
                              <Checkbox
                                checked={adminSelections[adminId] || false}
                                onCheckedChange={() => handleAdminSelection(adminId)}
                                className="rounded"
                              />
                              <label className="text-sm text-slate-300 cursor-pointer flex-1">
                                {admin?.name || admin?.username || "Unknown"}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message Textarea */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your broadcast message"
                  rows={6}
                  disabled={broadcasting}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50 break-words whitespace-pre-wrap overflow-hidden"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {message.length} characters
                </p>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendBroadcast}
                disabled={broadcasting || !message.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {broadcasting ? (
                  <>
                    <Loader />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Broadcast
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Broadcast History Panel */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Broadcast History</h2>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader />
                </div>
              ) : broadcastHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone className="h-12 w-12 text-slate-700 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-400">No broadcasts sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 broadcast-history-scroll">
                  {broadcastHistory.map((broadcast, index) => (
                    <div
                      key={index}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-750 hover:border-blue-600 hover:shadow-lg transition duration-200 cursor-pointer transform hover:scale-[1.02]"
                    >
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="font-semibold text-white">
                            {getRecipientLabel(broadcast.recipientType)}
                          </p>
                          <span className="inline-block px-2 py-1 bg-blue-900 bg-opacity-50 text-blue-300 text-xs rounded max-w-xs truncate" title={broadcast.sendername || "Unknown Admin"}>
                            {broadcast.sendername ? `Sent by: ${broadcast.sendername}` : "Sent by: Unknown Admin"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          {formatDate(broadcast.timestamp)}
                        </p>
                        
                        {/* Recipients Names */}
                        {broadcast.recipientNames && broadcast.recipientNames.length > 0 && (
                          <div className="mb-2 p-2 bg-slate-700 rounded border border-slate-600">
                            <p className="text-xs font-medium text-slate-300 mb-1">Recipients:</p>
                            <div className="flex flex-wrap gap-1">
                              {broadcast.recipientNames.map((name, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-1 bg-slate-600 text-slate-100 text-xs rounded"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm break-words whitespace-pre-wrap overflow-hidden">
                        {broadcast.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRecipientLabel(recipients) {
  const labels = {
    all: "All Users",
    drivers: "Drivers Only",
    admins: "Admins Only",
  };
  return labels[recipients] || recipients;
}

function formatDate(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}
