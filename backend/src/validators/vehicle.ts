import { z } from 'zod';

export const createVehicleSchema = z.object({
  registration: z.string().min(1, 'Registration is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  currentOdometer: z.number().int().nonnegative('Odometer must be non-negative'),
  dateIntervalDays: z.number().int().positive('Date interval must be positive'),
  mileageInterval: z.number().int().positive('Mileage interval must be positive'),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  isArchived: z.boolean().optional(),
});
