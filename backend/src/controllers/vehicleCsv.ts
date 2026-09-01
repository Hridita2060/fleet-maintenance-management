import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

export const bulkImportOdometer = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  let records: any[];
  try {
    const csvContent = req.file.buffer.toString('utf-8');
    records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to parse CSV file' });
  }

  const results = {
    successful: 0,
    failed: 0,
    errors: [] as { row: number, registration: string, reason: string }[]
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1; // logical row
    const registration = row.registration || row.Registration;
    const odometerStr = row.odometer || row.Odometer;

    if (!registration || !odometerStr) {
      results.failed++;
      results.errors.push({ row: rowNum, registration: registration || 'UNKNOWN', reason: 'Missing registration or odometer' });
      continue;
    }

    const newOdometer = parseInt(odometerStr, 10);
    if (isNaN(newOdometer) || newOdometer < 0) {
      results.failed++;
      results.errors.push({ row: rowNum, registration, reason: 'Invalid or negative odometer reading' });
      continue;
    }

    // Process each valid row
    try {
      const vehicle = await prisma.vehicle.findUnique({ where: { registration } });
      if (!vehicle) {
        results.failed++;
        results.errors.push({ row: rowNum, registration, reason: 'Vehicle not found' });
        continue;
      }

      if (newOdometer < vehicle.currentOdometer) {
        results.failed++;
        results.errors.push({ row: rowNum, registration, reason: `Odometer reading (${newOdometer}) is lower than current (${vehicle.currentOdometer})` });
        continue;
      }

      if (newOdometer === vehicle.currentOdometer) {
        // Skip identical, no update needed
        results.successful++;
        continue;
      }

      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentOdometer: newOdometer }
      });
      results.successful++;
    } catch (err: any) {
      results.failed++;
      results.errors.push({ row: rowNum, registration, reason: err.message || 'Database error' });
    }
  }

  res.json(results);
};
