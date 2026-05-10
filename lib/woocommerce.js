import fetch from 'node-fetch';

export function createWooClient(url, key, secret) {
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');

    async function request(namespace, endpoint, options = {}) {
        const response = await fetch(`${url}/wp-json/${namespace}/${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            let detail = '';
            try {
                const body = await response.json();
                if (body?.message) detail = ` — ${body.message}`;
            } catch { /* body not JSON */ }

            if (response.status === 403) {
                detail += ` (Έλεγξε ότι το WC API key έχει Read permissions και ότι ο WP user έχει role Shop Manager/Administrator για το endpoint "${endpoint}")`;
            }

            throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}${detail}`);
        }

        return response.json();
    }

    const wc = (endpoint, options) => request('wc/v3', endpoint, options);
    wc.analytics = (endpoint, options) => request('wc-analytics', endpoint, options);
    return wc;
}
