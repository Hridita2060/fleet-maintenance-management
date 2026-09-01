import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { BookServiceModal } from '../components/serviceRecords/BookServiceModal';
import { AuditTimeline } from '../components/serviceRecords/AuditTimeline';

interface ServiceRecord {
  id: string;
  vehicleId: string;
  description: string;
  status: 'DUE' | 'BOOKED' | 'IN_SERVICE' | 'COMPLETED';
  scheduledDate: string | null;
  completionDate: string | null;
  vehicle: {
    registration: string;
    make: string;
    model: string;
  };
  assignments: { technicianId: string, technician: { email: string } }[];
}

export const ServiceRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRecordId, setBookingRecordId] = useState<string | null>(null);
  const [auditRecordId, setAuditRecordId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/service-records');
      setRecords(res.data.records);
    } catch (error) {
      console.error('Failed to fetch records', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string, payload: any = {}) => {
    try {
      await api.patch(`/service-records/${id}`, { status: newStatus, ...payload });
      fetchRecords();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      DUE: 'bg-red-50 text-red-700 ring-red-600/20',
      BOOKED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      IN_SERVICE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      COMPLETED: 'bg-green-50 text-green-700 ring-green-600/20',
    };
    const c = colors[status] || 'bg-slate-50 text-slate-700 ring-slate-600/20';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${c}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Service Records</h1>
          <p className="text-sm text-slate-500">Manage vehicle maintenance and lifecycle states.</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-md"></div>)}
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map(record => (
            <div key={record.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 text-lg">{record.vehicle.registration}</h3>
                    <StatusBadge status={record.status} />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">{record.description}</p>
                  <div className="text-sm text-slate-500 space-y-1">
                    <p>Assigned Techs: {record.assignments.map(a => a.technician.email).join(', ') || 'None'}</p>
                    {record.scheduledDate && <p>Scheduled: {format(new Date(record.scheduledDate), 'MMM d, yyyy')}</p>}
                    {record.completionDate && <p>Completed: {format(new Date(record.completionDate), 'MMM d, yyyy')}</p>}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[120px]">
                  {record.status === 'DUE' && user?.role === 'MANAGER' && (
                    <Button size="sm" onClick={() => setBookingRecordId(record.id)}>Book Service</Button>
                  )}
                  {record.status === 'BOOKED' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(record.id, 'IN_SERVICE')}>Start Service</Button>
                  )}
                  {record.status === 'IN_SERVICE' && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const odo = prompt('Enter completion odometer reading:');
                      if (odo) handleUpdateStatus(record.id, 'COMPLETED', { completionOdometer: parseInt(odo) });
                    }}>Complete</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAuditRecordId(record.id)}>View History</Button>
                </div>
              </div>
              
              {/* Show inline timeline if requested */}
              {auditRecordId === record.id && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-slate-900">Audit History</h4>
                    <Button variant="ghost" size="sm" onClick={() => setAuditRecordId(null)}>Close</Button>
                  </div>
                  <AuditTimeline recordId={record.id} />
                </div>
              )}
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center py-12 text-slate-500 border border-dashed rounded-md bg-slate-50">
              No service records found.
            </div>
          )}
        </div>
      )}

      {bookingRecordId && (
        <BookServiceModal 
          recordId={bookingRecordId} 
          onClose={() => setBookingRecordId(null)}
          onSuccess={() => {
            setBookingRecordId(null);
            fetchRecords();
          }}
        />
      )}
    </div>
  );
};
