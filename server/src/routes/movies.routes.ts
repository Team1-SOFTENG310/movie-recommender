import { Router } from 'express';
import { getRandomMovie } from '../controllers/movies.controller.js';
// import { getAll, getOne, create, update, remove } from '../controllers/example.controller.js';

const router = Router();

router.get('/random', getRandomMovie);

export default router;
