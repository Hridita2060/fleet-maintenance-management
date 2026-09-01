import { PrismaClient, Status } from '@prisma/client';
import { calculateIsDue } from './dueLogic';

const prisma = new PrismaClient();

export async function checkVehicleDueState(vehicleId: string): Promise<boolean> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      serviceRecords: {
        orderBy: { completionDate: 'desc' },
      }
    }
  });

  if (!vehicle) return false;

  const hasOpenRecord = vehicle.serviceRecords.some(r => r.status !== Status.COMPLETED);
  const lastCompleted = vehicle.serviceRecords.find(r => r.status === Status.COMPLETED);
  
  // For simplicity, vehicle creation date fallback is Epoch
  const vehicleCreationDate = new Date(0);

  return calculateIsDue(
    vehicle.currentOdometer,
    vehicle.dateIntervalDays,
    vehicle.mileageInterval,
    lastCompleted?.completionDate || null,
    lastCompleted?.completionOdometer || null,
    vehicleCreationDate,
    hasOpenRecord
  );
}
