import { Router } from 'express';
import {
  createStockMovement,
  getStockMovements,
  createStockMovementSchema
} from '../controllers/productController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getStockMovements);
router.post('/', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), validate(createStockMovementSchema), createStockMovement);

export default router;
