import { Router } from 'express';
import {
  createChallan,
  getChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
  createChallanSchema
} from '../controllers/challanController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getChallans);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getChallanById);
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), validate(createChallanSchema), createChallan);
router.post('/:id/confirm', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), confirmChallan);
router.post('/:id/cancel', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), cancelChallan);

export default router;
