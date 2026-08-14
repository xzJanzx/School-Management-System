/**
 * SMS — Module 01 Student Master Data Automated Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/server/db/prisma.js';

describe('SMS — Module 01 Student Master Data Suite', () => {
  const app = createApp();
  let createdStudentDbId: string;
  let createdStudentId: string;
  let createdFileNumber: string;

  beforeAll(async () => {
    await prisma.studentDocument.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.student.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Student Creation — generates immutable Student ID and File Number', async () => {
    const response = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Ahmed',
        middleName: 'Hassan',
        lastName: 'Mahmoud',
        gender: 'MALE',
        dateOfBirth: '2015-05-12',
        nationalId: '31505120101234',
        nationality: 'Egyptian',
        addressLine1: '15 Tahrir Sq',
        city: 'Cairo',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.studentId).toMatch(/^STD-\d{4}-\d+$/);
    expect(response.body.fileNumber).toMatch(/^FN-\d{4}-\d+$/);
    expect(response.body.firstName).toBe('Ahmed');
    expect(response.body.status).toBe('ACTIVE');

    createdStudentDbId = response.body.id;
    createdStudentId = response.body.studentId;
    createdFileNumber = response.body.fileNumber;
  });

  it('2. Validation Failures — fails when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'John',
        // missing lastName, gender, dateOfBirth
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('required');
  });

  it('3. Duplicate Protection — blocks duplicate student creation without override', async () => {
    const response = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Ahmed',
        middleName: 'Hassan',
        lastName: 'Mahmoud',
        gender: 'MALE',
        dateOfBirth: '2015-05-12',
        nationalId: '31505120101234', // Same National ID
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Matching National/Civil ID');
  });

  it('4. Duplicate Override — permits override with authorized role & reason', async () => {
    const response = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Ahmed',
        middleName: 'Hassan',
        lastName: 'Mahmoud',
        gender: 'MALE',
        dateOfBirth: '2015-05-12',
        nationalId: '99905120109999',
        overrideDuplicate: true,
        overrideReason: 'Approved exception by school registrar',
      });

    expect(response.status).toBe(201);
    expect(response.body.firstName).toBe('Ahmed');
    expect(response.body.studentId).not.toBe(createdStudentId);
  });

  it('5. Duplicate Override Permission Denied — blocks override if role lacks permission', async () => {
    const response = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'VIEWER')
      .send({
        firstName: 'Ahmed',
        lastName: 'Mahmoud',
        gender: 'MALE',
        dateOfBirth: '2015-05-12',
        overrideDuplicate: true,
        overrideReason: 'Unauthorized attempt',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Permission denied');
  });

  it('6. Student Updating — preserves immutable Student ID and File Number', async () => {
    const response = await request(app)
      .put(`/api/students/${createdStudentDbId}`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Ahmed Updated',
        city: 'Alexandria',
      });

    expect(response.status).toBe(200);
    expect(response.body.firstName).toBe('Ahmed Updated');
    expect(response.body.city).toBe('Alexandria');
    expect(response.body.studentId).toBe(createdStudentId);
    expect(response.body.fileNumber).toBe(createdFileNumber);
  });

  it('7. Status Change — updates master status with reason and audit log', async () => {
    const response = await request(app)
      .patch(`/api/students/${createdStudentDbId}/status`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        status: 'SUSPENDED',
        reason: 'Temporary medical leave requested',
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('SUSPENDED');
  });

  it('8. Student Search — finds student by query', async () => {
    const response = await request(app)
      .get(`/api/students?query=${createdStudentId}`)
      .set('X-User-Role', 'VIEWER');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(createdStudentDbId);
  });

  it('9. Documents Management — uploads and retrieves document metadata', async () => {
    const uploadRes = await request(app)
      .post(`/api/students/${createdStudentDbId}/documents`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        title: 'Birth Certificate',
        documentType: 'BIRTH_CERTIFICATE',
        fileName: 'birth_cert.pdf',
        filePath: '/uploads/docs/birth_cert_01.pdf',
        fileSize: 102450,
        mimeType: 'application/pdf',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body).toHaveProperty('id');

    const listRes = await request(app)
      .get(`/api/students/${createdStudentDbId}/documents`)
      .set('X-User-Role', 'VIEWER');

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body[0].title).toBe('Birth Certificate');
  });

  it('10. Audit Trail — records student master operations and sensitive diffs', async () => {
    const auditRes = await request(app)
      .get(`/api/students/${createdStudentDbId}/audit-logs`)
      .set('X-User-Role', 'REGISTRAR');

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.length).toBeGreaterThanOrEqual(2);
    const actions = auditRes.body.map((a: { action: string }) => a.action);
    expect(actions).toContain('UPDATE');
    expect(actions).toContain('STATUS_CHANGE');

    const updateLog = auditRes.body.find((a: { action: string }) => a.action === 'UPDATE');
    expect(updateLog).toBeDefined();
    expect(updateLog.details).toHaveProperty('changes');
    expect(updateLog.details.changes.firstName).toEqual({
      oldValue: 'Ahmed',
      newValue: 'Ahmed Updated',
    });
  });

  it('11. Status Transition History — tracks historical transitions without overwriting', async () => {
    // Change back to ACTIVE
    await request(app)
      .patch(`/api/students/${createdStudentDbId}/status`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        status: 'ACTIVE',
        reason: 'Cleared medical leave',
      });

    const historyRes = await request(app)
      .get(`/api/students/${createdStudentDbId}/status-history`)
      .set('X-User-Role', 'REGISTRAR');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.length).toBeGreaterThanOrEqual(2);
    expect(historyRes.body[0].newStatus).toBe('ACTIVE');
    expect(historyRes.body[0].oldStatus).toBe('SUSPENDED');
    expect(historyRes.body[1].newStatus).toBe('SUSPENDED');
  });

  it('12. Guardian Integration Boundary — links multiple guardians and marks primary', async () => {
    // Link Father as Primary
    const fatherRes = await request(app)
      .post(`/api/students/${createdStudentDbId}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Hassan',
        lastName: 'Mahmoud',
        nationalId: '28001010109876',
        phone: '+201001112233',
        relationship: 'FATHER',
        isPrimary: true,
      });

    expect(fatherRes.status).toBe(201);
    expect(fatherRes.body.isPrimary).toBe(true);

    // Link Mother
    const motherRes = await request(app)
      .post(`/api/students/${createdStudentDbId}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Mona',
        lastName: 'Ibrahim',
        nationalId: '28501010105432',
        phone: '+201004445566',
        relationship: 'MOTHER',
        isPrimary: false,
      });

    expect(motherRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/students/${createdStudentDbId}/guardians`)
      .set('X-User-Role', 'VIEWER');

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);
    expect(listRes.body[0].isPrimary).toBe(true);
    expect(listRes.body[0].guardian.firstName).toBe('Hassan');
  });

  it('13. National ID Validation — enforces minimum length requirement', async () => {
    const response = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Omar',
        lastName: 'Ali',
        gender: 'MALE',
        dateOfBirth: '2016-01-01',
        nationalId: '123', // Invalid length (< 5)
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('National ID must be between 5 and 30 characters');
  });

  it('14. Historical Preservation — DELETE archives student to prevent destroying history', async () => {
    const delRes = await request(app)
      .delete(`/api/students/${createdStudentDbId}`)
      .set('X-User-Role', 'REGISTRAR')
      .send({ reason: 'Student deactivation request' });

    expect(delRes.status).toBe(200);
    expect(delRes.body.status).toBe('ARCHIVED');

    // Confirm student still exists in DB
    const student = await prisma.student.findUnique({ where: { id: createdStudentDbId } });
    expect(student).not.toBeNull();
    expect(student?.status).toBe('ARCHIVED');
  });
});
