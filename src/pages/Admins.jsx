import { useMemo, useState, useEffect } from "react";
import {
  Search,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { fetchAdmins } from "../services/adminAPI";

const permissionSections = [
  {
    title: "CTPAT",
    items: [
      "Delivery Proof",
      "Driver expense",
      "Load Image",
      "Stamp Paper",
      "Pickup Doc",
      "Repair and maintenance",
    ],
  },
  {
    title: "Operational Forms",
    items: [
      "DM Transport Trip Envelope",
      "DM Trans Inc Trip Envelope",
      "DM Transport City Worksheet",
      "Fuel Receipt",
    ],
  },
  {
    title: "Admin Tools",
    items: [
      "Manage Drivers",
      "View Drivers",
      "Maintenance Chat",
      "View Admin",
      "Manage Admin",
      "Chat",
      "Delete Multiple Users Chart",
    ],
  },
];

const permissionDefaults = permissionSections
  .flatMap((section) => section.items)
  .reduce((acc, permission) => {
    acc[permission] = true;
    return acc;
  }, {});

const buildPermissionsForAdmin = (name) => {
  const seed = name.length % 2 === 0;
  return Object.keys(permissionDefaults).reduce((acc, permission, index) => {
    acc[permission] = seed ? index % 3 !== 0 : index % 4 !== 0;
    return acc;
  }, {});
};

const normalizeAdmins = (payload) => {
  if (!payload) return [];
  const candidates = Array.isArray(payload)
    ? payload
    : payload.admins || payload.data || payload.users || payload.result || [];
  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((admin, index) => {
      const name =
        admin?.userid ||
        admin?.username ||
        admin?.name ||
        admin?.email ||
        admin?.id ||
        `Admin ${index + 1}`;
      return {
        id: admin?.id || admin?.userid || admin?.email || name,
        name,
        raw: admin,
      };
    })
    .filter((admin) => admin.name);
};

export default function Admins() {
  const [query, setQuery] = useState("");
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminPermissions, setAdminPermissions] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function loadAdmins() {
      try {
        setIsLoading(true);
        const response = await fetchAdmins();
        if (!isMounted) return;
        const normalized = normalizeAdmins(response);
        setAdmins(normalized);
        setSelectedAdmin(normalized[0]?.name || "");
        setAdminPermissions(
          normalized.reduce((acc, admin) => {
            acc[admin.name] = buildPermissionsForAdmin(admin.name);
            return acc;
          }, {})
        );
        setError("");
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Unable to fetch admins right now.");
        setAdmins([]);
        setSelectedAdmin("");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAdmins();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAdmins = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return admins;
    return admins.filter((admin) =>
      admin.name.toLowerCase().includes(normalized)
    );
  }, [admins, query]);

  useEffect(() => {
    if (filteredAdmins.length === 0) return;
    const nextAdmin = filteredAdmins.find(
      (admin) => admin.name === selectedAdmin
    );
    if (!nextAdmin) {
      setSelectedAdmin(filteredAdmins[0].name);
    }
  }, [filteredAdmins, selectedAdmin]);

  const permissions = selectedAdmin
    ? adminPermissions[selectedAdmin] || permissionDefaults
    : permissionDefaults;

  const togglePermission = (permission) => {
    if (!selectedAdmin) return;
    setAdminPermissions((prev) => ({
      ...prev,
      [selectedAdmin]: {
        ...prev[selectedAdmin],
        [permission]: !prev[selectedAdmin]?.[permission],
      },
    }));
  };

  const selectedAdminMeta = admins.find(
    (admin) => admin.name === selectedAdmin
  );

  const handleAddAdmin = (event) => {
    event.preventDefault();
    const trimmedName = newAdminName.trim();
    if (!trimmedName) {
      return;
    }

    const createdAdmin = {
      id: `local-${Date.now()}`,
      name: trimmedName,
      raw: {
        email: newAdminEmail.trim() || undefined,
      },
    };

    setAdmins((prev) => [createdAdmin, ...prev]);
    setAdminPermissions((prev) => ({
      ...prev,
      [createdAdmin.name]: buildPermissionsForAdmin(createdAdmin.name),
    }));
    setSelectedAdmin(createdAdmin.name);
    setNewAdminName("");
    setNewAdminEmail("");
    setIsAddAdminOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#101418] px-6 py-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">DM Transport</p>
          <h1 className="text-2xl font-semibold">Admins</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddAdminOpen(true)}
            className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
          >
            <Plus className="h-4 w-4" />
            Add Admin
          </button>
        </div>
      </div>

      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#151a1f] p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">Admins</p>
                <h2 className="text-xl font-semibold">Add Admin</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAdminOpen(false)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-sm text-slate-300 transition hover:border-slate-500"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Admin name
                </label>
                <input
                  value={newAdminName}
                  onChange={(event) => setNewAdminName(event.target.value)}
                  placeholder="Enter full name"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Email (optional)
                </label>
                <input
                  value={newAdminEmail}
                  onChange={(event) => setNewAdminEmail(event.target.value)}
                  placeholder="admin@dmtransport.io"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  Save Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-[#151a1f] p-4 shadow-lg">
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Admins"
              className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="mt-4">
            <p className="text-sm text-slate-400">Admins</p>
            <div className="mt-3 space-y-1">
              {isLoading ? (
                <div className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                  Loading admins...
                </div>
              ) : error ? (
                <div className="rounded-lg border border-dashed border-rose-500/50 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-200">
                  {error}
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                  No admins found.
                </div>
              ) : (
                filteredAdmins.map((admin) => (
                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => setSelectedAdmin(admin.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedAdmin === admin.name
                        ? "bg-slate-800 text-slate-100"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span>{admin.name}</span>
                    <ChevronRight
                      className={`h-4 w-4 transition ${
                        selectedAdmin === admin.name
                          ? "text-sky-300"
                          : "text-slate-500"
                      }`}
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#151a1f] px-6 py-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold">
                {selectedAdmin?.charAt(0) || "A"}
              </div>
              <div>
                <p className="text-sm text-slate-400">Admin</p>
                <p className="text-lg font-semibold">
                  {selectedAdmin || "Select Admin"}
                </p>
                {selectedAdminMeta?.raw?.email && (
                  <p className="text-xs text-slate-500">
                    {selectedAdminMeta.raw.email}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:border-slate-500"
                aria-label="Save permissions"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-rose-300 transition hover:border-rose-400"
                aria-label="Delete admin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Permissions
          </div>

          <div className="mt-4 space-y-6">
            {permissionSections.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {section.title}
                </p>
                <div className="mt-3 space-y-2">
                  {section.items.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                    >
                      <span className="text-sm text-slate-200">
                        {permission}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePermission(permission)}
                        disabled={!selectedAdmin}
                        className={`flex h-7 w-12 items-center rounded-full border transition ${
                          permissions?.[permission]
                            ? "border-sky-400 bg-sky-500"
                            : "border-slate-700 bg-slate-800"
                        } ${!selectedAdmin ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow transition ${
                            permissions?.[permission]
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
