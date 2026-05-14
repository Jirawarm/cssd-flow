import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Filter, Package,
  ArrowRight, CheckCircle, AlertTriangle, Clock, X,
} from "lucide-react";
import { api } from "../api";

const ACTION_CONFIG = {
  RECEIVED: {
    bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200",
    dot: "bg-blue-500", label: "Received",
  },
  STATUS_CHANGED: {
    bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200",
    dot: "bg-sky-400", label: "Status Changed",
  },
  DISPATCHED: {
    bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200",
    dot: "bg-gray-400", label: "Dispatched",
  },
  DISPATCHED_WITH_DISCREPANCY: {
    bg: "bg-red-100", text: "text-red-700", border: "border-red-200",
    dot: "bg-red-500", label: "Dispatched (Discrepancy)",
  },
};

const STATUS_TO_CONFIG = {
  WASHING:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400"   },
  STERILIZING: { bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-400"  },
  READY:       { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-400" },
};

function getActionConfig(log) {
  if (log.action === "STATUS_CHANGED" && log.new_status && STATUS_TO_CONFIG[log.new_status]) {
    const s = STATUS_TO_CONFIG[log.new_status];
    return { ...ACTION_CONFIG.STATUS_CHANGED, ...s, label: `→ ${log.new_status}` };
  }
  return ACTION_CONFIG[log.action] || ACTION_CONFIG.STATUS_CHANGED;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeSince(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const INITIAL_FILTERS = { search: "", operator: "", action: "", department: "", dateFrom: "", dateTo: "" };

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [applied, setApplied] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const fetchLogs = useCallback(async (f) => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        search: f.search || undefined,
        operator: f.operator || undefined,
        action: f.action || undefined,
        department: f.department || undefined,
        date_from: f.dateFrom || undefined,
        date_to: f.dateTo || undefined,
      });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(applied);
  }, [applied, fetchLogs]);

  const applyFilters = () => {
    setApplied({ ...filters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setApplied(INITIAL_FILTERS);
    setShowFilters(false);
  };

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const hasActiveFilters = Object.values(applied).some(Boolean);
  const activeFilterCount = Object.values(applied).filter(Boolean).length;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit History</h1>
          <p className="text-sm text-gray-400 mt-0.5">Complete chain-of-custody log for all transactions</p>
        </div>
        <button
          onClick={() => fetchLogs(applied)}
          className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={setFilter("search")}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search by set name..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            hasActiveFilters
              ? "bg-sky-500 text-white border-sky-500"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Filter size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-white/30 rounded-full text-xs flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={14} /> Clear
          </button>
        )}

        <button
          onClick={applyFilters}
          className="px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Operator</label>
            <input
              type="text"
              value={filters.operator}
              onChange={setFilter("operator")}
              placeholder="Filter by operator name"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Department</label>
            <input
              type="text"
              value={filters.department}
              onChange={setFilter("department")}
              placeholder="Filter by department"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Action Type</label>
            <select
              value={filters.action}
              onChange={setFilter("action")}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
            >
              <option value="">All Actions</option>
              <option value="RECEIVED">Received</option>
              <option value="STATUS_CHANGED">Status Changed</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DISPATCHED_WITH_DISCREPANCY">Dispatched (Discrepancy)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={setFilter("dateFrom")}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-1">
            <button onClick={() => setShowFilters(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
              Cancel
            </button>
            <button onClick={applyFilters} className="px-5 py-2 bg-sky-500 text-white rounded-lg text-sm font-semibold hover:bg-sky-600">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Log Count */}
      {!loading && (
        <p className="text-sm text-gray-400 px-1">
          {logs.length} entr{logs.length !== 1 ? "ies" : "y"} found
        </p>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-semibold">No audit logs found</p>
          <p className="text-sm text-gray-300 mt-1">
            {hasActiveFilters ? "Try clearing filters" : "Logs will appear as transactions are processed"}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gray-200" />

          <div className="space-y-2">
            {logs.map((log) => {
              const cfg = getActionConfig(log);
              const isExpanded = expanded === log.id;
              return (
                <div
                  key={log.id}
                  className="relative pl-12 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-[14px] top-4 w-4 h-4 rounded-full border-2 border-white shadow ${cfg.dot}`} />

                  <div
                    className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${
                      isExpanded ? "shadow-md border-sky-200" : cfg.border
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Action badge */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>

                        {/* Transaction info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              TX #{log.transaction_id}
                            </span>
                            {log.previous_status && log.new_status && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <span className="font-medium text-gray-500">{log.previous_status}</span>
                                <ArrowRight size={11} />
                                <span className="font-medium text-gray-700">{log.new_status}</span>
                              </div>
                            )}
                          </div>
                          {!isExpanded && log.details && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{log.details}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: operator + time */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-700">{log.operator_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5" title={formatDateTime(log.created_at)}>
                          {timeSince(log.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                        {log.details && (
                          <div className="flex gap-2">
                            <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Details</span>
                            <span className="text-xs text-gray-700 leading-relaxed">{log.details}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Timestamp</span>
                          <span className="text-xs text-gray-700">{formatDateTime(log.created_at)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-gray-400 font-medium w-20 flex-shrink-0">Operator</span>
                          <span className="text-xs text-gray-700 font-semibold">{log.operator_name}</span>
                        </div>
                        {log.action === "DISPATCHED_WITH_DISCREPANCY" && (
                          <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                            <span className="text-xs text-red-700 font-medium">Quantity discrepancy was recorded on this dispatch</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
