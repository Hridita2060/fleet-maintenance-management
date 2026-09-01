import request from 'supertest';
import express from 'express';
jest.setTimeout(30000);
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import serviceRecordRoutes from '../../routes/serviceRecord';
import vehicleRoutes from '../../routes/vehicle';
import { PrismaClient, Status } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/service-records', serviceRecordRoutes);
app.use('/api/vehicles', vehicleRoutes);

const JWT_SECRET = process.env.JWT_SECRET || '23561d539eeb14925bddc170d815d07f09b40b70dfd5121a119d59c9da46695e';

function generateCookie(userId: string, email: string, role: string) {
  const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1h' });
  return `token=${token}`;
}

describe('Security & Authorization Boundary Tests', () => {
  let tech1Cookie: string;
  let tech2Cookie: string;
  let recordForTech1: string;
  let vehicleId: string;
  
  beforeAll(async () => {
    let t1 = await prisma.user.findFirst({ where: { email: 't1@x.com' } });
    if (!t1) t1 = await prisma.user.create({ data: { email: 't1@x.com', passwordHash: 'x', role: 'TECHNICIAN' } });
    tech1Cookie = generateCookie(t1.id, 't1@x.com', 'TECHNICIAN');

    let t2 = await prisma.user.findFirst({ where: { email: 't2@x.com' } });
    if (!t2) t2 = await prisma.user.create({ data: { email: 't2@x.com', passwordHash: 'x', role: 'TECHNICIAN' } });
    tech2Cookie = generateCookie(t2.id, 't2@x.com', 'TECHNICIAN');

    const v = await prisma.vehicle.create({
      data: { registration: 'SEC-' + Date.now(), make: 'X', model: 'Y', currentOdometer: 10000, dateIntervalDays: 30, mileageInterval: 5000 }
    });
    vehicleId = v.id;

    const sr = await prisma.serviceRecord.create({
      data: { vehicleId: v.id, description: 'Test', status: Status.BOOKED }
    });
    recordForTech1 = sr.id;

    await prisma.serviceAssignment.create({
      data: { recordId: sr.id, technicianId: t1.id }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('unauthenticated requests -> 401', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(401);
  });

  it('technician attempting vehicle mutation -> 403', async () => {
    const res = await request(app).patch(`/api/vehicles/${vehicleId}`).set('Cookie', tech1Cookie).send({ currentOdometer: 11000 });
    expect(res.status).toBe(403);
  });

  it('technician attempting CSV import -> 403', async () => {
    const res = await request(app).post('/api/vehicles/bulk-odometer').set('Cookie', tech1Cookie).attach('file', Buffer.from('reg,odo\nTEST,1'), 't.csv');
    expect(res.status).toBe(403);
  });

  it('technician attempting to export CSV cannot export unauthorized records', async () => {
    // If tech2 tries to export, they shouldn't see tech1's record
    const res = await request(app).get('/api/service-records/export').set('Cookie', tech2Cookie);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain(recordForTech1);
  });

  it('technician modifying another technician record -> 403', async () => {
    const res = await request(app).patch(`/api/service-records/${recordForTech1}`).set('Cookie', tech2Cookie).send({ status: Status.IN_SERVICE });
    expect(res.status).toBe(403);
  });

  it('technician accessing another technician audit history -> 403', async () => {
    const res = await request(app).get(`/api/service-records/${recordForTech1}/audit`).set('Cookie', tech2Cookie);
    expect(res.status).toBe(403);
  });

  it('decreasing odometer -> 400', async () => {
    // Need a manager cookie to mutate vehicle
    let m = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    if (!m) m = await prisma.user.create({ data: { email: 'mgr_sec@x.com', passwordHash: 'x', role: 'MANAGER' } });
    const mgrCookie = generateCookie(m.id, m.email, 'MANAGER');

    const res = await request(app).patch(`/api/vehicles/${vehicleId}`).set('Cookie', mgrCookie).send({ currentOdometer: 5000 }); // currently 10000
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot be lower');
  });

  it('invalid lifecycle transitions -> 400', async () => {
    // Tech1 is authorized to modify it, let's try going BOOKED -> DUE
    const res = await request(app).patch(`/api/service-records/${recordForTech1}`).set('Cookie', tech1Cookie).send({ status: Status.DUE });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid transition');
  });
});
