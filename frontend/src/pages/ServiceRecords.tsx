import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { Download, Search, Plus } from 'lucide-react';
import { BookServiceModal } from '../components/serviceRecords/BookServiceModal';
import { AuditTimeline } from '../components/serviceRecords/AuditTimeline';
import { AssignTechnicianModal } from '../components/serviceRecords/AssignTechnicianModal';

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
  const [assignRecord, setAssignRecord] = useState<{ id: string, existingTechs: string[] } | null>(null);

  // Search, Filters, Pagination
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [vehicleId, setVehicleId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Lists for dropdowns
  const [vehicles, setVehicles] = useState<{id: string, registration: string}[]>([]);
  const [technicians, setTechnicians] = useState<{id: string, email: string}[]>([]);

  useEffect(() => {
    api.get('/vehicles').then(res => setVehicles(res.data));
    if (user?.role === 'MANAGER') {
      api.get('/users?role=TECHNICIAN').then(res => setTechnicians(res.data));
    }
  }, [user?.role]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/service-records', {
        params: { search, status, vehicleId, technicianId, sortBy, sortOrder, page, pageSize: 10 }
      });
      setRecords(res.data.records);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch records', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, status, search, vehicleId, technicianId, sortBy, sortOrder]);

  const handleExport = async () => {
    try {
      const res = await api.get('/service-records/export', {
        params: { search, status, vehicleId, technicianId, sortBy, sortOrder },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'service_records.csv');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

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
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Service Records</h1>
          <p className="text-sm text-slate-500">Manage vehicle maintenance and lifecycle states.</p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search description..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full md:w-64 rounded-md border border-slate-200 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <select 
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="DUE">Due</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_SERVICE">In Service</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select 
              className="h-9 rounded-md border border-slate-200 px-3 text-sm max-w-[200px] truncate"
              value={vehicleId}
              onChange={e => { setVehicleId(e.target.value); setPage(1); }}
            >
              <option value="">All Vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}
            </select>
            {user?.role === 'MANAGER' && (
              <select 
                className="h-9 rounded-md border border-slate-200 px-3 text-sm max-w-[200px] truncate"
                value={technicianId}
                onChange={e => { setTechnicianId(e.target.value); setPage(1); }}
              >
                <option value="">All Technicians</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
              </select>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-slate-500">Sort by:</span>
            <select 
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
            >
              <option value="createdAt">Last Updated</option>
              <option value="scheduledDate">Scheduled Date</option>
              <option value="completionDate">Completion Date</option>
              <option value="status">Status</option>
            </select>
            <select 
              className="h-9 rounded-md border border-slate-200 px-3 text-sm"
              value={sortOrder}
              onChange={e => { setSortOrder(e.target.value); setPage(1); }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            
            <div className="flex-grow"></div>
            
            <Button variant="outline" onClick={handleExport} className="h-9">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
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
                  <div className="text-sm text-slate-500 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Assigned Techs:</span>
                      {record.assignments.length === 0 ? (
                        <span>None</span>
                      ) : (
                        record.assignments.map((a) => (
                          <span key={a.technicianId} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                            {a.technician.email}
                            {user?.role === 'MANAGER' && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Remove ${a.technician.email} from this record?`)) {
                                    try {
                                      await api.delete(`/service-records/${record.id}/assignments/${a.technicianId}`);
                                      fetchRecords();
                                    } catch (err: any) {
                                      alert(err.response?.data?.error || 'Failed to remove technician');
                                    }
                                  }
                                }}
                                className="ml-1 text-slate-400 hover:text-red-500 focus:outline-none"
                                title="Remove technician"
                              >
                                &times;
                              </button>
                            )}
                          </span>
                        ))
                      )}
                      {user?.role === 'MANAGER' && record.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setAssignRecord({ id: record.id, existingTechs: record.assignments.map(a => a.technicianId) })}
                          className="ml-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 focus:outline-none"
                          title="Assign another technician"
                        >
                          <Plus className="h-3 w-3" /> Assign Tech
                        </button>
                      )}
                    </div>
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
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
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

      {assignRecord && (
        <AssignTechnicianModal 
          recordId={assignRecord.id}
          existingTechIds={assignRecord.existingTechs}
          onClose={() => setAssignRecord(null)}
          onSuccess={() => {
            setAssignRecord(null);
            fetchRecords();
          }}
        />
      )}
    </div>
  );
};
