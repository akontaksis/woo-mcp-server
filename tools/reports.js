import { z } from 'zod';
import { formatPrice } from '../lib/format.js';

export function registerReportTools(server, wc) {

    server.tool(
        'get_sales_report',
        'Αναφορά πωλήσεων (συνολικά έσοδα, παραγγελίες, items, refunds, taxes, shipping) για μια χρονική περίοδο. Χρησιμοποίησέ το για: "πωλήσεις του μήνα", "πόσα έβγαλα φέτος", "έσοδα από...μέχρι...".',
        {
            period: z.enum(['week', 'month', 'last_month', 'year']).optional().describe('Προεπιλεγμένη περίοδος. Αν δοθεί date_min/date_max, αγνοείται.'),
            date_min: z.string().optional().describe('Από ημερομηνία YYYY-MM-DD'),
            date_max: z.string().optional().describe('Έως ημερομηνία YYYY-MM-DD'),
        },
        async ({ period, date_min, date_max }) => {
            const params = new URLSearchParams();
            if (date_min || date_max) {
                if (date_min) params.append('date_min', date_min);
                if (date_max) params.append('date_max', date_max);
            } else {
                params.append('period', period || 'month');
            }

            const report = await wc(`reports/sales?${params.toString()}`);
            const r = report[0] || {};

            const summary = {
                period: r.totals ? `${date_min || period || 'month'} → ${date_max || 'σήμερα'}` : null,
                total_sales: formatPrice(r.total_sales),
                net_sales: formatPrice(r.net_sales),
                total_orders: r.total_orders,
                total_items: r.total_items,
                total_tax: formatPrice(r.total_tax),
                total_shipping: formatPrice(r.total_shipping),
                total_refunds: r.total_refunds,
                total_discount: formatPrice(r.total_discount),
                average_sales: formatPrice(r.average_sales),
                total_customers: r.total_customers,
            };

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(summary, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_top_selling_products',
        'Τα προϊόντα που πούλησαν περισσότερα κομμάτια σε μια περίοδο. Χρησιμοποίησέ το για: "best sellers", "ποια προϊόντα πάνε καλύτερα", "top selling".',
        {
            period: z.enum(['week', 'month', 'last_month', 'year']).optional().describe('default month'),
            per_page: z.number().optional().describe('Πόσα προϊόντα, default 10'),
        },
        async ({ period = 'month', per_page = 10 }) => {
            const params = new URLSearchParams();
            params.append('period', period);
            params.append('per_page', per_page);

            const products = await wc(`reports/top_sellers?${params.toString()}`);

            const summary = products.map((p, i) => ({
                rank: i + 1,
                product_id: p.product_id,
                name: p.name,
                quantity_sold: p.quantity,
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        period,
                        count: summary.length,
                        products: summary,
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_orders_report',
        'Σύνολα παραγγελιών ανά κατάσταση (πόσες completed, processing, on-hold κλπ). Χρησιμοποίησέ το για: "πόσες παραγγελίες σε κάθε status", "γενική εικόνα παραγγελιών". ΣΗΜΕΙΩΣΗ: επιστρέφει ALL-TIME counts, όχι ανά περίοδο.',
        {},
        async () => {
            const report = await wc('reports/orders/totals');
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(report, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_products_report',
        'Σύνολα προϊόντων ανά τύπο (simple, variable, grouped κλπ). Χρησιμοποίησέ το για: "πόσα προϊόντα έχουμε", "κατανομή προϊόντων".',
        {},
        async () => {
            const report = await wc('reports/products/totals');
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(report, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_customers_report',
        'Σύνολα πελατών (registered customers vs guests). Χρησιμοποίησέ το για: "πόσοι πελάτες έχουν λογαριασμό", "guest vs registered".',
        {},
        async () => {
            const report = await wc('reports/customers/totals');
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(report, null, 2)
                }]
            };
        }
    );

}
