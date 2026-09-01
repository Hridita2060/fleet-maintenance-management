import request from 'supertest';
import express from 'express';
jest.setTimeout(30000);
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import serviceRecordRoutes from '../../routes/serviceRecord';
import { PrismaClient, Status } from '@prisma/client';

// We mock the PrismaClient directly to prevent hitting the real Render DB 
// during tests, especially since we don't have a dedicated test DB setup.
// Wait, the instructions say: "Verify the implementation against the existing Render PostgreSQL database."
// It's usually better to run tests against a test db, but the assignment said:
// "Verify the implementation against the existing Render PostgreSQL database."
// That means the tests should run against the real DB? No, running tests against a production/shared DB is bad.
// The user said: "Verify the implementation against the existing Render PostgreSQL database. Run backend tests..."
// I'll use real DB for tests since it's the development DB.
// I will setup an Express app with the real routes and Prisma client.

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/service-records', serviceRecordRoutes);

const JWT_SECRET = process.env.JWT_SECRET || '23561d539eeb14925bddc170d815d07f09b40b70dfd5121a119d59c9da46695e';

function generateCookie(userId: string, email: string, role: string) {
  const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1h' });
  return `token=${token}`;
}

describe('Service Record Authorization', () => {
  let managerId: string;
  let tech1Id: string;
  let tech2Id: string;
  let vehicleId: string;
  let unassignedRecordId: string;
  let tech1AssignedRecordId: string;

  beforeAll(async () => {
    // Find or create roles
    let manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    if (!manager) manager = await prisma.user.create({ data: { email: 'test_mgr@x.com', passwordHash: 'x', role: 'MANAGER' } });
    managerId = manager.id;

    let techs = await prisma.user.findMany({ where: { role: 'TECHNICIAN' }, take: 2 });
    if (techs.length < 2) {
      await prisma.user.create({ data: { email: 't1@x.com', passwordHash: 'x', role: 'TECHNICIAN' } });
      await prisma.user.create({ data: { email: 't2@x.com', passwordHash: 'x', role: 'TECHNICIAN' } });
      techs = await prisma.user.findMany({ where: { role: 'TECHNICIAN' }, take: 2 });
    }
    tech1Id = techs[0].id;
    tech2Id = techs[1].id;

    let vehicle = await prisma.vehicle.findFirst();
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: { registration: 'TEST-123', make: 'Test', model: 'Test', currentOdometer: 0, dateIntervalDays: 30, mileageInterval: 5000 }
      });
    }
    vehicleId = vehicle.id;

    // Create records
    const rec1 = await prisma.serviceRecord.create({
      data: { vehicleId, description: 'Unassigned Due', status: Status.DUE }
    });
    unassignedRecordId = rec1.id;

    const rec2 = await prisma.serviceRecord.create({
      data: { vehicleId, description: 'Tech1 Assigned', status: Status.BOOKED }
    });
    await prisma.serviceAssignment.create({ data: { recordId: rec2.id, technicianId: tech1Id } });
    tech1AssignedRecordId = rec2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Unauthenticated -> unauthorized (401)', async () => {
    const res = await request(app).get('/api/service-records');
    expect(res.status).toBe(401);
  });

  it('Manager -> all records', async () => {
    const cookie = generateCookie(managerId, 'mgr@x.com', 'MANAGER');
    const res = await request(app).get('/api/service-records').set('Cookie', cookie);
    expect(res.status).toBe(200);
    // Manager should see all records in the DB
    expect(res.body.records.length).toBeGreaterThanOrEqual(2);
  });

  it('Technician -> own assigned records', async () => {
    const cookie = generateCookie(tech1Id, 'tech1@x.com', 'TECHNICIAN');
    const res = await request(app).get('/api/service-records').set('Cookie', cookie);
    expect(res.status).toBe(200);
    // Tech1 should only see records assigned to them
    const records = res.body.records;
    const allAssignedToTech1 = records.every((r: any) => 
      r.assignments.some((a: any) => a.technicianId === tech1Id)
    );
    expect(allAssignedToTech1).toBe(true);
    expect(records.find((r: any) => r.id === tech1AssignedRecordId)).toBeDefined();
    expect(records.find((r: any) => r.id === unassignedRecordId)).toBeUndefined();
  });

  it('Technician -> update another technician\'s record -> forbidden (403)', async () => {
    const cookie = generateCookie(tech2Id, 'tech2@x.com', 'TECHNICIAN');
    
    // Tech2 tries to update Tech1's record
    const res = await request(app)
      .patch(`/api/service-records/${tech1AssignedRecordId}`)
      .set('Cookie', cookie)
      .send({ description: 'Hacked' });
      
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('Technician -> update own record -> success', async () => {
    const cookie = generateCookie(tech1Id, 'tech1@x.com', 'TECHNICIAN');
    
    // Tech1 tries to update their own record description
    const res = await request(app)
      .patch(`/api/service-records/${tech1AssignedRecordId}`)
      .set('Cookie', cookie)
      .send({ description: 'Tech1 Update' });
      
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Tech1 Update');
  });
});
