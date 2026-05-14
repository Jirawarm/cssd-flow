import { useState, useEffect } from "react";
import {
  Users, UserPlus, Shield, Check, X, RefreshCw,
  Lock, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Eye, EyeOff,
} from "lucide-react";
import { api } from "../api";

const PERMISSION_MATRIX = [
  { feature: "View Dashboard & Stats",         user: true,  admin: true  },
  { feature: "Receive Items (Inbound)",         user: true,  admin: true  },
  { feature: "Washing Queue — Advance",         user: true,  admin: true  },
  { feature: "Sterilizing Queue — Advance",     user: true,  admin: true  },
  { feature: "Ready Queue — Advance",           user: true,  admin: true  },
  { feature: "Dispatch Validation",             user: true,  admin: true  },
  { feature: "Transaction Detail & Photos",     user: true,  admin: true  },
  { feature: "Audit History & Reports",         user: true,  admin: true  },
  { feature: "User Management",                 user: false, admin: true  },
  { feature: "Create / Edit Users",             user: false, admin: true  },
  { feature: "Activate / Deactivate Users",     user: false, admin: true  },
  { feature: "Reset User Passwords",            user: false, admin: true  },
  { feature: "Change User Roles",               user: false, admin: true  },
];

function RoleBadge({ role }) {
  return role === "admin"
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold"><Shield size={11} /> Admin</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold"><Users size={11} /> User</span>;
}

function PermIcon({ yes }) {
  return yes
    ? <Check size={15} className="text-emerald-500 mx-auto" />
    : <X size={15} className="text-gray-300 mx-auto" />;
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: "", full_name: "", password: "", role: "user" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const user = await api.createUser(form);
      onCreated(user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username <span className="text-red-500">*</span></label>
            <input required value={form.username} onChange={set("username")} placeholder="e.g. nurse_jane"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            <p className="text-xs text-gray-400 mt-1">Letters, numbers, underscores only</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
            <input required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Jane Smith"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input required type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                placeholder="Min 6 characters" minLength={6}
                className="w-full px-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select value={form.role} onChange={set("role")}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white">
              <option value="user">User — Standard access</option>
              <option value="admin">Admin — Full access</option>
            </select>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 min-h-[48px]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 min-h-[48px]">
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.resetPassword(user.id, password);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Set a new password for <strong>{user.full_name}</strong></p>
        {done ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm font-semibold">
            <Check size={16} /> Password updated successfully
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input required type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 6 chars)" minLength={6}
                className="w-full px-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 min-h-[48px]" />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold disabled:opacity-60">
                {saving ? "Saving..." : "Reset"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      setUsers(await api.getUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleActive = async (user) => {
    setToggling(user.id);
    try {
      const updated = await api.toggleUserActive(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  };

  const handleRoleChange = async (user, role) => {
    try {
      const updated = await api.updateUser(user.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage accounts and access permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers}
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold transition-colors min-h-[44px]">
            <UserPlus size={16} /> <span className="hidden sm:inline">Add User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Users Table / Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No users found</div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[1fr_160px_100px_120px_120px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span>User</span>
              <span>Role</span>
              <span className="text-center">Status</span>
              <span className="text-center">Password</span>
              <span className="text-center">Active</span>
            </div>

            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user.id} className={`px-4 md:px-5 py-4 ${!user.is_active ? "opacity-60" : ""}`}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_160px_100px_120px_120px] gap-4 items-center">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{user.full_name}</p>
                      <p className="text-xs text-gray-400 font-mono">@{user.username}</p>
                      {user.last_login && (
                        <p className="text-xs text-gray-300 mt-0.5">
                          Last login: {new Date(user.last_login).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div>
                      <select value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-sky-300">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="text-center">
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="text-center">
                      <button onClick={() => setResetUser(user)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-300 mx-auto min-h-[36px]">
                        <Lock size={12} /> Reset
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button onClick={() => handleToggleActive(user)} disabled={toggling === user.id}
                        className={`p-1.5 rounded-lg transition-colors ${user.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-50"} disabled:opacity-50`}
                        title={user.is_active ? "Deactivate" : "Activate"}>
                        {toggling === user.id
                          ? <RefreshCw size={20} className="animate-spin" />
                          : user.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />
                        }
                      </button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">@{user.username}</p>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={user.role} onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={() => setResetUser(user)}
                        className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 min-h-[44px]">
                        <Lock size={14} /> Reset PW
                      </button>
                      <button onClick={() => handleToggleActive(user)} disabled={toggling === user.id}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] ${
                          user.is_active ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-gray-50 text-gray-500 border border-gray-200"
                        } disabled:opacity-50`}>
                        {user.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {user.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowMatrix((s) => !s)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-sky-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Permission Matrix</p>
              <p className="text-xs text-gray-400">What each role can access</p>
            </div>
          </div>
          {showMatrix ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showMatrix && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-widest">Feature</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-widest w-28">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users size={12} /> User
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 font-bold text-sky-500 text-xs uppercase tracking-widest w-28">
                    <div className="flex items-center justify-center gap-1.5">
                      <Shield size={12} /> Admin
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {PERMISSION_MATRIX.map((row, i) => (
                  <tr key={i} className={`hover:bg-gray-50/50 ${!row.user && !row.admin ? "" : ""}`}>
                    <td className="px-5 py-3 text-gray-700 text-sm">{row.feature}</td>
                    <td className="px-4 py-3 text-center"><PermIcon yes={row.user} /></td>
                    <td className="px-4 py-3 text-center"><PermIcon yes={row.admin} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={(u) => setUsers((prev) => [...prev, u])}
        />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}
    </div>
  );
}
