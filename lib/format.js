const ORDER_STATUS_GR = {
    'pending': 'Σε αναμονή πληρωμής',
    'processing': 'Σε επεξεργασία',
    'on-hold': 'Σε αναμονή',
    'completed': 'Ολοκληρωμένη',
    'cancelled': 'Ακυρωμένη',
    'refunded': 'Επιστροφή χρημάτων',
    'failed': 'Απέτυχε',
    'trash': 'Στον κάδο',
};

const PRODUCT_STATUS_GR = {
    'publish': 'Δημοσιευμένο',
    'draft': 'Πρόχειρο',
    'private': 'Ιδιωτικό',
    'pending': 'Εκκρεμεί',
};

const STOCK_STATUS_GR = {
    'instock': 'Διαθέσιμο',
    'outofstock': 'Εξαντλημένο',
    'onbackorder': 'Σε προπαραγγελία',
};

export function formatPrice(amount, currency = 'EUR') {
    const num = parseFloat(amount);
    if (isNaN(num)) return '€0,00';
    return new Intl.NumberFormat('el-GR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(num);
}

export function formatDate(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

export function formatDateOnly(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d);
}

export const orderStatusGR = (status) => ORDER_STATUS_GR[status] || status;
export const productStatusGR = (status) => PRODUCT_STATUS_GR[status] || status;
export const stockStatusGR = (status) => STOCK_STATUS_GR[status] || status;
