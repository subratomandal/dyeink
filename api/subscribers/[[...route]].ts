
import type { VercelRequest, VercelResponse } from '@vercel/node';
import index from '../_controllers/subscribers/index';
import subscribe from '../_controllers/subscribers/subscribe';
import deleteSubscriber from '../_controllers/subscribers/delete';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { route } = req.query;

    if (!route || route.length === 0) {
        return index(req, res);
    }

    const path = route[0];

    if (path === 'subscribe') return subscribe(req, res);

    // api/subscribers/[id]
    if (path && path !== 'subscribe') {
        req.query.id = path;
        return deleteSubscriber(req, res);
    }

    return res.status(404).json({ error: 'Endpoint not found' });
}
