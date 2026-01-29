import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Copy, Flag, X, Check, MessageCircle, Send, RotateCcw, CheckCircle2, Circle, Trash2, FileText, Pencil, Plus } from "lucide-react";
import { fetchDocumentByIdRoute } from "../utils/apiRoutes";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateDocument, deleteDocumentThunk, changeDocumentType } from "../store/slices/documentsSlice";
import { Select, SelectTrigger, SelectContent, SelectItem } from "./ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import {
  fetchAcknowledgements,
  createAcknowledgement,
  updateAcknowledgement,
  deleteAcknowledgement,
  sendAcknowledgement,
} from "../services/acknowledgementAPI";

// Document type mapping (same as in Document.jsx)
const FILTER_MAP = {
  "Pickup Doc": "pick_up",
  "Delivery Proof": "delivery",
  "Load Image": "load_image",
  "Fuel Receipt": "fuel_recipt",
  "Stamp Paper": "paper_logs",
  "Driver Expense": "driver_expense_sheet",
  "DM Transport Trip Envelope": "dm_transport_trip_envelope",
  "DM Trans Inc Trip Envelope": "dm_trans_inc_trip_envelope",
  "DM Transport City Worksheet": "dm_transport_city_worksheet_trip_envelope",
  "Repair and Maintenance": "trip_envelope",
  "CTPAT": "CTPAT",
};

export default function DocumentPreviewContent({ selectedDoc, onDocUpdate }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { users } = useAppSelector((state) => state.users);
  const [fullDoc, setFullDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedValue, setCopiedValue] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [showAcknowledgementDropdown, setShowAcknowledgementDropdown] = useState(false);
  const [showAddAcknowledgementModal, setShowAddAcknowledgementModal] = useState(false);
  const [editingAcknowledgement, setEditingAcknowledgement] = useState(null);
  const [acknowledgementText, setAcknowledgementText] = useState("");
  const [isLoadingAcknowledgements, setIsLoadingAcknowledgements] = useState(false);
  const [isSendingAcknowledgement, setIsSendingAcknowledgement] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  useEffect(() => {
    if (!selectedDoc?.id) return;

    const fetchFullDocument = async () => {
      setLoading(true);
      setError(null);
      setIsPdfLoading(true); // Reset PDF loading state
      try {
        const token = localStorage.getItem("adminToken");
        const url = fetchDocumentByIdRoute(selectedDoc.id, selectedDoc.type);
        
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch document details");
        }

        setFullDoc(data.document || selectedDoc);
      } catch (err) {
        setError(err.message);
        // Fallback to selectedDoc if API fails
        setFullDoc(selectedDoc);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDocument();
  }, [selectedDoc]);

  // Fetch acknowledgements when dropdown opens
  useEffect(() => {
    if (showAcknowledgementDropdown && acknowledgements.length === 0) {
      loadAcknowledgements();
    }
  }, [showAcknowledgementDropdown]);

  // Reset PDF loading state when document URL changes
  useEffect(() => {
    const doc = fullDoc || selectedDoc;
    if (doc?.document_url) {
      setIsPdfLoading(true);
    }
  }, [fullDoc?.document_url, selectedDoc?.document_url]);

  const loadAcknowledgements = async () => {
    setIsLoadingAcknowledgements(true);
    try {
      const data = await fetchAcknowledgements();
      setAcknowledgements(data);
    } catch (error) {
      console.error("Failed to load acknowledgements:", error);
      toast.error("Failed to load acknowledgement templates");
    } finally {
      setIsLoadingAcknowledgements(false);
    }
  };

  if (!selectedDoc) return null;

  const doc = fullDoc || selectedDoc;
  const url = doc.document_url;
  const cleanURL = url?.split("?")[0];
  const ext = cleanURL?.split(".").pop()?.toLowerCase();

  const isPDF = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading document details...</p>
        </div>
      </div>
    );
  }

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(""), 1500);
      toast.success("Copied to clipboard");
    } catch (copyError) {
      console.error("Failed to copy value", copyError);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleFlagDocument = async () => {
    if (!flagReason.trim()) {
      toast.error("Please enter a reason for flagging this document");
      return;
    }

    const doc = fullDoc || selectedDoc;
    const flagData = {
      flagged: true,
      reason: flagReason.trim(),
    };

    try {
      const result = await dispatch(updateDocument({ 
        document: doc, 
        flag: flagData 
      }));
      
      if (updateDocument.fulfilled.match(result)) {
        // Update local state
        const updatedDoc = { ...doc, flag: flagData };
        setFullDoc(updatedDoc);
        if (onDocUpdate) {
          onDocUpdate(updatedDoc);
        }
        setShowFlagModal(false);
        setFlagReason("");
        toast.success("Document flagged successfully");
      } else {
        toast.error(result.payload || "Failed to flag document");
      }
    } catch (error) {
      console.error("Failed to flag document:", error);
      toast.error("Failed to flag document. Please try again.");
    }
  };

  const handleUnflagDocument = async () => {
    const doc = fullDoc || selectedDoc;
    const flagData = {
      flagged: false,
      reason: "",
    };

    try {
      const result = await dispatch(updateDocument({ 
        document: doc, 
        flag: flagData 
      }));
      
      if (updateDocument.fulfilled.match(result)) {
        // Update local state
        const updatedDoc = { ...doc, flag: flagData };
        setFullDoc(updatedDoc);
        if (onDocUpdate) {
          onDocUpdate(updatedDoc);
        }
        toast.success("Document unflagged successfully");
      } else {
        toast.error(result.payload || "Failed to unflag document");
      }
    } catch (error) {
      console.error("Failed to unflag document:", error);
      toast.error("Failed to unflag document. Please try again.");
    }
  };

  const handleToggleSeenStatus = async () => {
    const doc = fullDoc || selectedDoc;
    // Toggle seen status
    const newSeenStatus = doc.seen === true ? false : true;
    
    try {
      const result = await dispatch(updateDocument({ 
        document: doc, 
        seen: newSeenStatus 
      }));
      
      if (updateDocument.fulfilled.match(result)) {
        // Update local state
        const updatedDoc = { ...doc, seen: newSeenStatus };
        setFullDoc(updatedDoc);
        if (onDocUpdate) {
          onDocUpdate(updatedDoc);
        }
        toast.success(newSeenStatus ? "Document marked as seen" : "Document marked as unseen");
      } else {
        toast.error(result.payload || "Failed to update seen status");
      }
    } catch (error) {
      console.error("Failed to update seen status:", error);
      toast.error("Failed to update seen status. Please try again.");
    }
  };

  // Helper function to get user ID from various possible fields
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

  // Find driver by email or name from users list
  function findDriverByEmailOrName(email, name) {
    if (!users?.length) return null;
    
    // First try to find by email
    if (email) {
      const userByEmail = users.find((u) => 
        u.email?.toLowerCase() === email.toLowerCase() ||
        u.driver_email?.toLowerCase() === email.toLowerCase()
      );
      if (userByEmail) {
        return userByEmail;
      }
    }
    
    // Then try to find by name
    if (name) {
      const userByName = users.find((u) => 
        u.name?.toLowerCase() === name.toLowerCase() ||
        u.driver_name?.toLowerCase() === name.toLowerCase()
      );
      if (userByName) {
        return userByName;
      }
    }
    
    return null;
  }

  // Navigate to chat page with driver's user ID
  const handleChatWithDriver = () => {
    const doc = fullDoc || selectedDoc;
    if (!doc) return;
    
    // First check if document has a direct userid or driver_id field
    let userId = doc.userid || doc.userId || doc.driver_id || doc.driverId || null;
    
    // If not found, try to find by email or name from users list
    if (!userId) {
      const driverMatch = findDriverByEmailOrName(doc.driver_email, doc.driver_name);
      userId = getUserId(driverMatch);
    }
    
    if (!userId) {
      console.error("Cannot navigate to chat: Driver user ID not found");
      toast.error("Driver information not found. Cannot open chat.");
      return;
    }
    
    navigate(`/chat?userid=${userId}`);
    toast.success("Opening chat with driver");
  };

  // Toggle mark for resend status
  const handleToggleMarkForResend = async () => {
    const doc = fullDoc || selectedDoc;
    if (!doc) return;
    
    // Toggle between "markedForResend" and "sent"
    const newState = doc.state === "markedForResend" ? "sent" : "markedForResend";
    
    try {
      const result = await dispatch(updateDocument({ 
        document: doc, 
        state: newState 
      }));
      
      if (updateDocument.fulfilled.match(result)) {
        // Update local state
        const updatedDoc = { ...doc, state: newState };
        setFullDoc(updatedDoc);
        if (onDocUpdate) {
          onDocUpdate(updatedDoc);
        }
        toast.success(newState === "markedForResend" ? "Document marked for resend" : "Mark for resend undone");
      } else {
        toast.error(result.payload || "Failed to update mark for resend status");
      }
    } catch (error) {
      console.error("Failed to update mark for resend status:", error);
      toast.error("Failed to update mark for resend status. Please try again.");
    }
  };

  const handleToggleFlagStatus = () => {
    if (doc.flag?.flagged) {
      handleUnflagDocument();
      return;
    }
    setShowFlagModal(true);
  };

  // Toggle completed status
  const handleToggleCompleted = async () => {
    const doc = fullDoc || selectedDoc;
    if (!doc) return;
    
    // Toggle between true and false
    const newCompletedStatus = doc.completed === true ? false : true;
    
    try {
      const result = await dispatch(updateDocument({ 
        document: doc, 
        completed: newCompletedStatus 
      }));
      
      if (updateDocument.fulfilled.match(result)) {
        // Update local state
        const updatedDoc = { ...doc, completed: newCompletedStatus };
        setFullDoc(updatedDoc);
        if (onDocUpdate) {
          onDocUpdate(updatedDoc);
        }
        toast.success(newCompletedStatus ? "Document marked as done" : "Mark as done undone");
      } else {
        toast.error(result.payload || "Failed to update completed status");
      }
    } catch (error) {
      console.error("Failed to update completed status:", error);
      toast.error("Failed to update completed status. Please try again.");
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async () => {
    const doc = fullDoc || selectedDoc;
    if (!doc) return;

    setIsDeleting(true);
    try {
      const result = await dispatch(deleteDocumentThunk({ document: doc }));
      
      if (deleteDocumentThunk.fulfilled.match(result)) {
        // Close the modal and clear selection
        setShowDeleteModal(false);
        if (onDocUpdate) {
          // Pass null to indicate document was deleted
          onDocUpdate(null);
        }
        toast.success("Document deleted successfully");
      } else {
        toast.error(result.payload || "Failed to delete document");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle document type change
  const handleChangeDocumentType = async (newType) => {
    const doc = fullDoc || selectedDoc;
    if (!doc || !doc.id || !doc.type) return;

    if (doc.type === newType) {
      return; // No change needed
    }

    setIsChangingType(true);
    try {
      const result = await dispatch(
        changeDocumentType({
          documentId: doc.id,
          oldType: doc.type,
          newType: newType,
        })
      );

      if (changeDocumentType.fulfilled.match(result)) {
        // Update local state with new type and URL
        const updatedDoc = {
          ...doc,
          type: newType,
          document_url: result.payload.documentUrl || doc.document_url,
        };
        setFullDoc(updatedDoc);
        if (onDocUpdate) {
          onDocUpdate(updatedDoc);
        }
        const newTypeLabel = Object.keys(FILTER_MAP).find(
          (key) => FILTER_MAP[key] === newType
        ) || newType;
        toast.success(`Document type changed to ${newTypeLabel}`);
      } else {
        toast.error(result.payload || "Failed to change document type");
      }
    } catch (error) {
      console.error("Failed to change document type:", error);
      toast.error("Failed to change document type. Please try again.");
    } finally {
      setIsChangingType(false);
    }
  };

  // Get current document type label
  const getCurrentTypeLabel = () => {
    const doc = fullDoc || selectedDoc;
    if (!doc || !doc.type) return "Select Type";
    const label = Object.keys(FILTER_MAP).find(
      (key) => FILTER_MAP[key] === doc.type
    );
    return label || doc.type;
  };

  // Handle send acknowledgement
  const handleSendAcknowledgement = async (acknowledgementText) => {
    const doc = fullDoc || selectedDoc;
    if (!doc) return;

    setIsSendingAcknowledgement(true);
    try {
      await sendAcknowledgement(doc, acknowledgementText);
      
      // Update local state
      const updatedDoc = { ...doc, acknowledgement: acknowledgementText };
      setFullDoc(updatedDoc);
      if (onDocUpdate) {
        onDocUpdate(updatedDoc);
      }
      
      setShowAcknowledgementDropdown(false);
      toast.success("Acknowledgement sent successfully");
    } catch (error) {
      console.error("Failed to send acknowledgement:", error);
      toast.error(error.message || "Failed to send acknowledgement");
    } finally {
      setIsSendingAcknowledgement(false);
    }
  };

  // Handle create acknowledgement template
  const handleCreateAcknowledgement = async () => {
    if (!acknowledgementText.trim()) {
      toast.error("Please enter acknowledgement text");
      return;
    }

    try {
      await createAcknowledgement(acknowledgementText.trim());
      await loadAcknowledgements(); // Reload list
      setShowAddAcknowledgementModal(false);
      setAcknowledgementText("");
      toast.success("Acknowledgement template created");
    } catch (error) {
      console.error("Failed to create acknowledgement:", error);
      toast.error(error.message || "Failed to create acknowledgement template");
    }
  };

  // Handle update acknowledgement template
  const handleUpdateAcknowledgement = async () => {
    if (!acknowledgementText.trim() || !editingAcknowledgement) {
      toast.error("Please enter acknowledgement text");
      return;
    }

    try {
      await updateAcknowledgement(editingAcknowledgement.id, acknowledgementText.trim());
      await loadAcknowledgements(); // Reload list
      setShowAddAcknowledgementModal(false);
      setEditingAcknowledgement(null);
      setAcknowledgementText("");
      toast.success("Acknowledgement template updated");
    } catch (error) {
      console.error("Failed to update acknowledgement:", error);
      toast.error(error.message || "Failed to update acknowledgement template");
    }
  };

  // Handle delete acknowledgement template
  const handleDeleteAcknowledgement = async (id) => {
    if (!window.confirm("Are you sure you want to delete this acknowledgement template?")) {
      return;
    }

    try {
      await deleteAcknowledgement(id);
      await loadAcknowledgements(); // Reload list
      toast.success("Acknowledgement template deleted");
    } catch (error) {
      console.error("Failed to delete acknowledgement:", error);
      toast.error(error.message || "Failed to delete acknowledgement template");
    }
  };

  // Open edit modal
  const handleEditAcknowledgement = (ack) => {
    setEditingAcknowledgement(ack);
    setAcknowledgementText(ack.data);
    setShowAddAcknowledgementModal(true);
  };

  // Open add modal
  const handleAddAcknowledgement = () => {
    setEditingAcknowledgement(null);
    setAcknowledgementText("");
    setShowAddAcknowledgementModal(true);
  };

  const renderCopyButton = (value, label) => (
    <button
      type="button"
      onClick={() => handleCopy(value)}
      className="text-gray-500 hover:text-gray-200 transition-colors"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );

  const matchedDriver = findDriverByEmailOrName(doc.driver_email, doc.driver_name);
  const driverName = doc.driver_name || matchedDriver?.name || matchedDriver?.driver_name || "Unknown";
  const driverEmail = doc.driver_email || matchedDriver?.email || matchedDriver?.driver_email;
  const driverPhone = doc.driver_phone || doc.driver_mobile || doc.phone || matchedDriver?.phone;
  const driverImage =
    doc.driver_image ||
    matchedDriver?.profilePic ||
    matchedDriver?.profilepic ||
    matchedDriver?.image ||
    "/default-user.png";

  return (
    <div className="space-y-6 text-white">
      {error && (
        <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-sm">
          {error}
        </div>
      )}

      {/* Preview Area */}
      <div className="w-full rounded-lg overflow-hidden bg-black/20 border border-gray-700 min-h-[500px] flex items-center justify-center relative">
        {isImage && (
          <img
            src={url}
            alt="Document Preview"
            className="max-h-full max-w-full object-contain"
            onLoad={() => setIsPdfLoading(false)}
            onError={() => setIsPdfLoading(false)}
          />
        )}

        {isPDF && (
          <>
            {isPdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-400">Loading PDF...</p>
                </div>
              </div>
            )}
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                url
              )}&embedded=true`}
              className="w-full h-[600px] rounded"
              title="PDF Preview"
              onLoad={() => setIsPdfLoading(false)}
              onError={() => setIsPdfLoading(false)}
            />
          </>
        )}

        {!isImage && !isPDF && (
          <div className="text-center p-8 space-y-4">
            <p className="text-sm text-gray-400">
              Unable to preview this file type.
            </p>
            <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open File
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Document Information */}
      <div className="space-y-4 p-4 rounded-lg border border-gray-700 bg-[#161b22]">
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Uploaded By
          </span>
          <div className="flex items-start gap-3">
            <img
              src={driverImage}
              alt={driverName || "Driver profile"}
              className="h-11 w-11 rounded-full object-cover border border-gray-700 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = "/default-user.png";
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold leading-none text-white truncate">
                  {driverName}
                </p>
                {renderCopyButton(driverName, "driver name")}
              </div>
              {driverEmail && (
                <div className="flex items-center gap-2">
                  <p className="text-xs leading-none text-gray-300 truncate">
                    {driverEmail}
                  </p>
                  {renderCopyButton(driverEmail, "driver email")}
                </div>
              )}
              {driverPhone && (
                <div className="flex items-center gap-2">
                  <p className="text-xs leading-none text-gray-300 truncate">
                    {driverPhone}
                  </p>
                  {renderCopyButton(driverPhone, "driver phone")}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Chat
          </span>
          <button
            type="button"
            onClick={handleChatWithDriver}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#1f6feb]/40 bg-[#1f6feb]/10 px-3 py-2 text-sm font-medium text-[#1f6feb] transition-colors hover:border-[#1f6feb]/70 hover:bg-[#1f6feb]/20 hover:text-[#1a5fd4]"
          >
            <MessageCircle className="h-4 w-4" />
            Chat with Driver
          </button>
        </div>

        {/* Flag Modal */}
        {showFlagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-700 bg-[#161b22] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Flag Document</h3>
                <button
                  onClick={() => {
                    setShowFlagModal(false);
                    setFlagReason("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Reason for Flagging <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Enter reason for flagging this document..."
                  className="w-full min-h-[100px] px-3 py-2 bg-[#1d232a] border border-gray-700 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-[#1f6feb] resize-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  onClick={() => {
                    setShowFlagModal(false);
                    setFlagReason("");
                  }}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-[#1d232a]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFlagDocument}
                  size="sm"
                  disabled={!flagReason.trim()}
                  className="bg-[#1f6feb] hover:bg-[#1a5fd4] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Flag Document
                </Button>
              </div>
            </div>
          </div>
        )}

        {doc.note && (
          <div className="pt-4 border-t border-gray-700">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
              Note
            </span>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300">{doc.note}</p>
              {renderCopyButton(doc.note, "note")}
            </div>
          </div>
        )}

        {doc.acknowledgement && (
          <div className="pt-4 border-t border-gray-700">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
              Acknowledgement
            </span>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300">{doc.acknowledgement}</p>
              {renderCopyButton(doc.acknowledgement, "acknowledgement")}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-700">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Type
          </span>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Select
                value={doc.type || ""}
                onValueChange={handleChangeDocumentType}
                disabled={isChangingType}
              >
                {({ value, onValueChange, open, setOpen, disabled }) => (
                  <>
                    <SelectTrigger className="w-full" disabled={disabled}>
                      <span className="truncate">
                        {isChangingType ? "Changing..." : getCurrentTypeLabel()}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(FILTER_MAP).map((label) => {
                        const typeValue = FILTER_MAP[label];
                        const isSelected = value === typeValue;
                        return (
                          <SelectItem
                            key={typeValue}
                            value={typeValue}
                            selected={isSelected}
                            onSelect={(val) => {
                              handleChangeDocumentType(val);
                              setOpen(false);
                            }}
                          >
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </>
                )}
              </Select>
            </div>
            {doc.type && renderCopyButton(doc.type, "type")}
          </div>
        </div>

        {copiedValue && (
          <p className="text-xs text-green-400">Copied to clipboard.</p>
        )}
      </div>

      {/* Action Buttons - Single Row with Tooltips */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-gray-700 bg-[#161b22] pt-4 pb-4 px-4">
        <TooltipProvider>
          <div className="flex flex-row gap-2">
            {/* Mark as Seen/Unseen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleToggleSeenStatus}
                  size="icon"
                  className={`h-10 w-10 cursor-pointer flex-1 ${
                    doc.seen === true 
                      ? "bg-blue-500 hover:bg-blue-600 text-white" 
                      : "bg-[#1f6feb] hover:bg-[#1a5fd4] text-white"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{doc.seen === true ? "Mark as Unseen" : "Mark as Seen"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Mark for Resend */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleToggleMarkForResend}
                  size="icon"
                  variant="outline"
                  className={`h-10 w-10 cursor-pointer flex-1 ${
                    doc.state === "markedForResend"
                      ? "border-orange-500 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400"
                      : "border-gray-600 text-gray-300 bg-[#111827] hover:bg-[#1d232a] hover:border-gray-500"
                  }`}
                >
                  {doc.state === "markedForResend" ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{doc.state === "markedForResend" ? "Undo Mark for Resend" : "Mark for Resend"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Mark as Done */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleToggleCompleted}
                  size="icon"
                  variant="outline"
                  className={`h-10 w-10 cursor-pointer flex-1 ${
                    doc.completed === true
                      ? "border-emerald-500 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400"
                      : "border-gray-600 text-gray-300 bg-[#111827] hover:bg-[#1d232a] hover:border-gray-500"
                  }`}
                >
                  {doc.completed === true ? (
                    <Circle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{doc.completed === true ? "Undo Mark as Done" : "Mark as Done"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Flag Document */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleToggleFlagStatus}
                  size="icon"
                  variant="outline"
                  className={`h-10 w-10 cursor-pointer flex-1 ${
                    doc.flag?.flagged
                      ? "border-[#1f6feb] text-[#1f6feb] bg-[#1f6feb]/10 hover:bg-[#1f6feb]/20"
                      : "border-gray-600 text-gray-300 bg-[#111827] hover:bg-[#1d232a] hover:border-gray-500"
                  }`}
                  aria-label={doc.flag?.flagged ? "Unflag document" : "Flag document"}
                >
                  <Flag
                    className="h-4 w-4"
                    fill={doc.flag?.flagged ? "#1f6feb" : "none"}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{doc.flag?.flagged ? "Unflag Document" : "Flag Document"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Delete Document */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowDeleteModal(true)}
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 cursor-pointer flex-1 border-red-500/50 text-red-500 bg-[#111827] hover:bg-red-500/10 hover:border-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Document</p>
              </TooltipContent>
            </Tooltip>

            {/* Send Acknowledgement */}
            <Popover open={showAcknowledgementDropdown} onOpenChange={setShowAcknowledgementDropdown}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button 
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 cursor-pointer flex-1 border-gray-600 text-gray-300 bg-[#111827] hover:bg-[#1d232a] hover:border-gray-500"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send Acknowledgement</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="max-h-[400px] overflow-y-auto">
                  {/* Header */}
                  <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Acknowledgements</h3>
                    <Button
                      onClick={handleAddAcknowledgement}
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* Loading State */}
                  {isLoadingAcknowledgements && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Loading templates...
                    </div>
                  )}

                  {/* Templates List */}
                  {!isLoadingAcknowledgements && acknowledgements.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      No acknowledgement templates found
                    </div>
                  )}

                  {!isLoadingAcknowledgements && acknowledgements.length > 0 && (
                    <div className="p-2">
                      {acknowledgements.map((ack) => (
                        <div
                          key={ack.id}
                          className="group p-2 rounded hover:bg-[#1d232a] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => handleSendAcknowledgement(ack.data)}
                              disabled={isSendingAcknowledgement}
                              className="flex-1 text-left text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                            >
                              <p className="line-clamp-2">{ack.data}</p>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={() => handleEditAcknowledgement(ack)}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-400 hover:text-white"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteAcknowledgement(ack.id)}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TooltipProvider>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-[#161b22] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Delete Document</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white"
                disabled={isDeleting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <p className="text-xs text-gray-400">
                The document will be marked as deleted and removed from the list.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-[#1d232a]"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteDocument}
                size="sm"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Acknowledgement Modal */}
      {showAddAcknowledgementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-[#161b22] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingAcknowledgement ? "Edit Acknowledgement" : "Add Acknowledgement Template"}
              </h3>
              <button
                onClick={() => {
                  setShowAddAcknowledgementModal(false);
                  setEditingAcknowledgement(null);
                  setAcknowledgementText("");
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Acknowledgement Text <span className="text-red-400">*</span>
              </label>
              <textarea
                value={acknowledgementText}
                onChange={(e) => setAcknowledgementText(e.target.value)}
                placeholder="Enter acknowledgement text..."
                className="w-full min-h-[100px] px-3 py-2 bg-[#1d232a] border border-gray-700 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-[#1f6feb] resize-none"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowAddAcknowledgementModal(false);
                  setEditingAcknowledgement(null);
                  setAcknowledgementText("");
                }}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-[#1d232a]"
              >
                Cancel
              </Button>
              <Button
                onClick={editingAcknowledgement ? handleUpdateAcknowledgement : handleCreateAcknowledgement}
                size="sm"
                disabled={!acknowledgementText.trim()}
                className="bg-[#1f6feb] hover:bg-[#1a5fd4] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingAcknowledgement ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
