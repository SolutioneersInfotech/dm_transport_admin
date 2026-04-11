export const DOCUMENT_FILTER_OPTIONS = [
  { label: "Pickup Doc", filterValue: "pick_up", permissionKey: "pick_up" },
  { label: "Delivery Proof", filterValue: "delivery", permissionKey: "delivery" },
  { label: "Load Image", filterValue: "load_image", permissionKey: "load_image" },
  { label: "Fuel Receipt", filterValue: "fuel_recipt", permissionKey: "fuel_recipt" },
  { label: "Scale Ticket", filterValue: "scale_ticket", permissionKey: "scale_ticket" },
  { label: "Tracking", filterValue: "tracking", permissionKey: "tracking" },
  { label: "Stamp Paper", filterValue: "paper_logs", permissionKey: "paper_logs" },
  { label: "Driver Expense", filterValue: "driver_expense_sheet", permissionKey: "driver_expense_sheet" },
  { label: "DM Transport Trip Envelope", filterValue: "dm_transport_trip_envelope", permissionKey: "dm_transport_trip_envelope" },
  { label: "DM Trans Inc Trip Envelope", filterValue: "dm_trans_inc_trip_envelope", permissionKey: "dm_trans_inc_trip_envelope" },
  {
    label: "DM Transport City Worksheet",
    filterValue: "dm_transport_city_worksheet_trip_envelope",
    permissionKey: "dm_transport_city_worksheet_trip_envelope",
  },
  { label: "Repair and Maintenance", filterValue: "trip_envelope", permissionKey: "trip_envelope" },
  { label: "CTPAT", filterValue: "CTPAT", permissionKey: "CTPAT" },
];

export const getAvailableDocumentFilterOptions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return DOCUMENT_FILTER_OPTIONS;
  }

  const activePermissions = new Set(permissions.map((permission) => String(permission).trim()));

  return DOCUMENT_FILTER_OPTIONS.filter(({ permissionKey, filterValue, label }) =>
    activePermissions.has(permissionKey) ||
    activePermissions.has(filterValue) ||
    activePermissions.has(label)
  );
};

export const hasDocumentAccess = (permissions) => {
  return getAvailableDocumentFilterOptions(permissions).length > 0;
};
