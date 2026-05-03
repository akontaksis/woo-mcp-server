import { z } from 'zod';
import { formatPrice, formatDate, formatDateOnly, orderStatusGR } from '../lib/format.js';

export function registerCustomerTools(server, wc) {

    server.tool(
        'get_customers',
        'Λίστα εγγεγραμμένων πελατών (registered users) του store με βασικά στοιχεία επικοινωνίας. Χρησιμοποίησέ το για: "δείξε μου πελάτες", "νέοι πελάτες", "αναζήτηση πελάτη με email/όνομα". ΟΧΙ για: top spenders (χρησιμοποίησε get_top_customers) ή συγκεκριμένο πελάτη με ID (χρησιμοποίησε get_customer_by_id). ΣΗΜΕΙΩΣΗ: Δεν επιστρέφει total_spent/orders_count — αυτά τα δίνει το get_top_customers ή get_customer_by_id.',
        {
            search: z.string().optional().describe('Αναζήτηση με όνομα ή email'),
            per_page: z.number().optional().describe('Πόσους πελάτες, default 10, max 100'),
            orderby: z.enum(['registered_date', 'name', 'email', 'id']).optional().describe('Πεδίο ταξινόμησης, default registered_date'),
            order: z.enum(['asc', 'desc']).optional().describe('asc ή desc, default desc'),
        },
        async ({ search, per_page = 10, orderby = 'registered_date', order = 'desc' }) => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('per_page', Math.min(per_page, 100));
            params.append('orderby', orderby === 'registered_date' ? 'registered_date' : orderby);
            params.append('order', order);

            const customers = await wc(`customers?${params.toString()}`);

            const summary = customers.map(c => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`.trim() || '(χωρίς όνομα)',
                email: c.email,
                username: c.username,
                date_registered: formatDateOnly(c.date_created),
                city: c.billing?.city || null,
                phone: c.billing?.phone || null,
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        count: summary.length,
                        customers: summary,
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_customer_by_id',
        'Φέρνει πλήρες προφίλ πελάτη με στατιστικά (συνολικά έξοδα, αριθμός παραγγελιών, μέση παραγγελία) και τις τελευταίες 5 παραγγελίες του. Χρησιμοποίησέ το όταν ο χρήστης ζητά "δείξε μου τον πελάτη #X", "πληροφορίες για τον πελάτη με ID Y".',
        {
            id: z.number().describe('Το WP user ID του πελάτη')
        },
        async ({ id }) => {
            const [customer, orders] = await Promise.all([
                wc(`customers/${id}`),
                wc(`orders?customer=${id}&per_page=100`)
            ]);

            const totalSpent = orders
                .filter(o => ['completed', 'processing'].includes(o.status))
                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            const ordersCount = orders.length;
            const avgOrder = ordersCount > 0 ? totalSpent / ordersCount : 0;

            const summary = {
                id: customer.id,
                name: `${customer.first_name} ${customer.last_name}`.trim() || '(χωρίς όνομα)',
                email: customer.email,
                username: customer.username,
                phone: customer.billing?.phone || null,
                city: customer.billing?.city || null,
                country: customer.billing?.country || null,
                date_registered: formatDate(customer.date_created),
                stats: {
                    orders_count: ordersCount,
                    total_spent: formatPrice(totalSpent),
                    avg_order: formatPrice(avgOrder),
                },
                last_5_orders: orders.slice(0, 5).map(o => ({
                    id: o.id,
                    status: orderStatusGR(o.status),
                    total: formatPrice(o.total),
                    date: formatDate(o.date_created),
                }))
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
        'get_top_customers',
        'Επιστρέφει τους πελάτες με τα μεγαλύτερα συνολικά έξοδα (top spenders), με στατιστικά: παραγγελίες, σύνολο εξόδων, μέση παραγγελία, ημερομηνία τελευταίας παραγγελίας. Χρησιμοποίησέ το για: "καλύτεροι πελάτες", "ποιοι ξοδεύουν περισσότερα", "VIP πελάτες", "ranking πελατών". Χρησιμοποιεί το wc-analytics endpoint οπότε επιστρέφει μόνο πελάτες που έχουν κάνει παραγγελίες.',
        {
            per_page: z.number().optional().describe('Πόσους πελάτες, default 10, max 100'),
        },
        async ({ per_page = 10 }) => {
            const customers = await wc.analytics(
                `customers?per_page=${Math.min(per_page, 100)}&orderby=total_spend&order=desc`
            );

            const summary = customers.map((c, index) => ({
                rank: index + 1,
                name: c.name || `${c.first_name} ${c.last_name}`.trim() || '(χωρίς όνομα)',
                email: c.email,
                country: c.country,
                orders_count: c.orders_count,
                total_spent: formatPrice(c.total_spend),
                avg_order: formatPrice(c.avg_order_value),
                last_order_date: formatDateOnly(c.date_last_order),
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(summary, null, 2)
                }]
            };
        }
    );

}
