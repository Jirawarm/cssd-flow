import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { api } from "../api";
import ImageCapture from "../components/ImageCapture";

const DEPARTMENTS = [
  "Operating Theatre",
  "Emergency Department",
  "Intensive Care Unit",
  "Maternity Ward",
  "Orthopaedics",
  "General Surgery",
  "Paediatrics",
  "Cardiology",
  "Urology",
  "Other",
];

const INITIAL_FORM = {
  department: "",
  set_name: "",
  inbound_qty: "",
  notes: "",
};

export default function ReceiveForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.department) e.department = "Department is required";
    if (!form.set_name.trim()) e.set_name = "Set name is required";
    const qty = parseInt(form.inbound_qty);
    if (!form.inbound_qty || isNaN(qty) || qty < 1) e.inbound_qty = "Quantity must be at least 1";
    if (!image) e.image = "A photo is mandatory for every inbound transaction";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await api.createTransaction({
        department: form.department,
        set_name: form.set_name.trim(),
        inbound_qty: parseInt(form.inbound_qty),
        inbound_image: image,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 1800);
    } catch (err) {
      setErrors({ submit: err.message });
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Transaction Recorded</h2>
        <p className="text-gray-400">Audit log created. Returning to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receive Items</h1>
        <p className="text-sm text-gray-400 mt-0.5">Record an incoming instrument set with photographic evidence</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            value={form.department}
            onChange={setField("department")}
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white appearance-none ${
              errors.department ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
          >
            <option value="">Select department...</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
        </div>

        {/* Set Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Set Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.set_name}
            onChange={setField("set_name")}
            placeholder="e.g. General Surgery Set A, Laparotomy Tray 3"
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 ${
              errors.set_name ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
          />
          {errors.set_name && <p className="text-red-500 text-xs mt-1">{errors.set_name}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Quantity Received <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={form.inbound_qty}
            onChange={setField("inbound_qty")}
            placeholder="0"
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 ${
              errors.inbound_qty ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
          />
          {errors.inbound_qty && <p className="text-red-500 text-xs mt-1">{errors.inbound_qty}</p>}
        </div>

        {/* Image Capture */}
        <div>
          <ImageCapture value={image} onChange={setImage} label="Inbound Photo" required />
          {errors.image && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.image}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={setField("notes")}
            rows={3}
            placeholder="Condition remarks, special handling instructions..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
          />
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base"
        >
          {submitting ? "Saving & Creating Audit Log..." : "Record Inbound Transaction"}
        </button>
      </form>
    </div>
  );
}
