import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Activity, Edit3, UserPlus, UserMinus, ArrowRight } from 'lucide-react';

interface AuditEvent {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  userId: string;
}

interface Props {
  recordId: string;
}

export const AuditTimeline = ({ recordId }: Props) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await api.get(`/service-records/${recordId}/audit`);
        setEvents(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load audit history');
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [recordId]);

  if (loading) return <div className="text-sm text-slate-500 py-4">Loading history...</div>;
  if (error) return <div className="text-sm text-red-500 py-4">{error}</div>;
  if (events.length === 0) return <div className="text-sm text-slate-500 py-4">No history found.</div>;

  const getIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'STATUS_CHANGED': return <ArrowRight className="h-4 w-4 text-amber-500" />;
      case 'ASSIGNED': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'UNASSIGNED': return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'NOTE_ADDED': return <Edit3 className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatValue = (action: string, val: string | null) => {
    if (!val) return 'None';
    if (action === 'STATUS_CHANGED' || action === 'CREATED') return val;
    if (action === 'ASSIGNED' || action === 'UNASSIGNED') return `Tech: ${val.substring(0, 8)}...`;
    return val;
  };

  return (
    <div className="flow-root mt-4">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                    {getIcon(event.action)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-900 font-medium">
                      {event.action.replace('_', ' ')}
                    </p>
                    <div className="mt-1 text-sm text-slate-500">
                      {event.oldValue && (
                        <span className="line-through mr-2">{formatValue(event.action, event.oldValue)}</span>
                      )}
                      {event.newValue && (
                        <span className="font-medium text-slate-700">{formatValue(event.action, event.newValue)}</span>
                      )}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-slate-500 flex flex-col items-end">
                    <span>{format(new Date(event.timestamp), 'MMM d, h:mm a')}</span>
                    <span className="mt-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{event.userId.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
