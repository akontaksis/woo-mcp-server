import { z } from 'zod';
import { formatPrice, productStatusGR, stockStatusGR } from '../lib/format.js';

export function registerProductTools(server, wc) {

    server.tool(
        'get_products',
        'Λίστα προϊόντων με βασικά στοιχεία (όνομα, SKU, τιμή, stock, κατηγορίες). Χρησιμοποίησέ το για: "δείξε μου προϊόντα", "αναζήτηση προϊόντος", "προϊόντα κατηγορίας X", "out of stock προϊόντα". ΟΧΙ για: λεπτομέρειες συγκεκριμένου προϊόντος (χρησιμοποίησε get_product_by_id) ή προϊόντα με χαμηλό stock (χρησιμοποίησε get_low_stock_products).',
        {
            search: z.string().optional().describe('Αναζήτηση με όνομα ή SKU'),
            category: z.string().optional().describe('ID κατηγορίας (πάρε το από get_product_categories)'),
            status: z.enum(['publish', 'draft', 'private', 'pending']).optional().describe('default publish'),
            stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).optional().describe('Φιλτράρισμα διαθεσιμότητας'),
            on_sale: z.boolean().optional().describe('Μόνο σε προσφορά'),
            per_page: z.number().optional().describe('Πόσα προϊόντα, default 10, max 100'),
        },
        async ({ search, category, status, stock_status, on_sale, per_page = 10 }) => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (category) params.append('category', category);
            if (status) params.append('status', status);
            if (stock_status) params.append('stock_status', stock_status);
            if (on_sale) params.append('on_sale', 'true');
            params.append('per_page', Math.min(per_page, 100));

            const products = await wc(`products?${params.toString()}`);

            const summary = products.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku || null,
                status: productStatusGR(p.status),
                price: formatPrice(p.price),
                regular_price: p.regular_price ? formatPrice(p.regular_price) : null,
                sale_price: p.sale_price ? formatPrice(p.sale_price) : null,
                on_sale: p.on_sale,
                stock_status: stockStatusGR(p.stock_status),
                stock_quantity: p.stock_quantity,
                categories: (p.categories || []).map(c => c.name),
            }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        count: summary.length,
                        products: summary,
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_product_by_id',
        'Πλήρεις λεπτομέρειες ενός προϊόντος (περιγραφή, τιμές, stock, διαστάσεις/βάρος, κατηγορίες, attributes, variations αν είναι variable). Χρησιμοποίησέ το όταν ο χρήστης ζητά "δείξε μου το προϊόν #X", "πληροφορίες για το προϊόν Y".',
        {
            id: z.number().describe('Το ID του προϊόντος')
        },
        async ({ id }) => {
            const p = await wc(`products/${id}`);

            const summary = {
                id: p.id,
                name: p.name,
                sku: p.sku || null,
                permalink: p.permalink,
                status: productStatusGR(p.status),
                type: p.type,
                price: formatPrice(p.price),
                regular_price: p.regular_price ? formatPrice(p.regular_price) : null,
                sale_price: p.sale_price ? formatPrice(p.sale_price) : null,
                on_sale: p.on_sale,
                stock_status: stockStatusGR(p.stock_status),
                stock_quantity: p.stock_quantity,
                manage_stock: p.manage_stock,
                weight: p.weight ? `${p.weight} kg` : null,
                dimensions: p.dimensions?.length || p.dimensions?.width || p.dimensions?.height
                    ? `${p.dimensions.length || '?'}×${p.dimensions.width || '?'}×${p.dimensions.height || '?'} cm`
                    : null,
                short_description: (p.short_description || '').replace(/<[^>]+>/g, '').slice(0, 300),
                categories: (p.categories || []).map(c => c.name),
                tags: (p.tags || []).map(t => t.name),
                attributes: (p.attributes || []).map(a => ({
                    name: a.name,
                    options: a.options,
                })),
                variations_count: (p.variations || []).length,
                total_sales: p.total_sales,
                date_created: p.date_created,
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
        'get_low_stock_products',
        'Προϊόντα με stock κάτω από κάποιο όριο. Σαρώνει όλα τα instock προϊόντα του store, όχι μόνο τα πρώτα. Χρησιμοποίησέ το για: "ποια προϊόντα τελειώνουν", "low stock alert", "πρέπει να ξαναπαραγγείλω;".',
        {
            threshold: z.number().optional().describe('Όριο stock, default 5'),
        },
        async ({ threshold = 5 }) => {
            const allInstock = [];
            let page = 1;
            while (true) {
                const batch = await wc(`products?stock_status=instock&per_page=100&page=${page}`);
                if (batch.length === 0) break;
                allInstock.push(...batch);
                if (batch.length < 100) break;
                page++;
            }

            const lowStock = allInstock
                .filter(p => p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= threshold)
                .sort((a, b) => (a.stock_quantity || 0) - (b.stock_quantity || 0))
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku || null,
                    stock_quantity: p.stock_quantity,
                    price: formatPrice(p.price),
                }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        threshold,
                        scanned_products: allInstock.length,
                        low_stock_count: lowStock.length,
                        products: lowStock,
                    }, null, 2)
                }]
            };
        }
    );

    server.tool(
        'get_product_categories',
        'Όλες οι κατηγορίες προϊόντων με αριθμό προϊόντων ανά κατηγορία. Χρησιμοποίησέ το για: "τι κατηγορίες έχουμε", "πόσα προϊόντα έχει κάθε κατηγορία", ή για να βρεις category ID πριν καλέσεις get_products με filter.',
        {},
        async () => {
            const allCategories = [];
            let page = 1;
            while (true) {
                const batch = await wc(`products/categories?per_page=100&page=${page}`);
                if (batch.length === 0) break;
                allCategories.push(...batch);
                if (batch.length < 100) break;
                page++;
            }

            const summary = allCategories
                .sort((a, b) => (b.count || 0) - (a.count || 0))
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                    parent: c.parent || null,
                    products_count: c.count,
                }));

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        total: summary.length,
                        categories: summary,
                    }, null, 2)
                }]
            };
        }
    );

}
