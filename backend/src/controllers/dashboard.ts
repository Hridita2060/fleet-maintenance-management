import { Request, Response } from 'express';
import { PrismaClient, Status } from '@prisma/client';
import { calculateDueStatus } from '../services/dueEngine';

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
    } else if (status.isOverdue && !status.activeRecord) {
      // It's overdue but no active record exists? We can't link an alert to a serviceRecord if it doesn't exist.
      // So we count it as overdue, but wait - the prompt says "Associate alerts with the correct vehicle and service record."
      // This implies an overdue alert ONLY exists if there's a ServiceRecord that is DUE.
      // So we'll just require activeRecord.
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

  res.json({
    totalActiveVehicles,
    servicesDue,
    overdueServices,
    bookedServices,
    inServiceServices,
    completedServices,
  });
};
