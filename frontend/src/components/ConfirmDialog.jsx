import { AlertTriangle, CheckCircle } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  danger = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
              danger ? "bg-red-100" : "bg-sky-100"
            }`}
          >
            {danger ? (
              <AlertTriangle size={20} className="text-red-500" />
            ) : (
              <CheckCircle size={20} className="text-sky-500" />
            )}
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-bold text-gray-900 text-base">{title}</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-sky-500 hover:bg-sky-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
