import { z } from 'zod';
import { Status } from '@prisma/client';

export const createServiceRecordSchema = z.object({
  vehicleId: z.string().uuid(),
  description: z.string().min(1, 'Description is required'),
});

export const updateServiceRecordSchema = z.object({
  description: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
  scheduledDate: z.string().datetime().optional().nullable(),
  completionOdometer: z.coerce.number().int().nonnegative().optional().nullable(),
}).refine(data => {
  if (data.status === Status.BOOKED && !data.scheduledDate) {
    return false;
  }
  return true;
}, {
  message: "Scheduled date is required when booking a service",
  path: ["scheduledDate"]
}).refine(data => {
  if (data.status === Status.COMPLETED && data.completionOdometer === undefined) {
    return false;
  }
  return true;
}, {
  message: "Completion odometer is required when completing a service",
  path: ["completionOdometer"]
});
