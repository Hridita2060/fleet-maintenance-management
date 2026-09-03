import { Request, Response } from 'express';
import { PrismaClient, Status } from '@prisma/client';
import { calculateDueStatus } from '../services/dueEngine';
import { startOfWeek, subWeeks, format } from 'date-fns';

const prisma = new PrismaClient();

export const getDashboardMetrics = async (req: Request, res: Response) => {
  const userRole = (req as any).user.role;
  const userId = (req as any).user.userId;

  // For Technician, filter vehicles/records they are assigned to
  const recordWhere = userRole === 'TECHNICIAN' 
    ? { assignments: { some: { technicianId: userId } } } 
    : {};

  const activeVehiclesWhere = userRole === 'TECHNICIAN'
    ? { isArchived: false, serviceRecords: { some: { assignments: { some: { technicianId: userId } } } } }
    : { isArchived: false };

  const [
    totalActiveVehicles,
    servicesDue,
    bookedServices,
    inServiceServices,
    completedServices,
  ] = await Promise.all([
    prisma.vehicle.count({ where: activeVehiclesWhere }),
    prisma.serviceRecord.count({ where: { ...recordWhere, status: Status.DUE } }),
    prisma.serviceRecord.count({ where: { ...recordWhere, status: Status.BOOKED } }),
    prisma.serviceRecord.count({ where: { ...recordWhere, status: Status.IN_SERVICE } }),
    prisma.serviceRecord.count({ where: { ...recordWhere, status: Status.COMPLETED } }),
  ]);

  const vehicles = await prisma.vehicle.findMany({ 
    where: activeVehiclesWhere,
    include: {
      serviceRecords: {
        orderBy: { completionDate: 'desc' },
      }
    }
  });

  let overdueServices = 0;
  const newAlerts: any[] = [];

  for (const v of vehicles) {
    const status = calculateDueStatus(v, v.serviceRecords);
    if (status.isOverdue && status.activeRecord) {
      overdueServices++;
      newAlerts.push({
        vehicleId: v.id,
        serviceRecordId: status.activeRecord.id,
      });
    }
  }

  // Create alerts if they don't exist and are not dismissed
  if (userRole === 'MANAGER' && newAlerts.length > 0) {
    for (const alert of newAlerts) {
      const exists = await prisma.alert.findFirst({
        where: { serviceRecordId: alert.serviceRecordId }
      });
      if (!exists) {
        await prisma.alert.create({ data: alert });
      }
    }
  }

  // --- New Feature: Technician Breakdown ---
  const technicianBreakdown = [];
  if (userRole === 'MANAGER') {
    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      select: {
        id: true,
        email: true,
        _count: {
          select: { assignments: true }
        }
      }
    });
    technicianBreakdown.push(...technicians.map(t => ({
      technicianId: t.id,
      technicianName: t.email,
      assignedCount: t._count.assignments
    })));
  } else {
    const tech = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        _count: {
          select: { assignments: true }
        }
      }
    });
    if (tech) {
      technicianBreakdown.push({
        technicianId: tech.id,
        technicianName: tech.email,
        assignedCount: tech._count.assignments
      });
    }
  }

  // --- New Feature: 8-Week Completions Chart ---
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
  
  const weeklyCompletions = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = subWeeks(currentWeekStart, i);
    weeklyCompletions.push({
      weekStart,
      weekLabel: format(weekStart, 'MMM d'),
      count: 0
    });
  }

  const eightWeeksAgo = weeklyCompletions[0].weekStart;

  const completedRecordsWhere: any = {
    status: Status.COMPLETED,
    completionDate: {
      gte: eightWeeksAgo
    }
  };
  if (userRole === 'TECHNICIAN') {
    completedRecordsWhere.assignments = { some: { technicianId: userId } };
  }

  const completedRecords = await prisma.serviceRecord.findMany({
    where: completedRecordsWhere,
    select: { completionDate: true }
  });

  for (const record of completedRecords) {
    if (record.completionDate) {
      const recordWeekStart = startOfWeek(record.completionDate, { weekStartsOn: 1 });
      const bucket = weeklyCompletions.find(b => b.weekStart.getTime() === recordWeekStart.getTime());
      if (bucket) {
        bucket.count++;
      }
    }
  }

  res.json({
    totalActiveVehicles,
    servicesDue,
    overdueServices,
    bookedServices,
    inServiceServices,
    completedServices,
    technicianBreakdown,
    weeklyCompletions
  });
};
