import { isPast, addDays } from 'date-fns';
import { Status } from '@prisma/client';

export function calculateIsDue(
  currentOdometer: number,
  dateIntervalDays: number,
  mileageInterval: number,
  lastCompletedDate: Date | null,
  lastCompletedOdometer: number | null,
  vehicleCreationDate: Date,
  hasOpenRecord: boolean
): boolean {
  if (hasOpenRecord) return true;

  const baselineDate = lastCompletedDate || vehicleCreationDate;
  const baselineOdo = lastCompletedOdometer || 0;

  const isDateDue = isPast(addDays(baselineDate, dateIntervalDays));
  const isMileageDue = (currentOdometer - baselineOdo) >= mileageInterval;

  return isDateDue || isMileageDue;
}
