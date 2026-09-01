import request from 'supertest';
import express from 'express';
jest.setTimeout(30000);
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dashboardRoutes from '../../routes/dashboard';
import { PrismaClient, Status } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', dashboardRoutes);

const JWT_SECRET = process.env.JWT_SECRET || '23561d539eeb14925bddc170d815d07f09b40b70dfd5121a119d59c9da46695e';

function generateCookie(userId: string, email: string, role: string) {
  const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1h' });
  return `token=${token}`;
}

describe('Dashboard & Alerts Tests', () => {
  let mgrCookie: string;
  let vehicleId: string;
  let recordId: string;
  
  beforeAll(async () => {
    // Clear out old alerts to avoid test interference
    await prisma.alert.deleteMany({});
    
    let manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    if (!manager) manager = await prisma.user.create({ data: { email: 'm@x.com', passwordHash: 'x', role: 'MANAGER' } });
    mgrCookie = generateCookie(manager.id, 'm@x.com', 'MANAGER');

    const v = await prisma.vehicle.create({
      data: { registration: 'DASH-' + Date.now(), make: 'X', model: 'Y', currentOdometer: 10000, dateIntervalDays: 30, mileageInterval: 5000 }
    });
    vehicleId = v.id;

    // Create a DUE service record
    const sr = await prisma.serviceRecord.create({
      data: { vehicleId: v.id, description: 'Test Due', status: Status.DUE, createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) } // Created 100 days ago!
    });
    recordId = sr.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('calculates metrics and auto-generates alerts for overdue vehicles', async () => {
    const res = await request(app).get('/api/metrics').set('Cookie', mgrCookie);
    expect(res.status).toBe(200);
    expect(res.body.totalActiveVehicles).toBeGreaterThan(0);
    
    // Because the service record is 100 days old, it should be overdue
    expect(res.body.overdueServices).toBeGreaterThan(0);
  });

  it('fetches alerts correctly', async () => {
    const res = await request(app).get('/api/alerts').set('Cookie', mgrCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    
    const ourAlert = res.body.find((a: any) => a.serviceRecordId === recordId);
    expect(ourAlert).toBeDefined();
    expect(ourAlert.isDismissed).toBe(false);
  });

  it('dismisses an alert', async () => {
    // get alert id
    const res1 = await request(app).get('/api/alerts').set('Cookie', mgrCookie);
    const ourAlert = res1.body.find((a: any) => a.serviceRecordId === recordId);
    
    const res2 = await request(app).patch(`/api/alerts/${ourAlert.id}/dismiss`).set('Cookie', mgrCookie);
    expect(res2.status).toBe(200);
    expect(res2.body.isDismissed).toBe(true);
    
    // verify it's gone from active alerts
    const res3 = await request(app).get('/api/alerts').set('Cookie', mgrCookie);
    const exists = res3.body.find((a: any) => a.id === ourAlert.id);
    expect(exists).toBeUndefined();
  });
});
