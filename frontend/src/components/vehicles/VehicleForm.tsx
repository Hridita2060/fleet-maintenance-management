import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const vehicleSchema = z.object({
  registration: z.string().min(1, 'Registration is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  currentOdometer: z.coerce.number().int().nonnegative('Must be non-negative'),
  dateIntervalDays: z.coerce.number().int().positive('Must be positive'),
  mileageInterval: z.coerce.number().int().positive('Must be positive'),
  isArchived: z.boolean().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface Props {
  initialData?: VehicleFormValues & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

export const VehicleForm = ({ initialData, onClose, onSuccess }: Props) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initialData || {
      isArchived: false,
    },
  });

  const onSubmit = async (data: VehicleFormValues) => {
    try {
      if (initialData?.id) {
        await api.patch(`/vehicles/${initialData.id}`, data);
      } else {
        await api.post('/vehicles', data);
      }
      onSuccess();
    } catch (error: any) {
      if (error.response?.status === 409) {
        setError('registration', { message: 'Registration already exists' });
      } else if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData?.id ? 'Edit Vehicle' : 'Add Vehicle'}
          </h2>
          <p className="text-sm text-slate-500">
            {initialData?.id ? 'Update the details for this vehicle.' : 'Enter details to register a new vehicle.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Registration Number</label>
            <Input {...register('registration')} className="mt-1" />
            {errors.registration && <p className="text-sm text-red-500 mt-1">{errors.registration.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Make</label>
              <Input {...register('make')} className="mt-1" />
              {errors.make && <p className="text-sm text-red-500 mt-1">{errors.make.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Model</label>
              <Input {...register('model')} className="mt-1" />
              {errors.model && <p className="text-sm text-red-500 mt-1">{errors.model.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Current Odometer</label>
            <Input type="number" {...register('currentOdometer')} className="mt-1" />
            {errors.currentOdometer && <p className="text-sm text-red-500 mt-1">{errors.currentOdometer.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Date Interval (Days)</label>
              <Input type="number" {...register('dateIntervalDays')} className="mt-1" />
              {errors.dateIntervalDays && <p className="text-sm text-red-500 mt-1">{errors.dateIntervalDays.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mileage Interval</label>
              <Input type="number" {...register('mileageInterval')} className="mt-1" />
              {errors.mileageInterval && <p className="text-sm text-red-500 mt-1">{errors.mileageInterval.message}</p>}
            </div>
          </div>

          {initialData?.id && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <input type="checkbox" id="isArchived" {...register('isArchived')} className="rounded text-slate-900 focus:ring-slate-900" />
              <label htmlFor="isArchived" className="text-sm font-medium text-slate-700">Archive Vehicle</label>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Vehicle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
