import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle, Package, ChevronRight,
  ArrowLeft, Clock, ArrowRight, ExternalLink,
} from "lucide-react";
import { api } from "../api";
import ImageCapture from "../components/ImageCapture";
import StatusBadge from "../components/StatusBadge";

function DetailRow({ label, value, large, muted }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-right max-w-[58%] break-words ${large ? "text-xl md:text-2xl font-bold text-sky-600" : muted ? "text-sm text-gray-400" : "text-sm font-medium text-gray-800"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function timeSince(d) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DispatchValidation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [readyItems, setReadyItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [txLogs, setTxLogs] = useState([]);
  const [outQty, setOutQty] = useState("");
  const [outImage, setOutImage] = useState(null);
  const [discNote, setDiscNote] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const items = await api.getTransactions({ status: "READY" });
        setReadyItems(items);
        if (id) {
          const found = items.find((i) => i.id === parseInt(id));
          if (found) { setSelected(found); loadLogs(found.id); }
          else {
            try {
              const d = await api.getTransaction(parseInt(id));
              if (d.status === "READY") { setSelected(d); loadLogs(d.id); }
            } catch {}
          }
        }
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const loadLogs = async (txId) => {
    try { setTxLogs(await api.getTransactionAuditLogs(txId)); } catch {}
  };

  const selectItem = (tx) => {
    setSelected(tx); loadLogs(tx.id);
    setOutQty(""); setOutImage(null); setDiscNote(""); setErrors({});
  };

  const parsedQty = parseInt(outQty) || 0;
  const hasDiscrepancy = selected != null && parsedQty > 0 && parsedQty < selected.inbound_qty;
  const discrepancyCount = selected ? selected.inbound_qty - parsedQty : 0;

  const validate = () => {
    const e = {};
    if (!outQty || parsedQty < 1) e.qty = "Outbound quantity must be at least 1";
    if (!outImage) e.image = "Outbound photo is mandatory";
    if (hasDiscrepancy && !discNote.trim()) e.note = "Discrepancy note required when quantity is less than received";
    return e;
  };

  const handleDispatch = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await api.dispatchTransaction(selected.id, {
        outbound_qty: parsedQty, outbound_image: outImage,
        discrepancy_note: discNote.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setErrors({ submit: err.message });
      setSubmitting(false);
    }
  };

  if (success) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle size={36} className="text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Dispatched Successfully</h2>
      <p className="text-gray-400">Audit log updated. Returning...</p>
    </div>
  );

  if (loading) return (
    <div className="space-y-3 max-w-5xl">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
    </div>
  );

  /* ── Selection Screen ── */
  if (!selected) return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dispatch</h1>
        <p className="text-sm text-gray-400 mt-0.5">Select a READY item to begin validation</p>
      </div>
      {readyItems.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-semibold">No items ready for dispatch</p>
          <button onClick={() => navigate("/ready")} className="mt-4 px-5 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold min-h-[48px]">
            Go to Ready Queue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {readyItems.map((tx) => (
            <button key={tx.id} onClick={() => selectItem(tx)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all text-left min-h-[72px]">
              {tx.inbound_image
                ? <img src={tx.inbound_image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={18} className="text-gray-300" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">{tx.set_name}</p>
                <p className="text-xs text-gray-400">{tx.department} · Qty: {tx.inbound_qty}</p>
              </div>
              <StatusBadge status={tx.status} />
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Dispatch Validation Screen ── */
  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-700 font-semibold min-h-[44px]">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">Dispatch Validation</h1>
          <p className="text-xs md:text-sm text-gray-400">Compare inbound reference against outbound delivery</p>
        </div>
        <button onClick={() => navigate(`/transaction/${selected.id}`)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 min-h-[40px]">
          <ExternalLink size={13} /> Details
        </button>
      </div>

      {/* Comparison — side-by-side desktop, stacked mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT: Inbound Reference */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inbound Reference</h2>
              <StatusBadge status={selected.status} />
            </div>
            {selected.inbound_image && (
              <img src={selected.inbound_image} alt="Inbound" className="w-full h-44 md:h-52 object-cover rounded-xl border border-gray-100" />
            )}
            <div>
              <DetailRow label="Set Name" value={selected.set_name} />
              <DetailRow label="Department" value={selected.department} />
              <DetailRow label="Received Qty" value={selected.inbound_qty} large />
              {selected.notes && <DetailRow label="Notes" value={selected.notes} />}
              <DetailRow label="Received" value={timeSince(selected.created_at)} muted />
            </div>
          </div>

          {/* Audit trail mini */}
          {txLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">History</h2>
              <div className="space-y-2">
                {txLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400">{log.operator_name} · {timeSince(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Dispatch Entry */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dispatch Details</h2>

          {/* Outbound Qty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Outbound Quantity <span className="text-red-500">*</span>
            </label>
            <input type="number" min="1" value={outQty}
              onChange={(e) => { setOutQty(e.target.value); setErrors((er) => ({ ...er, qty: undefined })); }}
              placeholder="0"
              className={`w-full px-4 py-4 border-2 rounded-xl text-3xl font-bold text-center focus:outline-none transition-all min-h-[72px] ${
                hasDiscrepancy ? "border-red-500 bg-red-50 text-red-600 focus:ring-2 focus:ring-red-300"
                : errors.qty ? "border-red-400" : "border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              }`}
            />
            {hasDiscrepancy && (
              <div className="flex items-start gap-2 mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-bold">Quantity Mismatch</p>
                  <p className="text-red-500 text-xs mt-0.5">
                    {discrepancyCount} item{discrepancyCount !== 1 ? "s" : ""} unaccounted — received {selected.inbound_qty}, dispatching {parsedQty}
                  </p>
                </div>
              </div>
            )}
            {!hasDiscrepancy && parsedQty > 0 && parsedQty >= selected.inbound_qty && (
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle size={15} className="text-emerald-500" />
                <p className="text-emerald-600 text-sm font-semibold">Full set — quantities match</p>
              </div>
            )}
            {errors.qty && <p className="text-red-500 text-xs mt-1">{errors.qty}</p>}
          </div>

          {/* Photo */}
          <div>
            <ImageCapture value={outImage}
              onChange={(v) => { setOutImage(v); setErrors((er) => ({ ...er, image: undefined })); }}
              label="Outbound Photo" required />
            {errors.image && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle size={12} /> {errors.image}</p>}
          </div>

          {/* Discrepancy Note */}
          {hasDiscrepancy && (
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1.5">
                Discrepancy Note <span className="text-red-500">*</span>
              </label>
              <textarea value={discNote} rows={3}
                onChange={(e) => { setDiscNote(e.target.value); setErrors((er) => ({ ...er, note: undefined })); }}
                placeholder="Explain the missing items..."
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none ${errors.note ? "border-red-500 bg-red-50" : "border-red-300 bg-red-50/50"}`}
              />
              {errors.note && <p className="text-red-500 text-xs mt-1">{errors.note}</p>}
            </div>
          )}

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0" /> {errors.submit}
            </div>
          )}

          {/* Submit — sticky on mobile */}
          <div className="sticky bottom-4 lg:static">
            <button onClick={handleDispatch} disabled={submitting}
              className={`w-full py-4 font-bold rounded-xl transition-colors disabled:opacity-60 text-lg min-h-[56px] shadow-lg lg:shadow-none ${
                hasDiscrepancy ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}>
              {submitting ? "Processing..." : hasDiscrepancy ? "Confirm Dispatch with Discrepancy" : "Confirm Dispatch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
