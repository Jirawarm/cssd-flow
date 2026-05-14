const STATUS_CONFIG = {
  RECEIVED:    { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  WASHING:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
  STERILIZING: { bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500"  },
  READY:       { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  DISPATCHED:  { bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400"    },
};

export default function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.RECEIVED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {status}
    </span>
  );
}
