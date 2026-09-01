import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { VehicleForm } from '../components/vehicles/VehicleForm';

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  currentOdometer: number;
  dateIntervalDays: number;
  mileageInterval: number;
  isArchived: boolean;
}

export const Vehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>(undefined);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/vehicles?includeArchived=${showArchived}`);
      setVehicles(res.data);
    } catch (error) {
      console.error('Failed to fetch vehicles', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [showArchived]);

  if (user?.role !== 'MANAGER') {
    return <div className="p-8 text-center text-slate-500">You do not have access to manage the fleet.</div>;
  }

  const handleEdit = (v: Vehicle) => {
    setSelectedVehicle(v);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedVehicle(undefined);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchVehicles();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fleet Vehicles</h1>
          <p className="text-sm text-slate-500">Manage your company's vehicles and service intervals.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            Show Archived
          </label>
          <Button onClick={handleAdd}>Add Vehicle</Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-md w-full"></div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Registration</th>
                <th className="px-6 py-4">Make & Model</th>
                <th className="px-6 py-4">Odometer</th>
                <th className="px-6 py-4">Intervals</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{v.registration}</td>
                  <td className="px-6 py-4">{v.make} {v.model}</td>
                  <td className="px-6 py-4">{v.currentOdometer.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {v.dateIntervalDays}d / {v.mileageInterval.toLocaleString()}m
                  </td>
                  <td className="px-6 py-4">
                    {v.isArchived ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Archived</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(v)}>Edit</Button>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No vehicles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <VehicleForm
          initialData={selectedVehicle}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
