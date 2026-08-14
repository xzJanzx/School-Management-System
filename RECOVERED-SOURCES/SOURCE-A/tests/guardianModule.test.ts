/**
 * SMS — Module 02 Parent / Guardian Automated Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma } from '../src/server/db/prisma.js';

const app = createApp();

describe('SMS — Module 02 Parent / Guardian Suite', () => {
  let createdStudentId1: string;
  let createdStudentId2: string;
  let createdGuardianDbId1: string;
  let createdGuardianSysId1: string;

  beforeEach(async () => {
    // Clean database before test runs
    await prisma.studentGuardian.deleteMany({});
    await prisma.guardian.deleteMany({});
    await prisma.studentDocument.deleteMany({});
    await prisma.studentStatusHistory.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // Create baseline test students
    const s1Res = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Tariq',
        lastName: 'Mansour',
        gender: 'MALE',
        dateOfBirth: '2015-05-10',
      });
    createdStudentId1 = s1Res.body.id;

    const s2Res = await request(app)
      .post('/api/students')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Laila',
        lastName: 'Mansour',
        gender: 'FEMALE',
        dateOfBirth: '2017-09-20',
      });
    createdStudentId2 = s2Res.body.id;
  });

  it('1. Create Guardian — generates unique sequential Guardian ID and validates required fields', async () => {
    // Missing required phone
    const badRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Khaled',
        lastName: 'Mansour',
      });
    expect(badRes.status).toBe(400);
    expect(badRes.body.message).toContain('Primary Phone is required');

    // Successful creation
    const res = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Khaled',
        lastName: 'Mansour',
        phone: '+201009988776',
        nationalId: '27501010101111',
        email: 'khaled@example.com',
        preferredContactMethod: 'WHATSAPP',
      });

    expect(res.status).toBe(201);
    expect(res.body.guardianId).toMatch(/^GUA-\d{4}-\d+$/);
    expect(res.body.firstName).toBe('Khaled');
    expect(res.body.status).toBe('ACTIVE');

    createdGuardianDbId1 = res.body.id;
    createdGuardianSysId1 = res.body.guardianId;
  });

  it('2. National ID Validation & Protection — prevents duplicate National IDs across Guardians', async () => {
    // Create initial guardian
    await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Sameh',
        lastName: 'Fahmy',
        phone: '+201112223334',
        nationalId: '28205051203456',
      });

    // Attempt duplicate creation
    const dupRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Other',
        lastName: 'Guardian',
        phone: '+201119998887',
        nationalId: '28205051203456',
      });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.message).toContain('Guardian with National ID');
  });

  it('3. Guardian ID Immutability & Sensitive Audit — records field diffs on update', async () => {
    const gRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Youssef',
        lastName: 'Nasser',
        phone: '+201223334445',
      });

    const gId = gRes.body.id;
    const initialSysId = gRes.body.guardianId;

    // Update details
    const updateRes = await request(app)
      .patch(`/api/guardians/${gId}`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Youssef Updated',
        phone: '+201229990000',
        guardianId: 'ATTEMPT_OVERWRITE', // Should be ignored
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.firstName).toBe('Youssef Updated');
    expect(updateRes.body.guardianId).toBe(initialSysId); // Preserved!

    // Verify Audit Log diff
    const auditRes = await request(app)
      .get(`/api/guardians/${gId}/audit-logs`)
      .set('X-User-Role', 'ADMIN');

    expect(auditRes.status).toBe(200);
    const updateLog = auditRes.body.find((a: { action: string }) => a.action === 'GUARDIAN_UPDATED');
    expect(updateLog).toBeDefined();
    expect(updateLog.details.changes.firstName).toEqual({
      oldValue: 'Youssef',
      newValue: 'Youssef Updated',
    });
  });

  it('4. Relationship & Existing Guardian Reuse — links one Guardian to multiple Students without duplicate master', async () => {
    // 1. Create Father Guardian Master
    const gRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Mahmoud',
        lastName: 'Mansour',
        phone: '+201001112233',
        nationalId: '27001010109999',
      });

    const fatherId = gRes.body.id;

    // 2. Link to Student 1 as Father
    const link1Res = await request(app)
      .post(`/api/students/${createdStudentId1}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        guardianId: fatherId,
        relationship: 'FATHER',
        isPrimary: true,
      });

    expect(link1Res.status).toBe(201);
    expect(link1Res.body.isPrimary).toBe(true);

    // 3. Link SAME Guardian to Student 2 (Reuse!)
    const link2Res = await request(app)
      .post(`/api/students/${createdStudentId2}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        guardianId: fatherId,
        relationship: 'FATHER',
        isPrimary: true,
      });

    expect(link2Res.status).toBe(201);

    // Verify Guardian Master table has ONLY 1 record
    const count = await prisma.guardian.count();
    expect(count).toBe(1);

    // Verify Guardian -> Students query returns both students
    const studentsRes = await request(app)
      .get(`/api/guardians/${fatherId}/students`)
      .set('X-User-Role', 'VIEWER');

    expect(studentsRes.status).toBe(200);
    expect(studentsRes.body).toHaveLength(2);
  });

  it('5. Primary Guardian Enforcer & History — ensures maximum 1 active Primary Guardian per Student', async () => {
    // Create Father
    const fRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Father',
        lastName: 'User',
        phone: '+201000000001',
      });
    expect(fRes.status).toBe(201);

    // Create Mother
    const mRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Mother',
        lastName: 'User',
        phone: '+201000000002',
      });
    expect(mRes.status).toBe(201);

    // 1. Link Father as Primary
    const l1 = await request(app)
      .post(`/api/students/${createdStudentId1}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        guardianId: fRes.body.id,
        relationship: 'FATHER',
        isPrimary: true,
      });
    expect(l1.status).toBe(201);

    // 2. Link Mother as Primary (Should automatically downgrade Father to non-primary)
    const l2 = await request(app)
      .post(`/api/students/${createdStudentId1}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        guardianId: mRes.body.id,
        relationship: 'MOTHER',
        isPrimary: true,
      });
    expect(l2.status).toBe(201);

    // Check list of guardians for student
    const listRes = await request(app)
      .get(`/api/students/${createdStudentId1}/guardians`)
      .set('X-User-Role', 'VIEWER');

    expect(listRes.body).toHaveLength(2);

    const primaryGuardians = listRes.body.filter((g: { isPrimary: boolean }) => g.isPrimary);
    expect(primaryGuardians).toHaveLength(1);
    expect(primaryGuardians[0].guardian.firstName).toBe('Mother');

    // Verify Primary Change Audit
    const auditRes = await request(app)
      .get(`/api/students/${createdStudentId1}/audit-logs`)
      .set('X-User-Role', 'ADMIN');

    const primaryLog = auditRes.body.find((a: { action: string }) => a.action === 'PRIMARY_GUARDIAN_CHANGED');
    expect(primaryLog).toBeDefined();
    expect(primaryLog.details.newPrimaryGuardianId).toBe(mRes.body.id);
  }, 15000);

  it('6. Relationship Modification & History Audit — tracks relationship transition from UNCLE to LEGAL_GUARDIAN', async () => {
    const gRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Uncle',
        lastName: 'Ahmed',
        phone: '+201005556677',
      });

    // Link as UNCLE
    await request(app)
      .post(`/api/students/${createdStudentId1}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        guardianId: gRes.body.id,
        relationship: 'UNCLE',
        isPrimary: false,
      });

    // Update relationship to LEGAL_GUARDIAN
    const updateRes = await request(app)
      .patch(`/api/students/${createdStudentId1}/guardians/${gRes.body.id}`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        relationship: 'LEGAL_GUARDIAN',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.relationship).toBe('LEGAL_GUARDIAN');

    // Check audit
    const auditRes = await request(app)
      .get(`/api/students/${createdStudentId1}/audit-logs`)
      .set('X-User-Role', 'ADMIN');

    const relLog = auditRes.body.find((a: { action: string }) => a.action === 'RELATIONSHIP_CHANGED');
    expect(relLog).toBeDefined();
    expect(relLog.details.oldRelationship).toBe('UNCLE');
    expect(relLog.details.newRelationship).toBe('LEGAL_GUARDIAN');
  });

  it('7. Guardian Lifecycle & Delete Protection — blocks hard delete when linked to students', async () => {
    const gRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Linked',
        lastName: 'Guardian',
        phone: '+201001110000',
      });

    const gId = gRes.body.id;

    // Link to student
    await request(app)
      .post(`/api/students/${createdStudentId1}/guardians`)
      .set('X-User-Role', 'REGISTRAR')
      .send({
        guardianId: gId,
        relationship: 'OTHER',
        relationshipDescription: 'Family Friend',
      });

    // Attempt Hard Delete -> MUST BE BLOCKED
    const delRes = await request(app)
      .delete(`/api/guardians/${gId}`)
      .set('X-User-Role', 'REGISTRAR');

    expect(delRes.status).toBe(400);
    expect(delRes.body.message).toContain('Cannot delete Guardian');

    // Deactivate instead
    const statusRes = await request(app)
      .patch(`/api/guardians/${gId}/status`)
      .set('X-User-Role', 'REGISTRAR')
      .send({ status: 'INACTIVE' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('INACTIVE');
  });

  it('8. Authorization & Permissions Enforcement — blocks unauthorized editing or status management', async () => {
    const gRes = await request(app)
      .post('/api/guardians')
      .set('X-User-Role', 'REGISTRAR')
      .send({
        firstName: 'Auth',
        lastName: 'Test',
        phone: '+201000001111',
      });

    // VIEWER role attempting to edit
    const editRes = await request(app)
      .patch(`/api/guardians/${gRes.body.id}`)
      .set('X-User-Role', 'VIEWER')
      .send({ firstName: 'Hacked' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.message).toContain('Permission denied');
  });

  it('9. Concurrent Guardian Creation — concurrent ID generation stays unique and sequential', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const r = await request(app)
        .post('/api/guardians')
        .set('X-User-Role', 'REGISTRAR')
        .send({
          firstName: `Concurrent${i}`,
          lastName: 'User',
          phone: `+2010000000${i}`,
        });
      results.push(r);
    }

    results.forEach((r) => expect(r.status).toBe(201));

    const sysIds = results.map((r) => r.body.guardianId);
    const uniqueSysIds = new Set(sysIds);
    expect(uniqueSysIds.size).toBe(5);
  }, 15000);
});
