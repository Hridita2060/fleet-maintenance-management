import React, { useState } from 'react';
import api from '../../lib/api';
import { Button } from '../ui/Button';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal = ({ onClose, onSuccess }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/vehicles/bulk-odometer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(res.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-xl font-bold">Bulk Odometer Update</h2>
        
        {!results ? (
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-sm font-medium">CSV File</label>
              <p className="text-xs text-slate-500 mb-2">Required headers: registration, odometer</p>
              <input
                type="file"
                accept=".csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="p-4 bg-green-50 rounded-lg flex-1">
                <p className="text-sm text-green-700 font-semibold">Successful</p>
                <p className="text-2xl font-bold text-green-800">{results.successful}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg flex-1">
                <p className="text-sm text-red-700 font-semibold">Failed</p>
                <p className="text-2xl font-bold text-red-800">{results.failed}</p>
              </div>
            </div>
            
            {results.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Errors</h4>
                <ul className="text-sm text-red-600 bg-red-50 p-3 rounded space-y-1">
                  {results.errors.map((e: any, i: number) => (
                    <li key={i}>Row {e.row} ({e.registration}): {e.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-6 flex justify-end pt-2">
              <Button onClick={() => {
                onSuccess();
                onClose();
              }}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
