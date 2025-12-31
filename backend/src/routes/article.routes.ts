import { Router } from 'express';
import {
  getAllArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from '../controllers/article.controller';
import { authenticate, authorize } from '../middleware';

const router = Router();

// Public routes
router.get('/', getAllArticles);
router.get('/:slug', getArticleBySlug);

// Protected routes (Admin only)
router.post('/', authenticate, authorize('ADMIN'), createArticle);
router.put('/:id', authenticate, authorize('ADMIN'), updateArticle);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteArticle);

export default router;
