
import type { VercelRequest, VercelResponse } from '@vercel/node';
import index from '../_controllers/stats/index';
import hit from '../_controllers/stats/hit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { route } = req.query;

    if (!route || route.length === 0) {
        return index(req, res);
    }

    const path = route[0];

    if (path === 'hit') return hit(req, res);

    return res.status(404).json({ error: 'Endpoint not found' });
}
