import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  createProductSchema,
  updateProductSchema
} from '../controllers/productController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getProducts);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getProductById);
router.post('/', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), validate(createProductSchema), createProduct);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), validate(updateProductSchema), updateProduct);

export default router;
