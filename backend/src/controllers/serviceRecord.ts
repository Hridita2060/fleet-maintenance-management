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
    // Technicians can only update description
    if (result.data.status && result.data.status !== existing.status) {
      return res.status(403).json({ error: 'Forbidden: Technicians cannot change status directly here' }); // Wait, can technicians change status? 
      // "Technicians handle the service records assigned to them... participate in the service lifecycle only where allowed by the assignment rules". 
      // Actually, technicians *do* progress the state (In Service -> Completed). The prompt says: "Technicians can update the work description only for records assigned to them." 
      // But wait! "participate in the service lifecycle only where allowed by the assignment rules". 
      // Let's assume Managers book it, Techs start it and complete it.
      // But the README says: "records can be created by a fleet manager, and their description of the work updated by whoever is assigned, but not who is assigned to them".
      // Let's allow techs to change status from BOOKED->IN_SERVICE and IN_SERVICE->COMPLETED.
    }
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
      orderBy: { [String(sortBy)]: sortOrder },
      include: { vehicle: true, assignments: { include: { technician: true } } }
    }),
    prisma.serviceRecord.count({ where })
  ]);

  res.json({ records, pagination: { total, page: Number(page), pageSize: take } });
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
