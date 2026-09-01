import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, LayoutDashboard, CalendarClock, LogOut } from 'lucide-react';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Vehicles', path: '/vehicles', icon: Truck, role: 'MANAGER' },
    { name: 'Service Records', path: '/service-records', icon: CalendarClock },
  ];

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <span className="text-xl font-bold tracking-tight text-slate-900">FleetSync</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems
            .filter((item) => !item.role || item.role === user?.role)
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-sm font-medium">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-900">{user?.email}</span>
              <span className="text-xs text-slate-500">{user?.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
