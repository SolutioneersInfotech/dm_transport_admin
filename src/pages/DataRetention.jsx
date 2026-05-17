import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, FileText, Loader2, Play, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { ADMIN_PERMISSION_KEYS, hasAdminPermission } from "../utils/adminPermissions";
import {
  fetchRetentionSettings,
  runRetentionCleanupNow,
  updateRetentionSettings,
} from "../services/dataRetentionAPI";

const DEFAULT_SECTION = {
  enabled: true,
  value: 90,
  unit: "days",
  basis: "created_at",
};

const DEFAULT_SETTINGS = {
  chat: { ...DEFAULT_SECTION, basis: "last_message_at" },
  document: { ...DEFAULT_SECTION, basis: "uploaded_at" },
  safety: {
    requireAuditLog: true,
    requireManualConfirmation: true,
    softDeleteGraceValue: 7,
    softDeleteGraceUnit: "days",
  },
};

const RETENTION_UNITS = ["days", "months", "years"];
const CHAT_BASIS_OPTIONS = [
  { value: "created_at", label: "Conversation created date" },
  { value: "last_message_at", label: "Last message date" },
];
const DOCUMENT_BASIS_OPTIONS = [
  { value: "uploaded_at", label: "Upload date" },
  { value: "completed_at", label: "Completed date" },
  { value: "last_updated_at", label: "Last updated date" },
];

function normalizeSection(raw, fallback) {
  return {
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : fallback.enabled,
    value: Number(raw?.value ?? raw?.retentionValue ?? fallback.value),
    unit: raw?.unit || raw?.retentionUnit || fallback.unit,
    basis: raw?.basis || raw?.retentionBasis || fallback.basis,
  };
}

function normalizeSettings(payload) {
  const data = payload?.settings || payload?.data || payload || {};
  return {
    chat: normalizeSection(data.chat || data.chatRetention, DEFAULT_SETTINGS.chat),
    document: normalizeSection(data.document || data.documentRetention, DEFAULT_SETTINGS.document),
    safety: {
      requireAuditLog: data.safety?.requireAuditLog ?? data.requireAuditLog ?? true,
      requireManualConfirmation:
        data.safety?.requireManualConfirmation ?? data.requireManualConfirmation ?? true,
      softDeleteGraceValue: Number(
        data.safety?.softDeleteGraceValue ?? data.softDeleteGraceValue ?? DEFAULT_SETTINGS.safety.softDeleteGraceValue
      ),
      softDeleteGraceUnit:
        data.safety?.softDeleteGraceUnit ?? data.softDeleteGraceUnit ?? DEFAULT_SETTINGS.safety.softDeleteGraceUnit,
    },
  };
}

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "border-sky-400 bg-sky-500" : "border-slate-700 bg-slate-800"
      }`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function RetentionSection({ title, description, icon, section, basisOptions, disabled, onChange, error }) {
  const SectionIcon = icon;
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#151a1f] p-5 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-sky-300">
            <SectionIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
        </div>
        <Toggle checked={section.enabled} disabled={disabled} onChange={(enabled) => onChange({ ...section, enabled })} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Retention value</span>
          <input
            type="number"
            min="1"
            max="3650"
            disabled={disabled || !section.enabled}
            value={section.value}
            onChange={(event) => onChange({ ...section, value: event.target.value })}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Unit</span>
          <select
            disabled={disabled || !section.enabled}
            value={section.unit}
            onChange={(event) => onChange({ ...section, unit: event.target.value })}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {RETENTION_UNITS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Retention basis</span>
          <select
            disabled={disabled || !section.enabled}
            value={section.basis}
            onChange={(event) => onChange({ ...section, basis: event.target.value })}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {basisOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
    </section>
  );
}

export default function DataRetention() {
  const { user } = useAuth();
  const canView = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.viewDataRetentionDashboard),
    [user?.permissions]
  );
  const canManage = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.manageDataRetentionSettings),
    [user?.permissions]
  );
  const canRunCleanup = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.runRetentionCleanupNow),
    [user?.permissions]
  );

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canView) return;
    let isMounted = true;
    setIsLoading(true);
    fetchRetentionSettings()
      .then((response) => {
        if (isMounted) setSettings(normalizeSettings(response));
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || "Unable to load retention settings.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [canView]);

  const validation = useMemo(() => {
    const errors = {};
    const validate = (key, basisOptions) => {
      const section = settings[key];
      if (!section.enabled) return;
      const value = Number(section.value);
      if (!Number.isInteger(value) || value < 1 || value > 3650) {
        errors[key] = "Enter a whole number between 1 and 3650.";
      } else if (!RETENTION_UNITS.includes(section.unit)) {
        errors[key] = "Choose a valid retention unit.";
      } else if (!basisOptions.some((option) => option.value === section.basis)) {
        errors[key] = "Choose a valid retention basis.";
      }
    };
    validate("chat", CHAT_BASIS_OPTIONS);
    validate("document", DOCUMENT_BASIS_OPTIONS);
    const grace = Number(settings.safety.softDeleteGraceValue);
    if (!Number.isInteger(grace) || grace < 0 || grace > 3650) {
      errors.safety = "Grace period must be a whole number between 0 and 3650.";
    }
    return errors;
  }, [settings]);

  const hasValidationErrors = Object.keys(validation).length > 0;

  const handleSave = async () => {
    if (!canManage || hasValidationErrors) return;
    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        chat: { ...settings.chat, value: Number(settings.chat.value) },
        document: { ...settings.document, value: Number(settings.document.value) },
        safety: {
          ...settings.safety,
          softDeleteGraceValue: Number(settings.safety.softDeleteGraceValue),
        },
      };
      await updateRetentionSettings(payload);
      toast.success("Retention settings saved");
    } catch (err) {
      toast.error(err?.message || "Unable to save retention settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleanupNow = async () => {
    setIsRunningCleanup(true);
    try {
      await runRetentionCleanupNow("all");
      toast.success("Retention cleanup started");
    } catch (err) {
      toast.error(err?.message || "Unable to start retention cleanup");
    } finally {
      setIsRunningCleanup(false);
    }
  };

  if (!canView) {
    return (
      <div className="min-h-screen bg-[#101418] p-6 text-white">
        <div className="rounded-2xl border border-slate-800 bg-[#151a1f] p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-500" />
          <h1 className="mt-4 text-xl font-semibold">Permission required</h1>
          <p className="mt-2 text-sm text-slate-400">You do not have access to the Data Retention dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101418] p-4 text-white sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Settings</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Data Retention & Deletion</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Configure how long chat conversations and documents are retained before backend cleanup removes eligible records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRunCleanup && (
            <Button
              type="button"
              onClick={handleCleanupNow}
              disabled={isRunningCleanup}
              className="border border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
            >
              {isRunningCleanup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run Cleanup Now
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canManage || isSaving || hasValidationErrors}
            className="bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {!canManage && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          You can view retention settings, but editing requires Manage Data Retention Settings permission.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-[#151a1f] p-8 text-center text-slate-300">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm">Loading retention settings…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-100">{error}</div>
      ) : (
        <div className="space-y-5">
          <RetentionSection
            title="Chat retention"
            description="Delete eligible chat conversations and messages after the selected period."
            icon={Database}
            section={settings.chat}
            basisOptions={CHAT_BASIS_OPTIONS}
            disabled={!canManage}
            error={validation.chat}
            onChange={(chat) => setSettings((prev) => ({ ...prev, chat }))}
          />
          <RetentionSection
            title="Document retention"
            description="Delete eligible document records and files after the selected period."
            icon={FileText}
            section={settings.document}
            basisOptions={DOCUMENT_BASIS_OPTIONS}
            disabled={!canManage}
            error={validation.document}
            onChange={(document) => setSettings((prev) => ({ ...prev, document }))}
          />

          <section className="rounded-2xl border border-slate-800 bg-[#151a1f] p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Safety / audit</h2>
                <p className="mt-1 text-sm text-slate-400">Controls used by backend deletion workflows and manual permanent deletes.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">Require audit log entries</p>
                  <p className="text-xs text-slate-500">Backend records all deletion operations.</p>
                </div>
                <Toggle
                  checked={settings.safety.requireAuditLog}
                  disabled={!canManage}
                  onChange={(requireAuditLog) => setSettings((prev) => ({ ...prev, safety: { ...prev.safety, requireAuditLog } }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">Manual confirmation</p>
                  <p className="text-xs text-slate-500">Keep destructive UI confirmation enabled.</p>
                </div>
                <Toggle
                  checked={settings.safety.requireManualConfirmation}
                  disabled={!canManage}
                  onChange={(requireManualConfirmation) => setSettings((prev) => ({ ...prev, safety: { ...prev.safety, requireManualConfirmation } }))}
                />
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Soft-delete grace period</span>
                <input
                  type="number"
                  min="0"
                  max="3650"
                  disabled={!canManage}
                  value={settings.safety.softDeleteGraceValue}
                  onChange={(event) => setSettings((prev) => ({ ...prev, safety: { ...prev.safety, softDeleteGraceValue: event.target.value } }))}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Grace unit</span>
                <select
                  disabled={!canManage}
                  value={settings.safety.softDeleteGraceUnit}
                  onChange={(event) => setSettings((prev) => ({ ...prev, safety: { ...prev.safety, softDeleteGraceUnit: event.target.value } }))}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {RETENTION_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
            </div>
            {validation.safety && <p className="mt-3 text-xs text-rose-300">{validation.safety}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
