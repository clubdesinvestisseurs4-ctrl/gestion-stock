const { z } = require('zod');

const fcmTokenSchema = z.object({
  token: z.string({ message: 'token requis' }).min(1, 'token requis'),
});

module.exports = { fcmTokenSchema };
