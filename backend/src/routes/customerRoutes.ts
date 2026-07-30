import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  addFollowUp,
  createCustomerSchema,
  updateCustomerSchema,
  addFollowUpSchema
} from '../controllers/customerController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getCustomers);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getCustomerById);
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES), validate(createCustomerSchema), createCustomer);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.SALES), validate(updateCustomerSchema), updateCustomer);
router.post('/:id/follow-ups', authorizeRoles(Role.ADMIN, Role.SALES), validate(addFollowUpSchema), addFollowUp);

export default router;
