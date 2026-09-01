import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAlerts = async (req: Request, res: Response) => {
  const userRole = (req as any).user.role;
  const userId = (req as any).user.userId;

  const where: any = { isDismissed: false };

  if (userRole === 'TECHNICIAN') {
    where.serviceRecord = {
      assignments: { some: { technicianId: userId } }
    };
  }

  const alerts = await prisma.alert.findMany({
    where,
    include: {
      vehicle: true,
      serviceRecord: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Wait! We need to make sure the serviceRecord is STILL overdue.
  // The requirements say "A dismissed alert should remain historically dismissed rather than being recreated".
  // But if the record was completed, it's no longer overdue.
  // We can filter out alerts where the record is no longer DUE.
  const activeAlerts = alerts.filter(a => a.serviceRecord.status === 'DUE');

  res.json(activeAlerts);
};

export const dismissAlert = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userRole = (req as any).user.role;
  const userId = (req as any).user.userId;

  const alert = await prisma.alert.findUnique({
    where: { id },
    include: { serviceRecord: { include: { assignments: true } } }
  });

  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  if (userRole === 'TECHNICIAN') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const isAssigned = alert.serviceRecord.assignments.some(a => a.technicianId === userId);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this record' });
    }
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: { isDismissed: true }
  });

  res.json(updated);
};
