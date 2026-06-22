const { z } = require('zod');

const createMovementSchema = z.object({
  productId: z.string({ message: 'productId requis' }).min(1, 'productId requis'),
  type: z.enum(['entree', 'sortie'], { message: 'type doit être "entree" ou "sortie"' }),
  quantity: z.coerce.number({ message: 'quantity requis' }).positive('La quantité doit être positive'),
  note: z.string().trim().max(500).optional(),
});

module.exports = { createMovementSchema };
