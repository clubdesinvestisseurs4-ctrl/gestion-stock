const { z } = require('zod');
const { UNITS } = require('../constants');

const baseProductFields = {
  name: z.string({ message: 'name requis' }).trim().min(1, 'name requis'),
  category: z.string().trim().optional(),
  unit: z.enum(UNITS, { message: `unit doit être l'une de : ${UNITS.join(', ')}` }),
  minThreshold: z.coerce.number({ message: 'minThreshold requis' }).nonnegative('minThreshold doit être >= 0'),
};

const createProductSchema = z.object({
  ...baseProductFields,
  quantity: z.coerce.number({ message: 'quantity requis' }).nonnegative('quantity doit être >= 0'),
});

const updateProductSchema = z.object(baseProductFields).partial();

module.exports = { createProductSchema, updateProductSchema };
