import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle';

const prisma = new PrismaClient();

export const getVehicles = async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === 'true';
  const role = (req as any).user?.role;

  // Technicians might only need to see vehicles tied to their records, 
  // but requirements say "Fleet managers ... see the whole fleet".
  // Assuming basic listing is fine if they need it for context, 
  // but strictly, managers see all. We will just filter by isArchived by default.
  
  const vehicles = await prisma.vehicle.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    orderBy: { registration: 'asc' },
  });

  res.json(vehicles);
};

export const getVehicleById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  res.json(vehicle);
};

export const createVehicle = async (req: Request, res: Response) => {
  const result = createVehicleSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: result.data,
    });
    res.status(201).json(vehicle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Vehicle with this registration already exists' });
    }
    throw error;
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateVehicleSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }

  const existingVehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!existingVehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Validate odometer: must not be lower than the current reading
  if (
    result.data.currentOdometer !== undefined && 
    result.data.currentOdometer < existingVehicle.currentOdometer
  ) {
    return res.status(400).json({ 
      error: 'New odometer reading cannot be lower than the current reading' 
    });
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: result.data,
    });
    res.json(vehicle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Vehicle with this registration already exists' });
    }
    throw error;
  }
};
