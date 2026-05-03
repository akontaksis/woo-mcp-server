import { z } from 'zod';
import { formatPrice, formatDate, formatDateOnly } from '../lib/format.js';

function isExpired(coupon, now = new Date()) {
    if (!coupon.date_expires) return false;
    return new Date(coupon.date_expires) < now;
}

function formatAmount(coupon) {
    const amount = parseFloat(coupon.amount || 0);
    if (coupon.discount_type === 'percent') return `${amount}%`;
    return formatPrice(amount);
}

export function registerCouponTools(server, wc) {

    server.tool(
        'get_coupons',
        'Λίστα κουπονιών του store με usage, αμοιβή, ημερομηνία λήξης. Χρησιμοποίησέ το για: "δείξε μου κουπόνια", "ενεργά κουπόνια", "ποια κουπόνια έχουμε". ΟΧΙ για: συγκεκριμένο κουπόνι (χρησιμοποίησε get_coupon_by_code) ή κουπόνια που λήγουν (χρησιμοποίησε get_expiring_coupons).',
        {
            search: z.string().optional().describe('Αναζήτηση με κωδικό κουπονιού'),
            per_page: z.number().optional().describe('Πόσα κουπόνια, default 10, max 100'),
            active_only: z.boolean().optional().describe('Μόνο ενεργά (όχι ληγμένα), default false'),
        },
        async ({ search, per_page = 10, active_only = false }) => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('per_page', Math.min(per_page, 100));

            const coupons = await wc(`coupons?${params.toString()}`);
            const now = new Date();

            const filtered = active_only
                ? coupons.filter(c => !isExpired(c, now))
                : coupons;

            const summary = filtered.map(c => ({
                id: c.id,
                code: c.code,
                type: c.discount_type,
                amount: formatAmount(c),
                usage_count: c.usage_count,
                usage_limit: c.usage_limit,
                expires: c.date_expires ? formatDateOnly(c.date_expires) : 'Χωρίς λήξη',
                is_expired: isExpired(c, now),
                free_shipping: c.free_shipping,
                minimum_amount: parseFloat(c.minimum_amount) > 0 ? formatPrice(c.minimum_amount) : null,
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        count: summary.length,
                        coupons: summary,
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_coupon_by_code',
        'Πλήρεις λεπτομέρειες κουπονιού με βάση τον κωδικό του (περιορισμοί, products, emails, usage stats).',
        {
            code: z.string().describe('Ο κωδικός του κουπονιού (case-insensitive)')
        },
        async ({ code }) => {
            const coupons = await wc(`coupons?code=${encodeURIComponent(code)}`);

            if (coupons.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: `Δεν βρέθηκε κουπόνι με κωδικό: ${code}`
                    }]
                };
            }

            const c = coupons[0];
            const details = {
                id: c.id,
                code: c.code,
                description: c.description || null,
                type: c.discount_type,
                amount: formatAmount(c),
                usage_count: c.usage_count,
                usage_limit: c.usage_limit,
                usage_limit_per_user: c.usage_limit_per_user,
                expires: c.date_expires ? formatDate(c.date_expires) : 'Χωρίς λήξη',
                is_expired: isExpired(c),
                free_shipping: c.free_shipping,
                minimum_amount: parseFloat(c.minimum_amount) > 0 ? formatPrice(c.minimum_amount) : null,
                maximum_amount: parseFloat(c.maximum_amount) > 0 ? formatPrice(c.maximum_amount) : null,
                product_ids: c.product_ids,
                excluded_product_ids: c.excluded_product_ids,
                product_categories: c.product_categories,
                excluded_product_categories: c.excluded_product_categories,
                email_restrictions: c.email_restrictions,
                exclude_sale_items: c.exclude_sale_items,
                individual_use: c.individual_use,
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(details, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_expiring_coupons',
        'Κουπόνια που λήγουν μέσα σε X ημέρες (όχι ήδη ληγμένα). Χρησιμοποίησέ το για: "ποια κουπόνια λήγουν σύντομα", "expiry alert".',
        {
            days: z.number().optional().describe('Σε πόσες ημέρες λήγουν, default 30'),
        },
        async ({ days = 30 }) => {
            const allCoupons = [];
            let page = 1;
            while (true) {
                const batch = await wc(`coupons?per_page=100&page=${page}`);
                if (batch.length === 0) break;
                allCoupons.push(...batch);
                if (batch.length < 100) break;
                page++;
            }

            const now = new Date();
            const future = new Date();
            future.setDate(future.getDate() + days);

            const expiring = allCoupons
                .filter(c => {
                    if (!c.date_expires) return false;
                    const expiry = new Date(c.date_expires);
                    return expiry >= now && expiry <= future;
                })
                .sort((a, b) => new Date(a.date_expires) - new Date(b.date_expires));

            const summary = expiring.map(c => ({
                code: c.code,
                amount: formatAmount(c),
                type: c.discount_type,
                expires: formatDateOnly(c.date_expires),
                usage_count: c.usage_count,
                usage_limit: c.usage_limit,
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        days_window: days,
                        count: summary.length,
                        coupons: summary,
                    }, null, 2)
                }]
            };
        }
    );

}
