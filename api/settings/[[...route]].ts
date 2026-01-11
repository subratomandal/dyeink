
import type { VercelRequest, VercelResponse } from '@vercel/node';
import index from '../_controllers/settings/index';
import initialize from '../_controllers/settings/initialize';
import domainCheck from '../_controllers/settings/domain-check';
import subdomainCheck from '../_controllers/settings/subdomain-check';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { route } = req.query;

    if (!route || route.length === 0) {
        return index(req, res);
    }

    const path = route[0];

    if (path === 'initialize') return initialize(req, res);

    if (path === 'domain' && route[1]) {
        req.query.domain = route[1];
        return domainCheck(req, res);
    }

    if (path === 'subdomain' && route[1]) {
        req.query.subdomain = route[1];
        return subdomainCheck(req, res);
    }

    return res.status(404).json({ error: 'Endpoint not found' });
}
