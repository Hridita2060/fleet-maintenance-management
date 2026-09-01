import request from 'supertest';
import express from 'express';
jest.setTimeout(30000);
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import serviceRecordRoutes from '../../routes/serviceRecord';
import { PrismaClient, Status, ActionType } from '@prisma/client';

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

describe('Audit History Tests', () => {
  let managerId: string;
  let tech1Id: string;
  let tech2Id: string;
  let vehicleId: string;
  let recordId: string;
  let mgrCookie: string;
  let tech1Cookie: string;
  let tech2Cookie: string;

  beforeAll(async () => {
    const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
    const techs = await prisma.user.findMany({ where: { role: 'TECHNICIAN' }, take: 2 });
    managerId = manager!.id;
    tech1Id = techs[0].id;
    tech2Id = techs[1].id;
    mgrCookie = generateCookie(managerId, 'mgr@x.com', 'MANAGER');
    tech1Cookie = generateCookie(tech1Id, 't1@x.com', 'TECHNICIAN');
    tech2Cookie = generateCookie(tech2Id, 't2@x.com', 'TECHNICIAN');

    const vehicle = await prisma.vehicle.findFirst();
    vehicleId = vehicle!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creating a record generates a CREATED audit event', async () => {
    const res = await request(app)
      .post('/api/service-records')
      .set('Cookie', mgrCookie)
      .send({ vehicleId, description: 'Audit Test' });
    
    expect(res.status).toBe(201);
    recordId = res.body.id;

    const auditRes = await request(app)
      .get(`/api/service-records/${recordId}/audit`)
      .set('Cookie', mgrCookie);
    
    expect(auditRes.status).toBe(200);
    const events = auditRes.body;
    expect(events.length).toBe(1);
    expect(events[0].action).toBe('CREATED');
    expect(events[0].newValue).toBe('DUE');
  });

  it('assigning a tech generates ASSIGNED audit event', async () => {
    const res = await request(app)
      .post(`/api/service-records/${recordId}/assignments`)
      .set('Cookie', mgrCookie)
      .send({ technicianId: tech1Id });
    
    expect(res.status).toBe(201);

    const auditRes = await request(app)
      .get(`/api/service-records/${recordId}/audit`)
      .set('Cookie', mgrCookie);
    
    const assignEvent = auditRes.body.find((e: any) => e.action === 'ASSIGNED');
    expect(assignEvent).toBeDefined();
    expect(assignEvent.newValue).toBe(tech1Id);
  });

  it('technician changing status generates STATUS_CHANGED audit event', async () => {
    const res = await request(app)
      .patch(`/api/service-records/${recordId}`)
      .set('Cookie', mgrCookie)
      .send({ status: 'BOOKED', scheduledDate: new Date().toISOString() });
    expect(res.status).toBe(200);

    const techRes = await request(app)
      .patch(`/api/service-records/${recordId}`)
      .set('Cookie', tech1Cookie)
      .send({ status: 'IN_SERVICE' });
    
    expect(techRes.status).toBe(200);

    const auditRes = await request(app)
      .get(`/api/service-records/${recordId}/audit`)
      .set('Cookie', tech1Cookie);
    
    const statusEvent = auditRes.body.find((e: any) => e.action === 'STATUS_CHANGED' && e.newValue === 'IN_SERVICE');
    expect(statusEvent).toBeDefined();
    expect(statusEvent.oldValue).toBe('BOOKED');
  });

  it('technician adding note generates NOTE_ADDED audit event', async () => {
    const res = await request(app)
      .patch(`/api/service-records/${recordId}`)
      .set('Cookie', tech1Cookie)
      .send({ description: 'New Note' });
    expect(res.status).toBe(200);

    const auditRes = await request(app)
      .get(`/api/service-records/${recordId}/audit`)
      .set('Cookie', tech1Cookie);
    
    const noteEvent = auditRes.body.find((e: any) => e.action === 'NOTE_ADDED');
    expect(noteEvent).toBeDefined();
    expect(noteEvent.oldValue).toBe('Audit Test');
    expect(noteEvent.newValue).toBe('New Note');
  });

  it('unauthorized tech cannot view audit history', async () => {
    const res = await request(app)
      .get(`/api/service-records/${recordId}/audit`)
      .set('Cookie', tech2Cookie);
    
    expect(res.status).toBe(403);
  });

  it('failed transactions do not create audit events', async () => {
    const initialEvents = await prisma.auditEvent.count({ where: { recordId } });
    
    // Attempt invalid transition
    const res = await request(app)
      .patch(`/api/service-records/${recordId}`)
      .set('Cookie', tech1Cookie)
      .send({ status: 'DUE' });
    
    expect(res.status).toBe(400);

    const finalEvents = await prisma.auditEvent.count({ where: { recordId } });
    expect(finalEvents).toBe(initialEvents);
  });
});
