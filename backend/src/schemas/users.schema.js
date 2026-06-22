const { z } = require('zod');

const createUserSchema = z.object({
  email: z.string({ message: 'email requis' }).min(1, 'email requis').email('email invalide'),
  password: z.string({ message: 'password requis' }).min(6, 'password doit contenir au moins 6 caractères'),
  displayName: z.string().trim().optional(),
  role: z.enum(['admin', 'operator'], { message: 'role doit être "admin" ou "operator"' }),
  establishmentId: z.string().optional(),
}).refine(
  (data) => data.role !== 'operator' || !!data.establishmentId,
  { message: 'establishmentId requis pour un opérateur', path: ['establishmentId'] }
);

module.exports = { createUserSchema };
