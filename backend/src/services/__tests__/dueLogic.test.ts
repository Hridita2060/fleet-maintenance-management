import { calculateIsDue } from '../dueLogic';
import { subDays, addDays } from 'date-fns';

describe('calculateIsDue', () => {
  const dateInterval = 30; // days
  const mileageInterval = 5000; // miles
  const now = new Date();
  
  it('returns true if there is an open record', () => {
    const result = calculateIsDue(1000, dateInterval, mileageInterval, null, null, now, true);
    expect(result).toBe(true);
  });

  it('returns false if neither date nor mileage interval is reached', () => {
    const lastCompletedDate = subDays(now, 10);
    const lastCompletedOdo = 10000;
    const currentOdo = 12000; // +2000, less than 5000

    const result = calculateIsDue(
      currentOdo, dateInterval, mileageInterval, lastCompletedDate, lastCompletedOdo, now, false
    );
    expect(result).toBe(false);
  });

  it('returns true if date interval is reached', () => {
    const lastCompletedDate = subDays(now, 35); // > 30 days
    const lastCompletedOdo = 10000;
    const currentOdo = 11000;

    const result = calculateIsDue(
      currentOdo, dateInterval, mileageInterval, lastCompletedDate, lastCompletedOdo, now, false
    );
    expect(result).toBe(true);
  });

  it('returns true if mileage interval is reached', () => {
    const lastCompletedDate = subDays(now, 10);
    const lastCompletedOdo = 10000;
    const currentOdo = 16000; // +6000, > 5000

    const result = calculateIsDue(
      currentOdo, dateInterval, mileageInterval, lastCompletedDate, lastCompletedOdo, now, false
    );
    expect(result).toBe(true);
  });

  it('handles fallback to vehicle creation date when no completed records exist', () => {
    const creationDate = subDays(now, 40); // older than interval
    
    // Should be true due to date
    const result = calculateIsDue(
      1000, dateInterval, mileageInterval, null, null, creationDate, false
    );
    expect(result).toBe(true);
  });
});
