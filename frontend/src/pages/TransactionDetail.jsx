import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, CheckCircle, Clock, User, Calendar,
  AlertTriangle, ChevronDown, ChevronUp, Image as ImageIcon,
  ArrowRight, RefreshCw,
} from "lucide-react";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import ImageModal from "../components/ImageModal";

const STAGES = ["RECEIVED", "WASHING", "STERILIZING", "READY", "DISPATCHED"];

const STAGE_CONFIG = {
  RECEIVED:    { color: "bg-blue-500",    ring: "ring-blue-400",    text: "text-blue-600",    light: "bg-blue-50"    },
  WASHING:     { color: "bg-amber-500",   ring: "ring-amber-400",   text: "text-amber-600",   light: "bg-amber-50"   },
  STERILIZING: { color: "bg-purple-500",  ring: "ring-purple-400",  text: "text-purple-600",  light: "bg-purple-50"  },
  READY:       { color: "bg-emerald-500", ring: "ring-emerald-400", text: "text-emerald-600", light: "bg-emerald-50" },
  DISPATCHED:  { color: "bg-gray-500",    ring: "ring-gray-400",    text: "text-gray-600",    light: "bg-gray-50"    },
};

const ACTION_CONFIG = {
  RECEIVED:                    { bg: "bg-blue-100",   text: "text-blue-700",   label: "Received"           },
  STATUS_CHANGED:              { bg: "bg-sky-100",    text: "text-sky-700",    label: "Status Changed"     },
  DISPATCHED:                  { bg: "bg-gray-100",   text: "text-gray-600",   label: "Dispatched"         },
  DISPATCHED_WITH_DISCREPANCY: { bg: "bg-red-100",    text: "text-red-700",    label: "Dispatched (Issue)" },
};

function calcDuration(from, to) {
  if (!from || !to) return null;
  const ms = new Date(to) - new Date(from);
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={16} className="text-gray-400 flex-shrink-0" />}
          <span className="font-bold text-gray-800 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, highlight, mono }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-right max-w-[65%] break-words ${highlight ? "font-bold text-sky-600 text-base" : "font-medium text-gray-800"} ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function PhotoCard({ src, label, onOpen }) {
  if (!src) return (
    <div className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300">
      <ImageIcon size={28} />
      <span className="text-xs">{label} not available</span>
    </div>
  );
  return (
    <button onClick={() => onOpen(src)} className="block w-full group relative">
      <img src={src} alt={label} className="w-full h-48 object-cover rounded-xl border border-gray-200 group-hover:opacity-90 transition-opacity" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
        <div className="bg-white/90 rounded-full p-2">
          <ImageIcon size={18} className="text-gray-700" />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center">{label} · tap to expand</p>
    </button>
  );
}

function buildStageTimeline(logs) {
  const stageMap = {};
  for (const log of logs) {
    if (log.action === "RECEIVED") stageMap["RECEIVED"] = log;
    else if (log.action === "STATUS_CHANGED" && log.new_status) stageMap[log.new_status] = log;
    else if (log.action === "DISPATCHED" || log.action === "DISPATCHED_WITH_DISCREPANCY") stageMap["DISPATCHED"] = log;
  }
  return STAGES.map((stage, i) => {
    const log = stageMap[stage] || null;
    const nextStage = STAGES[i + 1];
    const nextLog = nextStage ? stageMap[nextStage] : null;
    return { stage, log, duration: log && nextLog ? calcDuration(log.created_at, nextLog.created_at) : null };
  });
}

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalSrc, setModalSrc] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.getTransactionDetail(parseInt(id));
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return (
    <div className="max-w-4xl space-y-4">
      <div className="h-8 bg-gray-200 rounded-xl animate-pulse w-48" />
      <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-xl text-center py-20">
      <AlertTriangle size={48} className="mx-auto text-red-400 mb-3" />
      <p className="text-gray-600 font-semibold">Failed to load transaction</p>
      <p className="text-sm text-gray-400 mt-1">{error}</p>
      <button onClick={() => navigate(-1)} className="mt-4 px-5 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold">
        Go Back
      </button>
    </div>
  );

  const { transaction: tx, audit_logs: logs } = data;
  const stageTimeline = buildStageTimeline(logs);
  const currentStageIdx = STAGES.indexOf(tx.status);
  const hasDiscrepancy = tx.discrepancy_note || (tx.outbound_qty != null && tx.outbound_qty < tx.inbound_qty);

  return (
    <div className="max-w-4xl space-y-4 pb-8">
      {/* Sticky Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5 sticky top-0 z-30">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 flex-shrink-0 mt-0.5"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-400 font-mono">TX #{tx.id}</span>
              <StatusBadge status={tx.status} />
              {hasDiscrepancy && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">
                  Discrepancy
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-gray-900 truncate mt-0.5">{tx.set_name}</h1>
            <p className="text-sm text-gray-400">{tx.department}</p>
          </div>
          <button onClick={fetch} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-0 mt-4 overflow-x-auto pb-1">
          {STAGES.map((stage, i) => {
            const done = i <= currentStageIdx;
            const current = i === currentStageIdx;
            const cfg = STAGE_CONFIG[stage];
            return (
              <div key={stage} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    done
                      ? `${cfg.color} text-white border-transparent`
                      : "bg-gray-100 text-gray-400 border-gray-200"
                  } ${current ? `ring-2 ${cfg.ring} ring-offset-1` : ""}`}>
                    {done && !current ? <CheckCircle size={14} className="text-white" /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${done ? cfg.text : "text-gray-400"}`}>
                    {stage === "STERILIZING" ? "STERIL." : stage}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < currentStageIdx ? cfg.color : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content: 2-col on desktop, 1-col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column */}
        <div className="space-y-4">

          {/* Basic Info */}
          <Section title="Basic Information" icon={Package} defaultOpen={true}>
            <div>
              <InfoRow label="Transaction ID" value={`#${tx.id}`} mono />
              <InfoRow label="Department" value={tx.department} />
              <InfoRow label="Set Name" value={tx.set_name} />
              <InfoRow label="Current Status" value={<StatusBadge status={tx.status} />} />
              <InfoRow label="Created" value={fmt(tx.created_at)} />
              <InfoRow label="Last Updated" value={fmt(tx.updated_at)} />
            </div>
          </Section>

          {/* Inbound Info */}
          <Section title="Inbound Information" icon={Calendar} defaultOpen={true}>
            <div className="space-y-4">
              <PhotoCard src={tx.inbound_image} label="Inbound Photo" onOpen={setModalSrc} />
              <div>
                <InfoRow label="Quantity Received" value={tx.inbound_qty} highlight />
                {logs[0] && <InfoRow label="Received By" value={logs.find(l => l.action === "RECEIVED")?.operator_name} />}
                <InfoRow label="Received At" value={fmt(tx.created_at)} />
                {tx.notes && <InfoRow label="Notes" value={tx.notes} />}
              </div>
            </div>
          </Section>

          {/* Outbound Info - always shown, empty if not dispatched */}
          <Section title="Outbound Information" icon={CheckCircle} defaultOpen={tx.status === "DISPATCHED"}>
            {tx.status !== "DISPATCHED" ? (
              <div className="text-center py-6 text-gray-400">
                <Clock size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Not yet dispatched</p>
                <p className="text-xs mt-0.5">Current status: <strong>{tx.status}</strong></p>
              </div>
            ) : (
              <div className="space-y-4">
                <PhotoCard src={tx.outbound_image} label="Outbound Photo" onOpen={setModalSrc} />
                <div>
                  {/* Quantity comparison */}
                  <div className={`flex items-center justify-between py-3 px-4 rounded-xl mb-3 ${
                    hasDiscrepancy ? "bg-red-50 border border-red-200" : "bg-emerald-50 border border-emerald-200"
                  }`}>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Received</p>
                      <p className="text-2xl font-bold text-sky-600">{tx.inbound_qty}</p>
                    </div>
                    <ArrowRight size={20} className="text-gray-400" />
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Dispatched</p>
                      <p className={`text-2xl font-bold ${hasDiscrepancy ? "text-red-600" : "text-emerald-600"}`}>
                        {tx.outbound_qty}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Diff</p>
                      <p className={`text-xl font-bold ${hasDiscrepancy ? "text-red-600" : "text-emerald-600"}`}>
                        {hasDiscrepancy ? `-${tx.inbound_qty - tx.outbound_qty}` : "✓"}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const dispLog = logs.find(l => l.action === "DISPATCHED" || l.action === "DISPATCHED_WITH_DISCREPANCY");
                    return (
                      <>
                        <InfoRow label="Dispatched By" value={dispLog?.operator_name} />
                        <InfoRow label="Dispatch Time" value={fmt(dispLog?.created_at)} />
                        {tx.discrepancy_note && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-1.5">
                              <AlertTriangle size={14} className="text-red-500" />
                              <span className="text-xs font-bold text-red-700">Discrepancy Note</span>
                            </div>
                            <p className="text-sm text-red-700 leading-relaxed">{tx.discrepancy_note}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-4">

          {/* Workflow Journey */}
          <Section title="Workflow Journey" icon={ArrowRight} defaultOpen={true}>
            <div className="space-y-0">
              {stageTimeline.map(({ stage, log, duration }, i) => {
                const cfg = STAGE_CONFIG[stage];
                const isReached = log != null;
                const isCurrent = tx.status === stage;
                const isPast = STAGES.indexOf(stage) < STAGES.indexOf(tx.status);

                return (
                  <div key={stage} className="flex gap-3">
                    {/* Timeline column */}
                    <div className="flex flex-col items-center w-8 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        isReached
                          ? `${cfg.color} border-transparent text-white`
                          : "bg-gray-100 border-gray-200"
                      } ${isCurrent ? `ring-2 ${cfg.ring} ring-offset-1` : ""}`}>
                        {isPast ? <CheckCircle size={14} /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      {i < stageTimeline.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-1 mb-1 min-h-[24px] ${isReached && stageTimeline[i + 1].log ? cfg.color : "bg-gray-200"}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-4 ${i === stageTimeline.length - 1 ? "" : ""}`}>
                      <div className={`rounded-xl p-3 ${isReached ? cfg.light + " border border-" + cfg.ring.replace("ring-", "") : "bg-gray-50 border border-gray-100"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`text-sm font-bold ${isReached ? cfg.text : "text-gray-400"}`}>{stage}</p>
                            {log && (
                              <>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <User size={12} className="text-gray-400" />
                                  <span className="text-xs text-gray-600 font-medium">{log.operator_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Clock size={12} className="text-gray-400" />
                                  <span className="text-xs text-gray-500">{fmtShort(log.created_at)}</span>
                                </div>
                              </>
                            )}
                            {!isReached && <p className="text-xs text-gray-400 mt-0.5">Pending</p>}
                          </div>
                          {duration && (
                            <div className="text-right flex-shrink-0 ml-2">
                              <span className="text-xs text-gray-400">Duration</span>
                              <p className="text-sm font-bold text-gray-700">{duration}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Full Audit Timeline */}
          <Section title={`Audit Timeline (${logs.length} events)`} icon={Clock} defaultOpen={false}>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No audit entries</p>
            ) : (
              <div className="space-y-2">
                {[...logs].reverse().map((log) => {
                  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.STATUS_CHANGED;
                  return (
                    <div key={log.id} className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0 pb-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${cfg.bg} ${cfg.text} mb-1`}>
                              {cfg.label}
                            </span>
                            {log.previous_status && log.new_status && (
                              <span className="ml-1.5 text-xs text-gray-400">
                                {log.previous_status} → {log.new_status}
                              </span>
                            )}
                            {log.details && (
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{log.details}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-gray-700">{log.operator_name}</p>
                            <p className="text-xs text-gray-400">{fmtShort(log.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Image Modal */}
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}
    </div>
  );
}
