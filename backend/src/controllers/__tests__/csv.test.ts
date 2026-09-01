import request from 'supertest';
import express from 'express';
jest.setTimeout(30000);
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import serviceRecordRoutes from '../../routes/serviceRecord';
import vehicleRoutes from '../../routes/vehicle';
import { PrismaClient } from '@prisma/client';

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

describe('Search & CSV Tests', () => {
  let mgrCookie: string;
  let vehicleRegistration: string;
  
  beforeAll(async () => {
    let manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    if (!manager) manager = await prisma.user.create({ data: { email: 'x@x.com', passwordHash: 'x', role: 'MANAGER' } });
    mgrCookie = generateCookie(manager.id, 'mgr@x.com', 'MANAGER');

    let vehicle = await prisma.vehicle.findFirst();
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: { registration: 'CSV-123', make: 'M', model: 'M', currentOdometer: 1000, dateIntervalDays: 30, mileageInterval: 1000 }
      });
    }
    vehicleRegistration = vehicle.registration;

    // reset odometer to 1000 just in case
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('filters service records with pagination metadata', async () => {
    const res = await request(app).get('/api/service-records?page=1&pageSize=5').set('Cookie', mgrCookie);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(5);
    expect(res.body.pagination.totalPages).toBeDefined();
    expect(Array.isArray(res.body.records)).toBe(true);
  });

  it('exports CSV safely', async () => {
    const res = await request(app).get('/api/service-records/export').set('Cookie', mgrCookie);
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.text).toContain('Record_ID,Vehicle_Registration,Status');
  });

  it('CSV bulk import processes valid updates and rejects invalid rows', async () => {
    const csvContent = `registration,odometer
${vehicleRegistration},1500
${vehicleRegistration},500
NONEXIST,2000
${vehicleRegistration},-100
`;
    const res = await request(app)
      .post('/api/vehicles/bulk-odometer')
      .set('Cookie', mgrCookie)
      .attach('file', Buffer.from(csvContent), 'test.csv');
    
    expect(res.status).toBe(200);
    expect(res.body.successful).toBe(1); // the 1500 one
    expect(res.body.failed).toBe(3); // 500 (lower), NONEXIST, -100 (negative)
    
    // Verify DB was updated to 1500
    const v = await prisma.vehicle.findUnique({ where: { registration: vehicleRegistration } });
    expect(v?.currentOdometer).toBe(1500);
  });
});
