import { Router } from 'express';
import { getAllNurseries, getNurseryBySlug, searchNurseries, searchByCity, autocompleteSearch, getAllGroups, getGroupBySlug } from '../controllers/user.nursery.controller';

const router = Router();

// Public routes for users viewing nurseries
router.get('/', getAllNurseries);
router.get('/search', searchNurseries);
router.get('/search-by-city', searchByCity); // Search by city (hero banner)
router.get('/autocomplete', autocompleteSearch); // Autocomplete search for hero banner dropdown
router.get('/groups', getAllGroups); // Get all nursery groups
router.get('/groups/:slug', getGroupBySlug); // Get group by slug
router.get('/:slug', getNurseryBySlug);

export default router;
