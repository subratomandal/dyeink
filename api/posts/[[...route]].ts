
import type { VercelRequest, VercelResponse } from '@vercel/node';
import listCreate from '../_controllers/posts/index';
import detail from '../_controllers/posts/detail';
import publicFeed from '../_controllers/posts/public';
import slug from '../_controllers/posts/slug';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { route } = req.query;

    // If no route parameter (likely handled by index, but with [[...route]] it catches root too)
    if (!route || route.length === 0) {
        return listCreate(req, res);
    }

    const path = route[0];

    if (path === 'public') return publicFeed(req, res);
    if (path === 'slug' && route[1]) {
        // Mutate query for the controller to read 'slug' if it reads from param
        // But VercelRequest query object has all params. 
        // We might need to ensure the controller reads req.query.slug correctly.
        // api/posts/slug/[slug].ts usually reads req.query.slug.
        // In catch-all, req.query is { route: ['slug', 'my-post-slug'], ... }
        // So we must manually inject 'slug' into req.query if the controller expects it.
        req.query.slug = route[1];
        return slug(req, res);
    }

    // Assume it's an ID if not special keyword
    // api/posts/[id]
    if (path && !['public', 'slug'].includes(path)) {
        req.query.id = path;
        return detail(req, res);
    }

    return res.status(404).json({ error: 'Endpoint not found' });
}
