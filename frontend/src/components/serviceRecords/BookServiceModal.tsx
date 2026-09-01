import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface User {
  id: string;
  email: string;
}

interface Props {
  recordId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookServiceModal = ({ recordId, onClose, onSuccess }: Props) => {
  const [techs, setTechs] = useState<User[]>([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/users?role=TECHNICIAN').then(res => setTechs(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech || !scheduledDate) return alert('Both fields required');
    
    setSubmitting(true);
    try {
      // 1. Assign tech
      await api.post(`/service-records/${recordId}/assignments`, { technicianId: selectedTech });
      // 2. Update status to booked with date
      await api.patch(`/service-records/${recordId}`, { 
        status: 'BOOKED', 
        scheduledDate: new Date(scheduledDate).toISOString() 
      });
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to book');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Book Service</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Technician</label>
            <select
              value={selectedTech}
              onChange={e => setSelectedTech(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            >
              <option value="">Select a technician...</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Scheduled Date</label>
            <Input 
              type="date" 
              value={scheduledDate} 
              onChange={e => setScheduledDate(e.target.value)} 
              required
              className="mt-1"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Booking...' : 'Book'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
