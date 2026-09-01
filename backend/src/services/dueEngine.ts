import { Vehicle, ServiceRecord, Status } from '@prisma/client';

const GRACE_PERIOD_DAYS = parseInt(process.env.OVERDUE_GRACE_PERIOD_DAYS || '7', 10);

export function calculateDueStatus(vehicle: Vehicle, records: ServiceRecord[]) {
  if (vehicle.isArchived) return { isDue: false, isOverdue: false, reason: 'Archived' };

  // Find the last completed service to establish baseline
  const completedRecords = records
    .filter(r => r.status === Status.COMPLETED && r.completionDate !== null)
    .sort((a, b) => b.completionDate!.getTime() - a.completionDate!.getTime());

  const lastCompleted = completedRecords[0];

  // If there's no completed service, we assume baseline is 0 odometer and long ago date, 
  // so it's likely due if it has any mileage.
  const baselineOdometer = lastCompleted?.completionOdometer || 0;
  // If no completed service, assume it was never serviced, so it's overdue if current > mileageInterval
  // But for date, without vehicle creation date, it's hard. Let's assume baselineDate is far past if not present.
  const baselineDate = lastCompleted?.completionDate || new Date(0); 

  const milesSinceLast = vehicle.currentOdometer - baselineOdometer;
  const daysSinceLast = (Date.now() - baselineDate.getTime()) / (1000 * 60 * 60 * 24);

  const isMileageDue = milesSinceLast >= vehicle.mileageInterval;
  const isDateDue = daysSinceLast >= vehicle.dateIntervalDays;

  const isDue = isMileageDue || isDateDue;

  // Check if overdue (exceeds interval + grace period)
  // For mileage, what is the grace period? The prompt says "date-based due logic works, mileage-based due logic works"
  // and "grace-period rule". Usually grace period is just applied to the date it became due.
  // We can say it's overdue if daysSinceLast >= dateIntervalDays + GRACE_PERIOD_DAYS
  // OR milesSinceLast >= mileageInterval + (no clear mileage grace, so let's just use days? Or we can say if mileage is due, it's overdue after grace period days have passed since it hit that mileage? We don't know when it hit that mileage. Let's just say overdue if date overdue).
  // Actually, let's treat GRACE_PERIOD_DAYS as applying to whichever threshold was crossed.
  // If date-due: daysSinceLast >= dateIntervalDays + GRACE_PERIOD_DAYS
  // If mileage-due: we don't know exactly when mileage was crossed. But let's check if there is an active DUE record that is older than GRACE_PERIOD_DAYS.

  // Let's look for an active open record
  const activeRecord = records.find(r => r.status === Status.DUE || r.status === Status.BOOKED || r.status === Status.IN_SERVICE);

  let isOverdue = false;
  if (activeRecord && activeRecord.status === Status.DUE) {
    // If there is a DUE record, is it overdue?
    // It is overdue if it was created more than GRACE_PERIOD_DAYS ago?
    // "A service should become overdue only according to the application's configured grace-period rule."
    const recordAgeDays = (Date.now() - activeRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (recordAgeDays > GRACE_PERIOD_DAYS) {
      isOverdue = true;
    }
  }

  // If there's no active record, but the vehicle is technically overdue by date?
  // Let's strictly rely on the active DUE record's age for the grace period to be safe, 
  // OR the vehicle's dateIntervalDays + grace.
  if (!activeRecord && daysSinceLast >= (vehicle.dateIntervalDays + GRACE_PERIOD_DAYS)) {
    isOverdue = true;
  }
  
  // Future scheduled/booked services are not incorrectly classified as overdue.
  if (activeRecord && (activeRecord.status === Status.BOOKED || activeRecord.status === Status.IN_SERVICE)) {
    isOverdue = false; 
  }

  return {
    isDue,
    isOverdue,
    activeRecord,
  };
}
