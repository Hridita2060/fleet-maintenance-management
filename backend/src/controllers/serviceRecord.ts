import { Request, Response } from 'express';
import { PrismaClient, Status, ActionType } from '@prisma/client';
import { createServiceRecordSchema, updateServiceRecordSchema } from '../validators/serviceRecord';
import { z } from 'zod';

const prisma = new PrismaClient();

export const createServiceRecord = async (req: Request, res: Response) => {
  const result = createServiceRecordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }

  const userId = (req as any).user.userId;

  const record = await prisma.$transaction(async (tx) => {
    const newRecord = await tx.serviceRecord.create({
      data: {
        vehicleId: result.data.vehicleId,
        description: result.data.description,
        status: Status.DUE,
      }
    });

    await tx.auditEvent.create({
      data: {
        recordId: newRecord.id,
        userId,
        action: ActionType.CREATED,
        newValue: Status.DUE,
      }
    });

    return newRecord;
  });

  res.status(201).json(record);
};

export const updateServiceRecord = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;

  const result = updateServiceRecordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }

  const existing = await prisma.serviceRecord.findUnique({
    where: { id },
    include: { assignments: true, vehicle: true }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Service record not found' });
  }

  // Tech authorization check
  if (userRole === 'TECHNICIAN') {
    const isAssigned = existing.assignments.some(a => a.technicianId === userId);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }
    // Technicians can progress the state from BOOKED -> IN_SERVICE -> COMPLETED
    // We rely on the state machine validation below to ensure they follow rules
  }

  // State Machine Validation
  const newStatus = result.data.status;
  if (newStatus && newStatus !== existing.status) {
    const validTransitions: Record<Status, Status[]> = {
      [Status.DUE]: [Status.BOOKED],
      [Status.BOOKED]: [Status.IN_SERVICE],
      [Status.IN_SERVICE]: [Status.COMPLETED],
      [Status.COMPLETED]: [],
    };

    if (!validTransitions[existing.status].includes(newStatus)) {
      return res.status(400).json({ 
        error: `Invalid transition from ${existing.status} to ${newStatus}` 
      });
    }

    if (newStatus === Status.BOOKED) {
      if (!result.data.scheduledDate && !existing.scheduledDate) {
        return res.status(400).json({ error: 'Scheduled date is required to book' });
      }
      if (existing.assignments.length === 0) {
        return res.status(400).json({ error: 'Technician assignment is required to book' });
      }
    }

    if (newStatus === Status.IN_SERVICE) {
      if (existing.assignments.length === 0) {
        return res.status(400).json({ error: 'Technician assignment is required to start service' });
      }
    }

    if (newStatus === Status.COMPLETED) {
      if (!result.data.completionOdometer && !existing.completionOdometer) {
        return res.status(400).json({ error: 'Completion odometer is required to complete' });
      }
    }
  }

  // Perform Update inside Transaction
  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.serviceRecord.update({
      where: { id },
      data: {
        description: result.data.description,
        status: newStatus,
        scheduledDate: result.data.scheduledDate,
        completionDate: newStatus === Status.COMPLETED ? new Date() : undefined,
        completionOdometer: result.data.completionOdometer,
      }
    });

    if (newStatus && newStatus !== existing.status) {
      await tx.auditEvent.create({
        data: {
          recordId: id,
          userId,
          action: ActionType.STATUS_CHANGED,
          oldValue: existing.status,
          newValue: newStatus,
        }
      });
    }

    if (result.data.description && result.data.description !== existing.description) {
      await tx.auditEvent.create({
        data: {
          recordId: id,
          userId,
          action: ActionType.NOTE_ADDED,
          oldValue: existing.description,
          newValue: result.data.description,
        }
      });
    }

    return updated;
  });

  res.json(record);
};

export const getServiceRecords = async (req: Request, res: Response) => {
  const { search, vehicleId, status, technicianId, sortBy = 'createdAt', sortOrder = 'desc', page = '1', pageSize = '10' } = req.query;
  const userRole = (req as any).user.role;
  const userId = (req as any).user.userId;

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // Validate sort field to prevent injection
  const validSortFields = ['createdAt', 'scheduledDate', 'completionDate', 'status'];
  const safeSortBy = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const where: any = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (status) where.status = status;
  if (search) where.description = { contains: String(search), mode: 'insensitive' };
  
  if (technicianId) {
    where.assignments = { some: { technicianId: String(technicianId) } };
  } else if (userRole === 'TECHNICIAN') {
    // Technicians can only see their own assigned records
    where.assignments = { some: { technicianId: userId } };
  }

  const [records, total] = await Promise.all([
    prisma.serviceRecord.findMany({
      where,
      skip,
      take,
      orderBy: { [safeSortBy]: safeSortOrder },
      include: { vehicle: true, assignments: { include: { technician: true } } }
    }),
    prisma.serviceRecord.count({ where })
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({ records, pagination: { total, page: Number(page), pageSize: take, totalPages } });
};

export const assignTechnician = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { technicianId } = req.body;
  const userId = (req as any).user.userId;

  const assignment = await prisma.$transaction(async (tx) => {
    const a = await tx.serviceAssignment.create({
      data: { recordId: id, technicianId }
    });
    
    await tx.auditEvent.create({
      data: { recordId: id, userId, action: ActionType.ASSIGNED, newValue: technicianId }
    });
    return a;
  });
  res.status(201).json(assignment);
};

export const removeTechnician = async (req: Request, res: Response) => {
  const { id, techId } = req.params;
  const userId = (req as any).user.userId;

  await prisma.$transaction(async (tx) => {
    await tx.serviceAssignment.delete({
      where: { recordId_technicianId: { recordId: id, technicianId: techId } }
    });
    
    await tx.auditEvent.create({
      data: { recordId: id, userId, action: ActionType.UNASSIGNED, oldValue: techId }
    });
  });
  res.status(204).send();
};

export const getAuditHistory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userRole = (req as any).user.role;
  const userId = (req as any).user.userId;

  const record = await prisma.serviceRecord.findUnique({
    where: { id },
    include: { assignments: true }
  });

  if (!record) {
    return res.status(404).json({ error: 'Service record not found' });
  }

  if (userRole === 'TECHNICIAN') {
    const isAssigned = record.assignments.some(a => a.technicianId === userId);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }
  }

  const history = await prisma.auditEvent.findMany({
    where: { recordId: id },
    orderBy: { timestamp: 'desc' }
  });

  res.json(history);
};

import { stringify } from 'csv-stringify/sync';

export const exportServiceRecordsCsv = async (req: Request, res: Response) => {
  const { search, vehicleId, status, technicianId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const userRole = (req as any).user.role;
  const userId = (req as any).user.userId;

  const validSortFields = ['createdAt', 'scheduledDate', 'completionDate', 'status'];
  const safeSortBy = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const where: any = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (status) where.status = status;
  if (search) where.description = { contains: String(search), mode: 'insensitive' };
  
  if (technicianId) {
    where.assignments = { some: { technicianId: String(technicianId) } };
  } else if (userRole === 'TECHNICIAN') {
    where.assignments = { some: { technicianId: userId } };
  }

  // Large datasets are fetched here server-side, no limit for CSV export (or could chunk if very large, but this is fine for typical use)
  const records = await prisma.serviceRecord.findMany({
    where,
    orderBy: { [safeSortBy]: safeSortOrder },
    include: { vehicle: true, assignments: { include: { technician: true } } }
  });

  const data = records.map(r => ({
    Record_ID: r.id,
    Vehicle_Registration: r.vehicle.registration,
    Status: r.status,
    Description: r.description,
    Scheduled_Date: r.scheduledDate ? new Date(r.scheduledDate).toISOString() : '',
    Completion_Date: r.completionDate ? new Date(r.completionDate).toISOString() : '',
    Completion_Odometer: r.completionOdometer ?? '',
    Assigned_Technicians: r.assignments.map(a => a.technician.email).join('; ')
  }));

  const csv = stringify(data, { header: true });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="service_records.csv"');
  res.send(csv);
};
