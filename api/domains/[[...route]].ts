
import type { VercelRequest, VercelResponse } from '@vercel/node';
import index from '../_controllers/domains/index';
import add from '../_controllers/domains/add';
import verify from '../_controllers/domains/verify';
// import connect from '../_controllers/domains/connect'; // Assuming checking this file exists if needed

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { route } = req.query;

    if (!route || route.length === 0) {
        return index(req, res);
    }

    const path = route[0];

    if (path === 'add') return add(req, res);
    if (path === 'verify') return verify(req, res);
    // if (path === 'connect') return connect(req, res);

    return res.status(404).json({ error: 'Endpoint not found' });
}
