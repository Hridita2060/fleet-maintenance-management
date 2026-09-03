import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Button } from '../ui/Button';

interface User {
  id: string;
  email: string;
}

interface Props {
  recordId: string;
  onClose: () => void;
  onSuccess: () => void;
  existingTechIds: string[];
}

export const AssignTechnicianModal = ({ recordId, onClose, onSuccess, existingTechIds }: Props) => {
  const [techs, setTechs] = useState<User[]>([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/users?role=TECHNICIAN').then(res => setTechs(res.data));
  }, []);

  const availableTechs = techs.filter(t => !existingTechIds.includes(t.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech) return alert('Select a technician');
    
    setSubmitting(true);
    try {
      await api.post(`/service-records/${recordId}/assignments`, { technicianId: selectedTech });
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Assign Technician</h2>
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
              {availableTechs.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
            </select>
            {availableTechs.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">All technicians are already assigned.</p>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || availableTechs.length === 0}>
              {submitting ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
