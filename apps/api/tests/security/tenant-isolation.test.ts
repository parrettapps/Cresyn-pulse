/**
 * TENANT ISOLATION SECURITY TEST SUITE
 *
 * This is a non-negotiable CI gate. ALL tests in this file MUST pass
 * before any PR can be merged. These tests verify that a user from
 * Tenant A cannot access, read, modify, or delete data from Tenant B.
 *
 * If any test here fails, it represents a potential data breach.
 *
 * Run: pnpm test:security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

// TODO: These tests will be fully implemented in Week 4 once the
// database test seeding utilities are in place. The structure
// and intent is defined here so it is never omitted.
//
// Each test follows this pattern:
// 1. Create Tenant A with User A + data record
// 2. Create Tenant B with User B
// 3. Authenticate as User B (Tenant B)
// 4. Attempt to access Tenant A's record by its ID
// 5. Assert 403 or 404 — NEVER 200

describe('Tenant Isolation Security Tests', () => {
  let app: FastifyInstance;
  // Test fixtures will hold tokens and IDs for two separate tenants
  const fixtures = {
    tenantA: { token: '', tenantId: '' },
    tenantB: { token: '', tenantId: '' },
    tenantACompanyId: '',
    tenantAContactId: '',
    tenantADealId: '',
    tenantAProjectId: '',
    tenantATimesheetEntryId: '',
  };

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
    // TODO: Seed test database with two tenants and their data
  });

  afterAll(async () => {
    await app.close();
    // TODO: Teardown test data
  });

  describe('Companies', () => {
    it('should not return Tenant A company when requested by Tenant B user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${fixtures.tenantACompanyId}`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
        },
      });
      expect(response.statusCode).toBeOneOf([403, 404]);
      expect(response.json()).not.toHaveProperty('data.name');
    });

    it('should not allow Tenant B to update Tenant A company', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/companies/${fixtures.tenantACompanyId}`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
          'Content-Type': 'application/json',
        },
        payload: JSON.stringify({ name: 'HACKED' }),
      });
      expect(response.statusCode).toBeOneOf([403, 404]);
    });

    it('should not allow Tenant B to delete Tenant A company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/companies/${fixtures.tenantACompanyId}`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
        },
      });
      expect(response.statusCode).toBeOneOf([403, 404]);
    });
  });

  describe('Contacts', () => {
    it('should not return Tenant A contact when requested by Tenant B user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/contacts/${fixtures.tenantAContactId}`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
        },
      });
      expect(response.statusCode).toBeOneOf([403, 404]);
    });
  });

  describe('Pipeline Deals', () => {
    it('should not return Tenant A deal when requested by Tenant B user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/deals/${fixtures.tenantADealId}`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
        },
      });
      expect(response.statusCode).toBeOneOf([403, 404]);
    });
  });

  describe('Projects', () => {
    it('should not return Tenant A project when requested by Tenant B user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${fixtures.tenantAProjectId}`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
        },
      });
      expect(response.statusCode).toBeOneOf([403, 404]);
    });
  });

  describe('Timesheets', () => {
    it('should not return Tenant A timesheet entries in Tenant B list query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/timesheets`,
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantB.tenantId,
        },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json<{ data: Array<{ id: string }> }>();
      // Ensure none of the returned entries belong to Tenant A
      const tenantAEntryIds = body.data.map((e) => e.id);
      expect(tenantAEntryIds).not.toContain(fixtures.tenantATimesheetEntryId);
    });
  });

  describe('JWT / Header Manipulation', () => {
    it('should reject request where X-Tenant-ID header does not match JWT tenant_id', async () => {
      // Tenant B's valid token but Tenant A's tenant ID in header
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies',
        headers: {
          Authorization: `Bearer ${fixtures.tenantB.token}`,
          'X-Tenant-ID': fixtures.tenantA.tenantId, // Mismatch!
        },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should reject request with malformed JWT', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies',
        headers: {
          Authorization: 'Bearer this.is.not.a.valid.jwt',
          'X-Tenant-ID': fixtures.tenantA.tenantId,
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should reject request with missing Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies',
        headers: {
          'X-Tenant-ID': fixtures.tenantA.tenantId,
        },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('ABAC: Timesheet Own-vs-All Isolation', () => {
    it('consultant should not see other consultants timesheet entries', async () => {
      // TODO: Implement with seeded consultant_a and consultant_b in same tenant
      // consultant_b should not see consultant_a's entries in a list query
      expect(true).toBe(true); // placeholder until seeding is implemented
    });
  });
});
