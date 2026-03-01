import type { FastifyInstance } from 'fastify';
import { authenticate, requireModule, requirePermission } from '../../core/middleware/authenticate.js';
import { PERMISSIONS } from '@cresyn/config';
import type { RequestContext } from '@cresyn/types';
import { CompanyRepository } from './repositories/company.repository.js';
import { ContactRepository } from './repositories/contact.repository.js';
import {
  createCompanySchema,
  updateCompanySchema,
  listCompaniesSchema,
  createContactSchema,
  updateContactSchema,
  listContactsSchema,
  idParamSchema,
  type CreateCompanyInput,
  type UpdateCompanyInput,
  type ListCompaniesQuery,
  type CreateContactInput,
  type UpdateContactInput,
  type ListContactsQuery,
  type IdParam,
} from './accounts.validation.js';

// ============================================================
// CRM MODULE ROUTES
// Companies, contacts, notes, documents
// ============================================================

export async function accountsRoutes(app: FastifyInstance) {
  // ============================================================
  // COMPANY ROUTES
  // ============================================================

  // GET /companies — List companies with filters
  app.get<{ Querystring: ListCompaniesQuery }>(
    '/companies',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_COMPANIES_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new CompanyRepository(ctx);

      // Validate query params
      const parsed = listCompaniesSchema.safeParse(request.query);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid query parameters',
          instance: request.url,
          requestId: request.id,
        });
      }

      const result = await repo.list(parsed.data);
      return reply.send(result);
    },
  );

  // GET /companies/stats — Get dashboard statistics
  app.get(
    '/companies/stats',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_COMPANIES_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new CompanyRepository(ctx);

      const stats = await repo.getStats();
      return reply.send(stats);
    },
  );

  // GET /companies/:id — Get single company
  app.get<{ Params: IdParam }>(
    '/companies/:id',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_COMPANIES_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new CompanyRepository(ctx);

      // Validate params
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid company ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const company = await repo.findByIdOrThrow(parsed.data.id);
      return reply.send(company);
    },
  );

  // POST /companies — Create company
  app.post<{ Body: CreateCompanyInput }>(
    '/companies',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_COMPANIES_CREATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new CompanyRepository(ctx);

      // Validate body
      const parsed = createCompanySchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const company = await repo.create(parsed.data);
      return reply.code(201).send(company);
    },
  );

  // PATCH /companies/:id — Update company
  app.patch<{ Params: IdParam; Body: UpdateCompanyInput }>(
    '/companies/:id',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_COMPANIES_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new CompanyRepository(ctx);

      // Validate params
      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid company ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      // Validate body
      const bodyValidation = updateCompanySchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const company = await repo.update(paramsValidation.data.id, bodyValidation.data);
      return reply.send(company);
    },
  );

  // DELETE /companies/:id — Soft delete company
  app.delete<{ Params: IdParam }>(
    '/companies/:id',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_COMPANIES_DELETE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new CompanyRepository(ctx);

      // Validate params
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid company ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      await repo.softDelete(parsed.data.id);
      return reply.code(204).send();
    },
  );

  // ============================================================
  // CONTACT ROUTES
  // ============================================================

  // GET /contacts/count — Get total count of contacts
  app.get(
    '/contacts/count',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_CONTACTS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ContactRepository(ctx);

      const count = await repo.getTotalCount();
      return reply.send({ count });
    },
  );

  // GET /contacts — List contacts with filters
  app.get<{ Querystring: ListContactsQuery }>(
    '/contacts',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_CONTACTS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ContactRepository(ctx);

      // Validate query params
      const parsed = listContactsSchema.safeParse(request.query);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid query parameters',
          instance: request.url,
          requestId: request.id,
        });
      }

      const result = await repo.list(parsed.data);
      return reply.send(result);
    },
  );

  // GET /contacts/:id — Get single contact
  app.get<{ Params: IdParam }>(
    '/contacts/:id',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_CONTACTS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ContactRepository(ctx);

      // Validate params
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid contact ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const contact = await repo.findByIdOrThrow(parsed.data.id);
      return reply.send(contact);
    },
  );

  // POST /contacts — Create contact
  app.post<{ Body: CreateContactInput }>(
    '/contacts',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_CONTACTS_CREATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ContactRepository(ctx);

      // Validate body
      const parsed = createContactSchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const contact = await repo.create(parsed.data);
      return reply.code(201).send(contact);
    },
  );

  // PATCH /contacts/:id — Update contact
  app.patch<{ Params: IdParam; Body: UpdateContactInput }>(
    '/contacts/:id',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_CONTACTS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ContactRepository(ctx);

      // Validate params
      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid contact ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      // Validate body
      const bodyValidation = updateContactSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const contact = await repo.update(paramsValidation.data.id, bodyValidation.data);
      return reply.send(contact);
    },
  );

  // DELETE /contacts/:id — Soft delete contact
  app.delete<{ Params: IdParam }>(
    '/contacts/:id',
    {
      preHandler: [
        authenticate,
        requireModule('accounts'),
        requirePermission(PERMISSIONS.ACCOUNTS_CONTACTS_DELETE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ContactRepository(ctx);

      // Validate params
      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid contact ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      await repo.softDelete(parsed.data.id);
      return reply.code(204).send();
    },
  );
}
