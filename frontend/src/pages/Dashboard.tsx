import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Activity, AlertTriangle, CheckCircle, Clock, Truck, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Metrics {
  totalActiveVehicles: number;
  servicesDue: number;
  overdueServices: number;
  bookedServices: number;
  inServiceServices: number;
  completedServices: number;
  technicianBreakdown: Array<{
    technicianId: string;
    technicianName: string;
    assignedCount: number;
  }>;
  weeklyCompletions: Array<{
    weekStart: string;
    weekLabel: string;
    count: number;
  }>;
}

interface Alert {
  id: string;
  vehicleId: string;
  serviceRecordId: string;
  isDismissed: boolean;
  createdAt: string;
  vehicle: { registration: string };
  serviceRecord: { status: string; description: string };
}

export const Dashboard = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/alerts')
      ]);
      setMetrics(metricsRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDismissAlert = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/dismiss`);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to dismiss alert', err);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-white text-slate-950 shadow">
            <div className="flex flex-row items-center justify-between p-6 space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Active Vehicles</h3>
              <Truck className="h-4 w-4 text-slate-500" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">{metrics.totalActiveVehicles}</div>
            </div>
          </div>
          <div className="rounded-xl border bg-white text-slate-950 shadow">
            <div className="flex flex-row items-center justify-between p-6 space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-red-600">Overdue Services</h3>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold text-red-600">{metrics.overdueServices}</div>
            </div>
          </div>
          <div className="rounded-xl border bg-white text-slate-950 shadow">
            <div className="flex flex-row items-center justify-between p-6 space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-orange-600">Services Due</h3>
              <Calendar className="h-4 w-4 text-orange-600" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold text-orange-600">{metrics.servicesDue}</div>
            </div>
          </div>
          <div className="rounded-xl border bg-white text-slate-950 shadow">
            <div className="flex flex-row items-center justify-between p-6 space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-blue-600">Booked</h3>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold text-blue-600">{metrics.bookedServices}</div>
            </div>
          </div>
          <div className="rounded-xl border bg-white text-slate-950 shadow">
            <div className="flex flex-row items-center justify-between p-6 space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-purple-600">In Service</h3>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold text-purple-600">{metrics.inServiceServices}</div>
            </div>
          </div>
          <div className="rounded-xl border bg-white text-slate-950 shadow">
            <div className="flex flex-row items-center justify-between p-6 space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-green-600">Completed (History)</h3>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold text-green-600">{metrics.completedServices}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
        {/* 8-Week Chart */}
        <div className="rounded-xl border bg-white p-6 shadow flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Completed Services (Last 8 Weeks)</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.weeklyCompletions || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Completed Services" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technician Workload */}
        <div className="rounded-xl border bg-white p-6 shadow flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Technician Workload</h2>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Technician</th>
                  <th className="px-4 py-3 font-medium text-right">Assigned Records</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.technicianBreakdown?.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                      No technician data available.
                    </td>
                  </tr>
                )}
                {metrics?.technicianBreakdown?.map((tech) => (
                  <tr key={tech.technicianId} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{tech.technicianName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {tech.assignedCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
        {alerts.length === 0 ? (
          <div className="text-sm text-slate-500 bg-slate-50 p-6 text-center border border-dashed rounded-md">
            No active alerts at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-md">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-red-900">Vehicle: {alert.vehicle.registration}</h4>
                    <p className="text-sm text-red-700">Record: {alert.serviceRecord.description}</p>
                    <p className="text-xs text-red-500 mt-1">Generated: {new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDismissAlert(alert.id)}>Dismiss</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
