import { createWooClient } from './lib/woocommerce.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const site = process.env.SITE || 'capitano';
dotenv.config({ path: resolve(__dirname, `sites/${site}.env`) });

const wc = createWooClient(
    process.env.WC_URL,
    process.env.WC_KEY,
    process.env.WC_SECRET
);

const results = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        const result = await fn();
        console.log(`✅ ${name.padEnd(34)} ${result}`);
        results.push({ name, status: 'pass', info: result });
        passed++;
    } catch (err) {
        console.log(`❌ ${name.padEnd(34)} ${err.message}`);
        results.push({ name, status: 'fail', error: err.message });
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg);
}

console.log(`\n🧪 WooCommerce MCP - Test Suite`);
console.log(`📡 Site: ${process.env.SITE_NAME || site}`);
console.log(`🌐 URL: ${process.env.WC_URL}`);
console.log(`${'─'.repeat(70)}\n`);

// ── ORDERS ──────────────────────────────────────────────────
console.log('📦 ORDERS');

await test('get_orders', async () => {
    const data = await wc('orders?per_page=5');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    if (data.length > 0) {
        assert(data[0].id, 'Λείπει id από order');
        assert(data[0].status, 'Λείπει status');
        assert(data[0].total !== undefined, 'Λείπει total');
    }
    return `${data.length} παραγγελίες`;
});

await test('get_orders (status=processing)', async () => {
    const data = await wc('orders?status=processing&per_page=5');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} παραγγελίες σε processing`;
});

await test('get_order_by_id', async () => {
    const orders = await wc('orders?per_page=1');
    if (!orders.length) throw new Error('Δεν υπάρχουν παραγγελίες');
    const order = await wc(`orders/${orders[0].id}`);
    assert(order.id, 'Δεν επέστρεψε παραγγελία');
    assert(order.line_items, 'Λείπουν line_items');
    return `ID #${order.id} - ${order.status} - ${order.line_items.length} items`;
});

// ── PRODUCTS ─────────────────────────────────────────────────
console.log('\n🛍️  PRODUCTS');

await test('get_products', async () => {
    const data = await wc('products?per_page=10');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    if (data.length > 0) {
        assert(data[0].id, 'Λείπει id');
        assert(data[0].name, 'Λείπει name');
    }
    return `${data.length} προϊόντα`;
});

await test('get_products (outofstock)', async () => {
    const data = await wc('products?stock_status=outofstock&per_page=10');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    if (data.length > 0) {
        assert(data[0].stock_status === 'outofstock', `Λάθος stock_status: ${data[0].stock_status}`);
    }
    return `${data.length} out of stock`;
});

await test('get_product_by_id', async () => {
    const products = await wc('products?per_page=1');
    if (!products.length) throw new Error('Δεν υπάρχουν προϊόντα');
    const product = await wc(`products/${products[0].id}`);
    assert(product.id, 'Δεν επέστρεψε προϊόν');
    return `ID #${product.id} - ${product.name.slice(0, 30)}`;
});

await test('get_product_categories', async () => {
    const data = await wc('products/categories?per_page=100');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} κατηγορίες`;
});

await test('get_low_stock_products (paginated scan)', async () => {
    const allInstock = [];
    let page = 1;
    while (true) {
        const batch = await wc(`products?stock_status=instock&per_page=100&page=${page}`);
        if (batch.length === 0) break;
        allInstock.push(...batch);
        if (batch.length < 100) break;
        page++;
    }
    const low = allInstock.filter(p => p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5);
    return `${low.length} με stock ≤ 5 (από ${allInstock.length} instock)`;
});

// ── CUSTOMERS ────────────────────────────────────────────────
console.log('\n👥 CUSTOMERS');

await test('get_customers', async () => {
    const data = await wc('customers?per_page=10');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    if (data.length > 0) {
        assert(data[0].id, 'Λείπει id');
        assert(data[0].email, 'Λείπει email');
    }
    return `${data.length} πελάτες`;
});

await test('get_top_customers (wc-analytics)', async () => {
    const data = await wc.analytics('customers?per_page=5&orderby=total_spend&order=desc');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    if (data.length > 0) {
        assert(data[0].total_spend !== undefined, 'Λείπει total_spend (analytics endpoint broken)');
        assert(data[0].orders_count !== undefined, 'Λείπει orders_count');
    }
    const top = data[0];
    return `Top: ${top?.name || 'N/A'} - €${top?.total_spend || 0} (${top?.orders_count || 0} orders)`;
});

await test('get_customer_by_id (with computed stats)', async () => {
    const customers = await wc('customers?per_page=1');
    if (!customers.length) throw new Error('Δεν υπάρχουν πελάτες');
    const customer = await wc(`customers/${customers[0].id}`);
    const orders = await wc(`orders?customer=${customers[0].id}&per_page=100`);
    assert(customer.id, 'Δεν επέστρεψε πελάτη');
    return `ID #${customer.id} - ${customer.first_name} ${customer.last_name} (${orders.length} orders)`;
});

// ── REPORTS ──────────────────────────────────────────────────
console.log('\n📊 REPORTS');

await test('get_sales_report (month)', async () => {
    const data = await wc('reports/sales?period=month');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `Σύνολο: €${data[0]?.total_sales || 0}`;
});

await test('get_top_selling_products', async () => {
    const data = await wc('reports/top_sellers?period=month&per_page=5');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} top products`;
});

await test('get_orders_report', async () => {
    const data = await wc('reports/orders/totals');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} κατηγορίες`;
});

await test('get_products_report', async () => {
    const data = await wc('reports/products/totals');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} κατηγορίες`;
});

await test('get_customers_report', async () => {
    const data = await wc('reports/customers/totals');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} κατηγορίες`;
});

// ── COUPONS ──────────────────────────────────────────────────
console.log('\n🎟️  COUPONS');

await test('get_coupons', async () => {
    const data = await wc('coupons?per_page=10');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    return `${data.length} κουπόνια`;
});

await test('get_expiring_coupons', async () => {
    const data = await wc('coupons?per_page=100');
    assert(Array.isArray(data), 'Δεν επέστρεψε array');
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const expiring = data.filter(c => {
        if (!c.date_expires) return false;
        const expiry = new Date(c.date_expires);
        return expiry >= now && expiry <= future;
    });
    return `${expiring.length} λήγουν μέσα σε 30 μέρες`;
});

// ── FORMAT HELPERS ───────────────────────────────────────────
console.log('\n🔧 FORMAT HELPERS');

const { formatPrice, formatDate, orderStatusGR, stockStatusGR } = await import('./lib/format.js');

await test('formatPrice', async () => {
    assert(formatPrice(45.5).includes('45,50'), `Λάθος format: ${formatPrice(45.5)}`);
    assert(formatPrice(0).includes('0,00'), 'Λάθος για 0');
    assert(formatPrice('invalid').includes('0,00'), 'Λάθος για invalid');
    return 'EUR formatting OK';
});

await test('formatDate', async () => {
    const d = formatDate('2026-04-30T14:36:06');
    assert(d && d.includes('30'), `Λάθος date: ${d}`);
    assert(formatDate(null) === null, 'Δεν επιστρέφει null για null');
    return `'${d}'`;
});

await test('orderStatusGR', async () => {
    assert(orderStatusGR('processing') === 'Σε επεξεργασία', `Λάθος: ${orderStatusGR('processing')}`);
    assert(orderStatusGR('unknown') === 'unknown', 'Δεν fallback σε unknown');
    return 'Translations OK';
});

await test('stockStatusGR', async () => {
    assert(stockStatusGR('instock') === 'Διαθέσιμο');
    assert(stockStatusGR('outofstock') === 'Εξαντλημένο');
    return 'OK';
});

// ── SUMMARY ──────────────────────────────────────────────────
console.log(`\n${'─'.repeat(70)}`);
console.log(`📋 ΑΠΟΤΕΛΕΣΜΑΤΑ: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log(`🎉 Όλα τα tests πέρασαν! (${passed}/${passed})\n`);
} else {
    console.log(`⚠️  ${failed} tests απέτυχαν!\n`);
    console.log('❌ Failed tests:');
    results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    console.log('');
    process.exit(1);
}
