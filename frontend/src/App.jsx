import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, PackagePlus, Send, History,
  Menu, X, ChevronRight, Users, LogOut, Shield, Archive,
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ReceiveForm from "./pages/ReceiveForm";
import DispatchValidation from "./pages/DispatchValidation";
import AuditLog from "./pages/AuditLog";
import TransactionDetail from "./pages/TransactionDetail";
import UserManagement from "./pages/UserManagement";
import DispatchedHistory from "./pages/DispatchedHistory";

function buildNavGroups(isAdmin) {
  const groups = [
    {
      label: null,
      items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard", exact: true }],
    },
    {
      label: "Workflow",
      items: [
        { to: "/receive",  icon: PackagePlus, label: "Receive"  },
        { to: "/dispatch", icon: Send,        label: "Dispatch" },
      ],
    },
    {
      label: "Reports",
      items: [
        { to: "/dispatched", icon: Archive, label: "Dispatched"    },
        { to: "/history",    icon: History, label: "Audit History" },
      ],
    },
  ];
  if (isAdmin) {
    groups.push({
      label: "Admin",
      items: [{ to: "/users", icon: Users, label: "Users" }],
    });
  }
  return groups;
}

function NavLink({ to, icon: Icon, label, exact, onNavigate }) {
  const { pathname } = useLocation();
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
        active
          ? "bg-sky-500 text-white shadow-sm"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
    </Link>
  );
}

function Sidebar({ onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const navGroups = buildNavGroups(isAdmin);

  const handleLogout = () => {
    logout();
    navigate("/login");
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">CS</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">CSSD-Flow</p>
            <p className="text-xs text-gray-400 mt-0.5">Sterilization Tracker</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.to} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {isAdmin
              ? <Shield size={14} className="text-sky-600" />
              : <span className="text-sky-600 text-xs font-bold">{user?.full_name?.[0]?.toUpperCase() || "U"}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 shadow-xl
          transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:shadow-none lg:flex-shrink-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
        >
          <X size={18} />
        </button>
        <Sidebar onNavigate={close} />
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">CS</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">CSSD-Flow</span>
          </div>
          {user && (
            <div className="text-xs text-gray-400 truncate max-w-[100px] text-right hidden sm:block">
              {user.full_name}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-5 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/receive" element={<ProtectedRoute><Layout><ReceiveForm /></Layout></ProtectedRoute>} />
          <Route path="/dispatch" element={<ProtectedRoute><Layout><DispatchValidation /></Layout></ProtectedRoute>} />
          <Route path="/dispatch/:id" element={<ProtectedRoute><Layout><DispatchValidation /></Layout></ProtectedRoute>} />
          <Route path="/dispatched" element={<ProtectedRoute><Layout><DispatchedHistory /></Layout></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Layout><AuditLog /></Layout></ProtectedRoute>} />
          <Route path="/transaction/:id" element={<ProtectedRoute><Layout><TransactionDetail /></Layout></ProtectedRoute>} />

          {/* Admin only */}
          <Route path="/users" element={<ProtectedRoute requireAdmin><Layout><UserManagement /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
