import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PackagePlus, Send, History, Archive,
  AlertTriangle, RefreshCw, ArrowRight,
} from "lucide-react";
import { api } from "../api";

const ACTION_LABEL = {
  RECEIVED: "Received",
  STATUS_CHANGED: "Status Changed",
  DISPATCHED: "Dispatched",
  DISPATCHED_WITH_DISCREPANCY: "Discrepancy",
};
const ACTION_STYLE = {
  RECEIVED: "bg-blue-100 text-blue-700",
  STATUS_CHANGED: "bg-sky-100 text-sky-700",
  DISPATCHED: "bg-gray-100 text-gray-600",
  DISPATCHED_WITH_DISCREPANCY: "bg-red-100 text-red-700",
};

function timeSince(d) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, tx, logs] = await Promise.all([
        api.getStats(),
        api.getTransactions(),
        api.getAuditLogs({ limit: 8 }),
      ]);
      setStats(s);
      setRecentTx(tx);
      setRecentLogs(logs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const inProcess = stats
    ? Object.entries(stats.by_status)
        .filter(([k]) => k !== "DISPATCHED")
        .reduce((sum, [, v]) => sum + v, 0)
    : 0;
  const dispatched = stats?.by_status["DISPATCHED"] ?? 0;
  const total = stats?.total ?? 0;
  const discrepancies = recentTx.filter((t) => t.discrepancy_note).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5 hidden sm:block">CSSD operations overview</p>
        </div>
        <button onClick={fetchAll} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-sky-400 shadow-sm">
          <p className="text-3xl font-bold text-sky-600">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total Jobs</p>
        </div>
        <div
          onClick={() => navigate("/dispatch")}
          className="bg-white rounded-xl p-4 border-l-4 border-l-amber-400 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <p className="text-3xl font-bold text-amber-600">{inProcess}</p>
          <p className="text-xs text-gray-400 mt-0.5">In Process</p>
        </div>
        <div
          onClick={() => navigate("/dispatched")}
          className="bg-white rounded-xl p-4 border-l-4 border-l-gray-300 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <p className="text-3xl font-bold text-gray-400">{dispatched}</p>
          <p className="text-xs text-gray-400 mt-0.5">Dispatched</p>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {discrepancies > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={17} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">{discrepancies} Quantity Discrepanc{discrepancies > 1 ? "ies" : "y"}</p>
            <p className="text-xs text-red-500 mt-0.5">Items dispatched with missing quantities</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Receive Items",  desc: "Log inbound set",       path: "/receive",    icon: PackagePlus, color: "bg-sky-500",   border: "border-sky-200",   text: "text-sky-600"  },
            { label: "Dispatch",       desc: "Send out & verify qty", path: "/dispatch",   icon: Send,        color: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-600", count: inProcess },
            { label: "Dispatched",     desc: "View completed jobs",   path: "/dispatched", icon: Archive,     color: "bg-gray-500",  border: "border-gray-200",  text: "text-gray-500" },
            { label: "Audit History",  desc: "Full activity log",     path: "/history",    icon: History,     color: "bg-indigo-500", border: "border-indigo-200", text: "text-indigo-600" },
          ].map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`relative text-left p-4 rounded-xl border-2 bg-white transition-all hover:shadow-md active:scale-95 ${card.border}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                  <card.icon size={20} className="text-white" />
                </div>
                {card.count != null && card.count > 0 && (
                  <span className={`text-2xl font-bold ${card.text}`}>{card.count}</span>
                )}
              </div>
              <p className="font-bold text-gray-900 text-sm">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Activity</h2>
            <button onClick={() => navigate("/history")} className="text-xs text-sky-500 hover:underline font-medium">
              View all →
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <button
                key={log.id}
                onClick={() => navigate(`/transaction/${log.transaction_id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${ACTION_STYLE[log.action] || ACTION_STYLE.STATUS_CHANGED}`}>
                  {ACTION_LABEL[log.action] || "Changed"}
                </span>
                <span className="text-sm text-gray-700 font-medium flex-1 truncate min-w-0">
                  TX #{log.transaction_id}
                </span>
                <span className="text-xs text-gray-400 font-medium flex-shrink-0 hidden sm:block">{log.operator_name}</span>
                <span className="text-xs text-gray-300 flex-shrink-0">{timeSince(log.created_at)}</span>
                <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
