const PROVIDERS = {
    'Gal Sport': {
        company: 'Gal Sport',
        label: 'Gal Sport Betting',
        register_link: '/gsb/register'
    },
    Betway: {
        company: 'Betway',
        label: 'Betway',
        register_link: '/betway/register'
    },
    Leonbet: {
        company: 'Leonbet',
        label: 'Leonbet',
        register_link: '/leonbet/register'
    }
};

const VIP_NUMBERS = [1, 2, 3, 4];
const DEFAULT_PROVIDER = PROVIDERS['Gal Sport'];
const SHOWCASE_STAKE = 30000;

const toDdMmYyyy = (dateValue) => {
    if (!dateValue) return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi' }).format(new Date());
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) return dateValue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue.split('-').reverse().join('/');
    return dateValue;
};

const toJsDate = (dateValue) => {
    if (!dateValue) return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) return dateValue.split('/').reverse().join('-');
    return dateValue;
};

const getProviderMeta = (company) => {
    return PROVIDERS[company] || DEFAULT_PROVIDER;
};

const getBookingForSlip = (bookingDocs = [], slipNo) => {
    const booking = bookingDocs.find((item) => Number(item.slip_no) === Number(slipNo));
    const provider = getProviderMeta(booking?.company);
    return {
        code: booking?.code || '---',
        company: provider.company,
        label: booking?.label || provider.label,
        register_link: booking?.register_link || provider.register_link
    };
};

const maskBookingCode = (code = '---') => {
    const value = String(code || '---').trim();
    if (!value || value === '---') return '---';
    if (value.length <= 4) return `${value.slice(0, 1)}***`;
    return `${value.slice(0, 2)}${'*'.repeat(Math.max(3, value.length - 4))}${value.slice(-2)}`;
};

const totalOddsForTips = (tips = []) => {
    return tips.reduce((product, tip) => {
        const odds = Number(tip.odd || tip.odds);
        return odds > 0 ? product * odds : product;
    }, 1);
};

const averageAccuracyForTips = (tips = []) => {
    const values = tips.map((tip) => Number(tip.accuracy)).filter((value) => Number.isFinite(value) && value > 0);
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const parseStartTime = (dateValue, timeValue) => {
    if (!dateValue || !timeValue || !/^\d{2}:\d{2}/.test(String(timeValue))) return null;
    const jsDate = toJsDate(dateValue);
    const time = String(timeValue).slice(0, 5);
    const parsed = new Date(`${jsDate}T${time}:00+03:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCountdown = (tips = []) => {
    const starts = tips
        .map((tip) => parseStartTime(tip.date, tip.time))
        .filter(Boolean)
        .sort((a, b) => a - b);

    if (!starts.length) return { label: '--', expired: false, startsAt: null };

    const lastStart = starts[starts.length - 1];
    const diff = lastStart.getTime() - Date.now();
    if (diff <= 0) return { label: 'Expired', expired: true, startsAt: lastStart };

    const totalMinutes = Math.ceil(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);

    return { label: parts.join(' '), expired: false, startsAt: lastStart };
};

const buildVipSlips = ({ tips = [], bookingDocs = [] } = {}) => {
    return VIP_NUMBERS.map((vipNo) => {
        const slipTips = tips
            .filter((tip) => Number(tip.vip_no) === vipNo && tip.status !== 'deleted')
            .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

        const totalOdds = totalOddsForTips(slipTips);
        const booking = getBookingForSlip(bookingDocs, vipNo);

        return {
            no: vipNo,
            title: `VIP Betslip #${vipNo}`,
            tips: slipTips,
            totalOdds: totalOdds.toFixed(2),
            averageAccuracy: Math.round(averageAccuracyForTips(slipTips)),
            booking,
            maskedBookingCode: maskBookingCode(booking.code),
            countdown: getCountdown(slipTips),
            potentialWin: Math.trunc(totalOdds * SHOWCASE_STAKE),
            stake: SHOWCASE_STAKE
        };
    });
};

const buildVipSummary = (vipSlips = [], stake = SHOWCASE_STAKE) => {
    const activeSlips = vipSlips.filter((slip) => slip.tips.length > 0);
    const totalOdds = activeSlips.reduce((sum, slip) => sum + Number(slip.totalOdds || 0), 0);
    const totalStake = activeSlips.length * stake;
    const totalPotentialWin = activeSlips.reduce((sum, slip) => sum + Math.trunc(Number(slip.totalOdds || 0) * stake), 0);

    return {
        slipCount: activeSlips.length,
        stake,
        totalOdds: totalOdds.toFixed(2),
        totalStake,
        totalPotentialWin
    };
};

module.exports = {
    PROVIDERS,
    VIP_NUMBERS,
    SHOWCASE_STAKE,
    toDdMmYyyy,
    toJsDate,
    getProviderMeta,
    buildVipSlips,
    buildVipSummary,
    maskBookingCode
};
