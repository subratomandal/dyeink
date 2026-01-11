
import type { VercelRequest, VercelResponse } from '@vercel/node';
import register from '../_controllers/auth/register';
import me from '../_controllers/auth/me';
import deleteUser from '../_controllers/auth/delete';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { route } = req.query;
    const path = Array.isArray(route) ? route[0] : route;

    if (path === 'register') return register(req, res);
    if (path === 'me') return me(req, res);
    if (path === 'delete') return deleteUser(req, res);

    // If no route (e.g. /api/auth/), or unknown route
    return res.status(404).json({ error: 'Endpoint not found' });
}
