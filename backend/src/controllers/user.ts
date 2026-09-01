import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUsers = async (req: Request, res: Response) => {
  const { role } = req.query;
  
  const users = await prisma.user.findMany({
    where: role ? { role: String(role) as any } : undefined,
    select: {
      id: true,
      email: true,
      role: true,
    }
  });

  res.json(users);
};
