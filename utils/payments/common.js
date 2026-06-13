const SNIPPE_NETWORKS = new Set(['smile', 'halotel']);
const RENDERABLE_NETWORKS = new Set(['halotel', 'tigo', 'airtel', 'vodacom', 'smile']);
const DEFAULT_VIP_PAYMENT_PLAN = 'week';

const VIP_PAYMENT_PLANS = {
    day: {
        key: 'day',
        label: 'Siku 1',
        period: 'siku',
        displayAmount: 5999,
        clickpesaAmount: 5419,
        snippeAmount: 5999,
        grantKey: 'one',
    },
    week: {
        key: 'week',
        label: 'Siku 7',
        period: 'wiki',
        displayAmount: 12500,
        clickpesaAmount: 11580,
        snippeAmount: 12500,
        grantKey: 'auto_gold',
    },
    month: {
        key: 'month',
        label: 'Mwezi 1',
        period: 'mwezi',
        displayAmount: 35000,
        clickpesaAmount: 33850,
        snippeAmount: 35000,
        grantKey: 'gold2',
    },
};

const VIP_PAYMENT_PLAN_OPTIONS = [
    VIP_PAYMENT_PLANS.day,
    VIP_PAYMENT_PLANS.week,
    VIP_PAYMENT_PLANS.month,
];

const NETWORK_BY_PREFIX = {
    '60': 'unknown',
    '61': 'halotel',
    '62': 'halotel',
    '63': 'halotel',
    '64': 'unknown',
    '65': 'tigo',
    '66': 'airtel',
    '67': 'tigo',
    '68': 'airtel',
    '69': 'airtel',
    '70': 'tigo',
    '71': 'tigo',
    '72': 'unknown',
    '73': 'ttcl',
    '74': 'vodacom',
    '75': 'vodacom',
    '76': 'vodacom',
    '77': 'tigo',
    '78': 'airtel',
    '79': 'vodacom',
};

function normalizePhone(phone9 = '') {
    const phoneString = String(phone9).trim();

    if (!/^[67]\d{8}$/.test(phoneString)) {
        return null;
    }

    return `255${phoneString}`;
}

function normalizeName(name) {
    if (!name) return { firstName: 'Customer', lastName: '' };

    const parts = String(name).trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;

    return { firstName, lastName };
}

function generateOrderId() {
    return `WALEO${Date.now().toString(36)}`.toUpperCase();
}

function getNetworkBrand(phone = '') {
    const digits = String(phone).replace(/\D/g, '');
    let localPhone = digits;

    if (digits.startsWith('255') && digits.length >= 12) {
        localPhone = digits.slice(3);
    } else if (digits.startsWith('0') && digits.length >= 10) {
        localPhone = digits.slice(1);
    }

    const prefix = localPhone.slice(0, 2);
    return NETWORK_BY_PREFIX[prefix] || 'unknown';
}

function getRenderableNetwork(networkBrand = 'unknown') {
    const normalizedBrand = String(networkBrand).toLowerCase();
    return RENDERABLE_NETWORKS.has(normalizedBrand) ? normalizedBrand : 'unknown';
}

function selectPaymentGateway(networkBrand = 'unknown', phone = '') {
    return SNIPPE_NETWORKS.has(String(networkBrand).toLowerCase()) ? 'snippe' : 'clickpesa';
}

function isValidVipPaymentPlan(planKey) {
    return Object.prototype.hasOwnProperty.call(VIP_PAYMENT_PLANS, String(planKey || '').toLowerCase());
}

function getVipPaymentPlan(planKey = DEFAULT_VIP_PAYMENT_PLAN) {
    const normalizedPlan = String(planKey || DEFAULT_VIP_PAYMENT_PLAN).toLowerCase();
    return VIP_PAYMENT_PLANS[normalizedPlan] || VIP_PAYMENT_PLANS[DEFAULT_VIP_PAYMENT_PLAN];
}

function getVipPaymentAmount(plan, gateway = 'clickpesa') {
    const paymentPlan = getVipPaymentPlan(plan?.key || plan);
    return gateway === 'snippe' ? paymentPlan.snippeAmount : paymentPlan.clickpesaAmount;
}

module.exports = {
    DEFAULT_VIP_PAYMENT_PLAN,
    VIP_PAYMENT_PLAN_OPTIONS,
    VIP_PAYMENT_PLANS,
    generateOrderId,
    getNetworkBrand,
    getRenderableNetwork,
    getVipPaymentAmount,
    getVipPaymentPlan,
    isValidVipPaymentPlan,
    normalizeName,
    normalizePhone,
    selectPaymentGateway,
};
