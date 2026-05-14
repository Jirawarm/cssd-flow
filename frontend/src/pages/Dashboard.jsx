import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PackagePlus, Waves, Zap, CheckCircle, Send, History,
  AlertTriangle, RefreshCw, ArrowRight, Clock,
} from "lucide-react";
import { api } from "../api";

const WORKFLOW_CARDS = [
  { label: "Receive Items",     desc: "Log new inbound sets",         path: "/receive",     icon: PackagePlus, color: "bg-sky-500",     border: "border-sky-200",     text: "text-sky-600",     statusKey: null           },
  { label: "Washing Queue",     desc: "Items awaiting washing",       path: "/washing",     icon: Waves,       color: "bg-amber-500",   border: "border-amber-200",   text: "text-amber-600",   statusKey: "RECEIVED"     },
  { label: "Sterilizing Queue", desc: "Items being sterilized",       path: "/sterilizing", icon: Zap,         color: "bg-purple-500",  border: "border-purple-200",  text: "text-purple-600",  statusKey: "WASHING"      },
  { label: "Ready Queue",       desc: "Sterilized, ready for check",  path: "/ready",       icon: CheckCircle, color: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-600", statusKey: "STERILIZING"  },
  { label: "Dispatch",          desc: "Validate & dispatch sets",     path: "/dispatch",    icon: Send,        color: "bg-teal-500",    border: "border-teal-200",    text: "text-teal-600",    statusKey: "READY"        },
  { label: "Audit History",     desc: "Full chain-of-custody log",    path: "/history",     icon: History,     color: "bg-gray-500",    border: "border-gray-200",    text: "text-gray-600",    statusKey: null           },
];

const STAT_CARDS = [
  { key: "RECEIVED",    label: "Received",    border: "border-l-blue-400",    num: "text-blue-600"    },
  { key: "WASHING",     label: "Washing",     border: "border-l-amber-400",   num: "text-amber-600"   },
  { key: "STERILIZING", label: "Sterilizing", border: "border-l-purple-400",  num: "text-purple-600"  },
  { key: "READY",       label: "Ready",       border: "border-l-emerald-400", num: "text-emerald-600" },
  { key: "DISPATCHED",  label: "Dispatched",  border: "border-l-gray-300",    num: "text-gray-400"    },
];

const ACTION_LABEL = {
  RECEIVED: "Received", STATUS_CHANGED: "Status Changed",
  DISPATCHED: "Dispatched", DISPATCHED_WITH_DISCREPANCY: "Discrepancy",
};
const ACTION_STYLE = {
  RECEIVED: "bg-blue-100 text-blue-700", STATUS_CHANGED: "bg-sky-100 text-sky-700",
  DISPATCHED: "bg-gray-100 text-gray-600", DISPATCHED_WITH_DISCREPANCY: "bg-red-100 text-red-700",
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

function isStalled(tx) {
  return (Date.now() - new Date(tx.updated_at).getTime()) / 3_600_000 > 4;
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

  const discrepancies = recentTx.filter((t) => t.discrepancy_note).length;
  const stalledItems = recentTx.filter((t) => t.status !== "DISPATCHED" && isStalled(t));

  return (
    <div className="space-y-5 max-w-5xl">
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

      {/* Stat Cards — 2-col mobile, 3 tablet, 5 desktop */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
          {STAT_CARDS.map((s) => (
            <div
              key={s.key}
              onClick={() => navigate(s.key === "RECEIVED" ? "/washing" : s.key === "WASHING" ? "/sterilizing" : s.key === "STERILIZING" ? "/ready" : s.key === "READY" ? "/dispatch" : "/history")}
              className={`bg-white rounded-xl p-3 md:p-4 border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${s.border}`}
            >
              <p className={`text-2xl md:text-3xl font-bold ${s.num}`}>{stats.by_status[s.key]}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {(discrepancies > 0 || stalledItems.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {discrepancies > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex-1">
              <AlertTriangle size={17} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">{discrepancies} Quantity Discrepanc{discrepancies > 1 ? "ies" : "y"}</p>
                <p className="text-xs text-red-500 mt-0.5">Items dispatched with missing quantities</p>
              </div>
            </div>
          )}
          {stalledItems.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex-1">
              <Clock size={17} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700">{stalledItems.length} Stalled Item{stalledItems.length > 1 ? "s" : ""}</p>
                <p className="text-xs text-amber-600 mt-0.5">No movement for over 4 hours</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workflow Grid — 1-col mobile, 2 tablet, 3 desktop */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Workflow Stages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WORKFLOW_CARDS.map((card) => {
            const Icon = card.icon;
            const count = stats && card.statusKey ? stats.by_status[card.statusKey] : null;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all hover:shadow-md active:scale-95 min-h-[80px] ${card.border} bg-white`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  {count != null && (
                    <span className={`text-2xl font-bold ${card.text}`}>{count}</span>
                  )}
                </div>
                <p className="font-bold text-gray-900 text-sm">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{card.desc}</p>
              </button>
            );
          })}
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
                  {log.new_status && <span className="text-gray-400 font-normal"> → {log.new_status}</span>}
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
