import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { smsDb } from './src/services/smsDb';
import { smsTestSuite } from './src/tests/smsModule03TestSuite';
import { smsModule05TestSuite } from './src/tests/smsModule05TestSuite';
import { UserContext } from './src/types/sms';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize operational database
  await smsDb.init();

  // Authentication Middleware
  const authenticate = async (req: express.Request, res: express.Response): Promise<UserContext | null> => {
    const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    }

    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized: Missing authentication token' });
      return null;
    }

    const user = await smsDb.getUserByToken(token);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session token' });
      return null;
    }

    return user;
  };

  // =========================================
  // AUTHENTICATION ROUTES
  // =========================================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await smsDb.loginUser(username, password);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(401).json({ success: false, error: msg });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const user = await authenticate(req, res);
    if (!user) return;
    res.json({ success: true, data: user });
  });

  // =========================================
  // SMS MODULE 03 API ENDPOINTS
  // =========================================

  // 1. Academic Years
  app.get('/api/sms/academic-years', async (req, res) => {
    try {
      const years = await smsDb.getAcademicYears();
      res.json({ success: true, data: years });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/academic-years', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const year = await smsDb.createAcademicYear(user, req.body);
      res.json({ success: true, data: year });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.put('/api/sms/academic-years/:id/activate', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const year = await smsDb.activateAcademicYear(user, req.params.id);
      res.json({ success: true, data: year });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.put('/api/sms/academic-years/:id/close', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const year = await smsDb.closeAcademicYear(user, req.params.id);
      res.json({ success: true, data: year });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 2. Academic Stages
  app.get('/api/sms/stages', async (req, res) => {
    try {
      const stages = await smsDb.getAcademicStages();
      res.json({ success: true, data: stages });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/stages', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const stage = await smsDb.createAcademicStage(user, req.body);
      res.json({ success: true, data: stage });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.delete('/api/sms/stages/:id', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      await smsDb.deleteStage(user, req.params.id);
      res.json({ success: true, message: 'Stage deleted' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 3. Grades
  app.get('/api/sms/grades', async (req, res) => {
    try {
      const stageId = req.query.stageId as string | undefined;
      const grades = await smsDb.getGrades(stageId);
      res.json({ success: true, data: grades });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/grades', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const grade = await smsDb.createGrade(user, req.body);
      res.json({ success: true, data: grade });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 4. Classes
  app.get('/api/sms/classes', async (req, res) => {
    try {
      const gradeId = req.query.gradeId as string | undefined;
      const classes = await smsDb.getClasses(gradeId);
      res.json({ success: true, data: classes });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/classes', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const cls = await smsDb.createClass(user, req.body);
      res.json({ success: true, data: cls });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.put('/api/sms/classes/:id/capacity', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const { newCapacity, isAdministrativeOverride, overrideReason } = req.body;
      const cls = await smsDb.changeClassCapacity(user, req.params.id, newCapacity, isAdministrativeOverride, overrideReason);
      res.json({ success: true, data: cls });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 5. Academic Path Validation API
  app.post('/api/sms/path/validate', async (req, res) => {
    try {
      const { fromGradeId, toGradeId } = req.body;
      const result = await smsDb.validateAcademicPath(fromGradeId, toGradeId);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 6. Student Enrollment API Endpoints (Module 04)
  app.get('/api/sms/enrollments', async (req, res) => {
    try {
      const { studentId, academicYearId, classId, status } = req.query;
      const list = await smsDb.getEnrollments({
        studentId: studentId as string,
        academicYearId: academicYearId as string,
        classId: classId as string,
        status: status as any,
      });
      res.json({ success: true, data: list });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/enrollments', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const enrollment = await smsDb.createEnrollment(user, req.body);
      res.json({ success: true, data: enrollment });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.put('/api/sms/enrollments/:id/status', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const { status, reason } = req.body;
      const updated = await smsDb.updateEnrollmentStatus(user, req.params.id, status, reason);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.put('/api/sms/enrollments/:id/result', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const { result } = req.body;
      const updated = await smsDb.updateEnrollmentResult(user, req.params.id, result);
      res.json({ success: true, data: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // =========================================
  // SMS MODULE 05 STUDENT TRANSFERS API ENDPOINTS
  // =========================================

  app.get('/api/sms/transfers', async (req, res) => {
    try {
      const filters = {
        studentId: req.query.studentId as string | undefined,
        transferType: req.query.transferType as any,
        status: req.query.status as any,
        academicYearId: req.query.academicYearId as string | undefined,
        search: req.query.search as string | undefined,
      };
      const transfers = await smsDb.getTransfers(filters);
      res.json({ success: true, data: transfers });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.get('/api/sms/transfers/:id', async (req, res) => {
    try {
      const transfer = await smsDb.getTransferById(req.params.id);
      res.json({ success: true, data: transfer });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(404).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/transfers', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const transfer = await smsDb.createTransferRequest(user, req.body);
      res.json({ success: true, data: transfer });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.put('/api/sms/transfers/:id/status', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const { status, reason } = req.body;
      const transfer = await smsDb.updateTransferStatus(user, req.params.id, status, reason);
      res.json({ success: true, data: transfer });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/transfers/:id/execute', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const { isCapacityOverride, overrideReason } = req.body;
      const transfer = await smsDb.executeTransfer(user, req.params.id, { isCapacityOverride, overrideReason });
      res.json({ success: true, data: transfer });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/students', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const student = await smsDb.createStudent(user, req.body);
      res.json({ success: true, data: student });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/parents', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      const parent = await smsDb.createParent(user, req.body);
      res.json({ success: true, data: parent });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 7. Audit, Students, Parents & Test Execution
  app.get('/api/sms/audit', async (req, res) => {
    try {
      const records = await smsDb.getAuditTrail();
      res.json({ success: true, data: records });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.get('/api/sms/students', async (req, res) => {
    try {
      const students = await smsDb.getStudents();
      res.json({ success: true, data: students });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  app.get('/api/sms/parents', async (req, res) => {
    try {
      const parents = await smsDb.getParents();
      res.json({ success: true, data: parents });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // Test Runner endpoint executes tests against isolated test DB (test_sms.db)
  app.post('/api/sms/test-suite/run', async (req, res) => {
    try {
      const res0304 = await smsTestSuite.runAllTests();
      const res05 = await smsModule05TestSuite.runAllTests();
      res.json({ success: true, data: [...res0304, ...res05] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  app.post('/api/sms/seed/reset', async (req, res) => {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      if (user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'Forbidden: Only SUPER_ADMIN can trigger database reset' });
        return;
      }
      await smsDb.resetDatabase();
      res.json({ success: true, message: 'Database reset to default seed structure' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMS Academic Structure Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
