'use strict';

const { z } = require('zod');

// ── domain primitives ──────────────────────────────────────────────────────

const UserId      = z.string().min(1).max(128);
const CurrencyCode = z.string().length(3).toUpperCase();
const PositiveAmount = z.number().positive().max(1_000_000);

// ── request schemas ────────────────────────────────────────────────────────

const CreatePaymentSchema = z.object({
  userId:      UserId,
  amount:      PositiveAmount,
  currency:    CurrencyCode,
  recipient:   z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional()
});

const CreateAccountSchema = z.object({
  userId:         UserId,
  accountType:    z.enum(['checking', 'savings', 'business', 'investment']),
  initialBalance: z.number().min(0).max(10_000_000).optional().default(0)
});

const UpdateAccountSchema = z.object({
  status:      z.enum(['active', 'frozen', 'closed']).optional(),
  accountType: z.enum(['checking', 'savings', 'business', 'investment']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

const VerifyIdentitySchema = z.object({
  userId:         UserId,
  documentType:   z.enum(['passport', 'drivers_license', 'national_id', 'residence_permit']),
  documentNumber: z.string().min(3).max(64)
});

const VerifyTransactionSchema = z.object({
  transactionId:    z.string().min(1),
  userId:           UserId,
  verificationCode: z.string().length(6).optional()
});

const AuthTokenSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128)
});

// ── middleware factory ─────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against `schema`.
 * On failure responds 400 with structured Zod errors.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues.map(i => ({
          field:   i.path.join('.') || 'body',
          message: i.message,
          code:    i.code
        }))
      });
    }
    req.body = result.data;   // use the coerced/defaulted values
    next();
  };
}

module.exports = {
  CreatePaymentSchema,
  CreateAccountSchema,
  UpdateAccountSchema,
  VerifyIdentitySchema,
  VerifyTransactionSchema,
  AuthTokenSchema,
  validate
};
