import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, ArrowRight, Clock, AlertTriangle,
  RefreshCw, Send, CheckCircle, ExternalLink,
} from "lucide-react";
import { api } from "../api";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

const STALE_HOURS = 4;

function isStalled(tx) {
  return (Date.now() - new Date(tx.updated_at).getTime()) / 3_600_000 > STALE_HOURS;
}

function timeSince(d) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WorkflowQueuePage({
  fromStatus, toStatus, title, description, actionLabel, isDispatch = false,
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmTx, setConfirmTx] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getTransactions({ status: fromStatus }));
    } finally {
      setLoading(false);
    }
  }, [fromStatus]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAction = (tx) => {
    if (isDispatch) { navigate(`/dispatch/${tx.id}`); return; }
    setConfirmTx(tx);
  };

  const handleConfirm = async () => {
    const tx = confirmTx;
    setConfirmTx(null);
    setProcessing(tx.id);
    try {
      await api.updateStatus(tx.id, toStatus);
      setSuccessId(tx.id);
      setTimeout(() => setSuccessId(null), 2000);
      await fetchItems();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const stalledItems = items.filter(isStalled);

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-400 mt-0.5 hidden sm:block">{description}</p>
        </div>
        <button onClick={fetchItems} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stall Warning */}
      {stalledItems.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700">
              {stalledItems.length} item{stalledItems.length > 1 ? "s" : ""} stalled — over {STALE_HOURS}h with no movement
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{stalledItems.map((t) => t.set_name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Count badge */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500 font-medium">{items.length} item{items.length !== 1 ? "s" : ""} in queue</p>
          <StatusBadge status={fromStatus} />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 md:py-20">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-semibold">Queue is empty</p>
          <p className="text-sm text-gray-300 mt-1">No items currently in {fromStatus} stage</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tx) => {
            const stalled = isStalled(tx);
            return (
              <div
                key={tx.id}
                className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
                  successId === tx.id ? "border-emerald-300 bg-emerald-50/30"
                  : stalled ? "border-amber-300 bg-amber-50/20"
                  : "border-gray-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  {tx.inbound_image ? (
                    <img src={tx.inbound_image} alt="" className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-gray-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate text-sm">{tx.set_name}</span>
                      {stalled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                          <Clock size={10} /> Stalled
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                      <span className="truncate max-w-[120px] sm:max-w-none">{tx.department}</span>
                      <span>Qty: <strong className="text-gray-700">{tx.inbound_qty}</strong></span>
                      <span className={stalled ? "text-amber-600 font-semibold" : ""}>{timeSince(tx.updated_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/transaction/${tx.id}`)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors min-h-[40px]"
                      title="View details"
                    >
                      <ExternalLink size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(tx)}
                      disabled={processing === tx.id}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 min-h-[44px] ${
                        isDispatch ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-sky-500 text-white hover:bg-sky-600"
                      }`}
                    >
                      {processing === tx.id
                        ? <RefreshCw size={15} className="animate-spin" />
                        : isDispatch
                        ? <><Send size={14} /><span className="hidden sm:inline">{actionLabel}</span></>
                        : <><ArrowRight size={14} /><span className="hidden sm:inline">{actionLabel}</span></>
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTx}
        title={`Confirm: ${actionLabel}`}
        message={`Move "${confirmTx?.set_name}" (${confirmTx?.inbound_qty} items · ${confirmTx?.department})\n${fromStatus} → ${toStatus}`}
        confirmLabel={actionLabel}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTx(null)}
      />
    </div>
  );
}
