import { z } from 'zod';
import { formatPrice, formatDate, orderStatusGR } from '../lib/format.js';

export function registerOrderTools(server, wc) {

    server.tool(
        'get_orders',
        'Λίστα παραγγελιών με σύνοψη κάθε μίας (πελάτης, σύνολο, status, items). Επιστρέφει επίσης σύνοψη: συνολικά έσοδα, μέση παραγγελία, κατανομή ανά status. Χρησιμοποίησέ το για: "δείξε μου παραγγελίες", "παραγγελίες σε processing", "πρόσφατες παραγγελίες", "παραγγελίες πελάτη X". ΟΧΙ για: λεπτομέρειες συγκεκριμένης παραγγελίας (χρησιμοποίησε get_order_by_id).',
        {
            status: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'any']).optional().describe('Φιλτράρισμα κατάστασης, default any'),
            per_page: z.number().optional().describe('Πόσες παραγγελίες, default 10, max 100'),
            search: z.string().optional().describe('Αναζήτηση με όνομα/email πελάτη ή αριθμό παραγγελίας'),
            customer: z.number().optional().describe('Φιλτράρισμα με WP user ID πελάτη'),
            after: z.string().optional().describe('Από ημερομηνία (ISO 8601, π.χ. 2026-01-01)'),
            before: z.string().optional().describe('Έως ημερομηνία (ISO 8601, π.χ. 2026-12-31)'),
        },
        async ({ status, per_page = 10, search, customer, after, before }) => {
            const params = new URLSearchParams();
            if (status && status !== 'any') params.append('status', status);
            if (search) params.append('search', search);
            if (customer) params.append('customer', customer);
            if (after) params.append('after', after);
            if (before) params.append('before', before);
            params.append('per_page', Math.min(per_page, 100));

            const orders = await wc(`orders?${params.toString()}`);

            const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            const byStatus = orders.reduce((acc, o) => {
                acc[orderStatusGR(o.status)] = (acc[orderStatusGR(o.status)] || 0) + 1;
                return acc;
            }, {});

            const list = orders.map(o => ({
                id: o.id,
                status: orderStatusGR(o.status),
                customer: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || '(guest)',
                email: o.billing?.email || null,
                total: formatPrice(o.total),
                date: formatDate(o.date_created),
                items: (o.line_items || []).map(i => `${i.name} ×${i.quantity}`),
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        summary: {
                            count: orders.length,
                            total_revenue: formatPrice(totalRevenue),
                            average_order: formatPrice(orders.length > 0 ? totalRevenue / orders.length : 0),
                            by_status: byStatus,
                        },
                        orders: list,
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_order_by_id',
        'Πλήρεις λεπτομέρειες μιας παραγγελίας (πελάτης, διεύθυνση, items με τιμές, μέθοδος πληρωμής/αποστολής, σύνολα). Χρησιμοποίησέ το όταν ο χρήστης λέει "δείξε μου την παραγγελία #X", "λεπτομέρειες παραγγελίας Y".',
        {
            id: z.number().describe('Το ID της παραγγελίας')
        },
        async ({ id }) => {
            const o = await wc(`orders/${id}`);

            const summary = {
                id: o.id,
                number: o.number,
                status: orderStatusGR(o.status),
                date: formatDate(o.date_created),
                date_paid: formatDate(o.date_paid),
                date_completed: formatDate(o.date_completed),
                customer: {
                    id: o.customer_id || null,
                    name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || '(guest)',
                    email: o.billing?.email || null,
                    phone: o.billing?.phone || null,
                },
                billing_address: o.billing ? `${o.billing.address_1 || ''}, ${o.billing.city || ''}, ${o.billing.postcode || ''}, ${o.billing.country || ''}`.trim() : null,
                shipping_address: o.shipping ? `${o.shipping.address_1 || ''}, ${o.shipping.city || ''}, ${o.shipping.postcode || ''}, ${o.shipping.country || ''}`.trim() : null,
                payment_method: o.payment_method_title || null,
                shipping_method: (o.shipping_lines || []).map(s => s.method_title).join(', ') || null,
                items: (o.line_items || []).map(i => ({
                    name: i.name,
                    sku: i.sku,
                    quantity: i.quantity,
                    price: formatPrice(i.price),
                    subtotal: formatPrice(i.subtotal),
                    total: formatPrice(i.total),
                })),
                totals: {
                    subtotal: formatPrice((o.line_items || []).reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)),
                    shipping: formatPrice(o.shipping_total),
                    tax: formatPrice(o.total_tax),
                    discount: formatPrice(o.discount_total),
                    total: formatPrice(o.total),
                },
                customer_note: o.customer_note || null,
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(summary, null, 2)
                }]
            };
        }
    );

}
