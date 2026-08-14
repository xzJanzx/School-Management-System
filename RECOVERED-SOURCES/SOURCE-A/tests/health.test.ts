import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { prisma, checkDatabaseHealth } from '../src/server/db/prisma.js';

describe('SMS Foundation Baseline Tests', () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Test 1 — Application startup: Express app creates successfully', () => {
    expect(app).toBeDefined();
  });

  it('Test 2 — Health endpoint: GET /api/health returns HTTP 200/503 and valid baseline payload', async () => {
    const response = await request(app).get('/api/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('message', 'API is running');
    expect(response.body).toHaveProperty('system');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('database');
  });

  it('Test 3 — Database connection: Prisma can query SQLite database', async () => {
    const health = await checkDatabaseHealth();
    expect(health.engine).toBe('SQLite');
    expect(health.connected).toBe(true);
  });
});
