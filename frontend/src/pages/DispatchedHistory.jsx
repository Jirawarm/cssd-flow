import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, ExternalLink, RefreshCw, AlertTriangle,
  CheckCircle, Image as ImageIcon, ArrowRight, Search, X,
} from "lucide-react";
import { api } from "../api";
import ImageModal from "../components/ImageModal";

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function PhotoThumb({ src, label, onOpen }) {
  if (!src) return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full bg-gray-50 rounded-lg border border-dashed border-gray-200">
      <ImageIcon size={16} className="text-gray-300" />
      <span className="text-[10px] text-gray-300">{label}</span>
    </div>
  );
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(src); }}
      className="block w-full h-full group relative"
      title={`View ${label}`}
    >
      <img src={src} alt={label} className="w-full h-full object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity" />
      <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity pb-1">
        <span className="text-[10px] text-white font-bold bg-black/50 rounded px-1.5 py-0.5">{label}</span>
      </div>
    </button>
  );
}

export default function DispatchedHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalSrc, setModalSrc] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getTransactions({ status: "DISPATCHED" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = search.trim()
    ? items.filter((tx) =>
        tx.set_name.toLowerCase().includes(search.toLowerCase()) ||
        tx.department.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dispatched Items</h1>
          <p className="text-sm text-gray-400 mt-0.5">Completed jobs — view inbound &amp; outbound photos</p>
        </div>
        <button onClick={fetchItems}
          className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by set name or department..."
          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Count */}
      {!loading && (
        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <p className="text-sm text-gray-500 font-medium">
            {filtered.length} dispatched item{filtered.length !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-semibold">{search ? "No results found" : "No dispatched items yet"}</p>
          <p className="text-sm text-gray-300 mt-1">{search ? "Try a different search term" : "Completed jobs will appear here"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => {
            const hasDisc = tx.discrepancy_note || (tx.outbound_qty != null && tx.outbound_qty < tx.inbound_qty);
            return (
              <div key={tx.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                  hasDisc ? "border-red-200" : "border-gray-200"
                }`}
              >
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                  {/* Photos — side by side */}
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Inbound */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-center">Inbound</span>
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden">
                        <PhotoThumb src={tx.inbound_image} label="Inbound" onOpen={setModalSrc} />
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center pt-5">
                      <ArrowRight size={16} className="text-gray-300" />
                    </div>

                    {/* Outbound */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-center">Outbound</span>
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden">
                        <PhotoThumb src={tx.outbound_image} label="Outbound" onOpen={setModalSrc} />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900 text-sm truncate">{tx.set_name}</span>
                        {hasDisc && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold flex-shrink-0">
                            <AlertTriangle size={10} /> Discrepancy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{tx.department}</p>

                      {/* Qty comparison */}
                      <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        hasDisc ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        <span>Received: <strong>{tx.inbound_qty}</strong></span>
                        <ArrowRight size={10} />
                        <span>Dispatched: <strong className={hasDisc ? "text-red-600" : ""}>{tx.outbound_qty ?? "—"}</strong></span>
                        {hasDisc && <span className="text-red-500">({tx.inbound_qty - (tx.outbound_qty ?? 0)} missing)</span>}
                      </div>

                      {tx.discrepancy_note && (
                        <p className="text-xs text-red-500 mt-1.5 line-clamp-2 italic">"{tx.discrepancy_note}"</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs text-gray-400">Dispatched: {fmt(tx.updated_at)}</p>
                      <button
                        onClick={() => navigate(`/transaction/${tx.id}`)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[36px]"
                      >
                        <ExternalLink size={13} /> Full Detail
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discrepancy note banner */}
                {tx.discrepancy_note && (
                  <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 leading-relaxed">{tx.discrepancy_note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)} />}
    </div>
  );
}
