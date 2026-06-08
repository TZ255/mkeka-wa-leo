const {
    generateClickPesaToken,
    getClickPesaAccountBalance,
    getClickPesaAccountStatement,
} = require('../../../utils/payments/clickpesa');

const isClickPesaStatementDate = (value) => /^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/.test(String(value || '').trim());

const getDateStringForTimeZone = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return `${parts.year}-${parts.month}-${parts.day}`;
};

const getNairobiDateString = () => getDateStringForTimeZone(new Date(), 'Africa/Nairobi');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[char]));

const normalizeClickPesaStatementDate = (value) => {
    const date = String(value || '').trim();
    const ddmmyyyy = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    return date;
};

const parseClickPesaStatementCommand = (input) => {
    const result = {};
    const tokens = String(input || '').trim().split(/\s+/).filter(Boolean);

    for (const token of tokens) {
        const value = token.trim();

        if (isClickPesaStatementDate(value) && !result.startDate) {
            result.startDate = value;
            continue;
        }

        if (isClickPesaStatementDate(value) && !result.endDate) {
            result.endDate = value;
            continue;
        }

        throw new Error('Usage: /clickpesa_statement [startDate] [endDate]\nExample: /cp_statement 2026-06-01 2026-06-08');
    }

    if (!result.startDate && !result.endDate) {
        const today = getNairobiDateString();
        result.startDate = today;
        result.endDate = today;
    }

    result.startDate = normalizeClickPesaStatementDate(result.startDate);
    result.endDate = normalizeClickPesaStatementDate(result.endDate || result.startDate);

    return result;
};

const getClickPesaStatementWindow = (filters) => {
    const startDate = normalizeClickPesaStatementDate(filters.startDate);
    const endDate = normalizeClickPesaStatementDate(filters.endDate || filters.startDate);
    const windowStart = new Date(`${startDate}T00:00:00.000+03:00`);
    const windowEnd = new Date(`${endDate}T23:59:59.999+03:00`);

    if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime()) || windowEnd < windowStart) {
        throw new Error('Invalid date range. Use: /cp_statement 2026-06-01 2026-06-08');
    }

    return {
        startDate,
        endDate,
        startTime: windowStart.getTime(),
        endTime: windowEnd.getTime(),
        queryStartDate: windowStart.toISOString().slice(0, 10),
        queryEndDate: windowEnd.toISOString().slice(0, 10),
    };
};

const filterClickPesaStatementForWindow = (statement, window) => {
    const transactions = Array.isArray(statement?.transactions) ? statement.transactions : [];

    return {
        ...statement,
        transactions: transactions.filter((tx) => {
            const timestamp = new Date(tx?.date).getTime();
            return Number.isFinite(timestamp) && timestamp >= window.startTime && timestamp <= window.endTime;
        }),
    };
};

const formatClickPesaAmount = (amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return `${escapeHtml(amount)} TZS`;
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} TZS`;
};

const formatClickPesaTransactionDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value || '-');
    return `${escapeHtml(date.toLocaleString('sv-SE', { timeZone: 'Africa/Nairobi', hour12: false }))} EAT`;
};

const getClickPesaBalanceValue = (balanceData) => {
    const balances = Array.isArray(balanceData?.balances) ? balanceData.balances : balanceData;
    const entry = Array.isArray(balances)
        ? balances.find((item) => item?.currency === 'TZS') || balances[0]
        : balances;

    return entry?.balance;
};

const formatClickPesaAccountStatement = (statement, filters, balanceData) => {
    const transactions = Array.isArray(statement?.transactions) ? statement.transactions : [];
    const shownTransactions = transactions.slice(0, 12);
    const paymentAmount = transactions.reduce((total, tx) => {
        if (String(tx?.type || '').trim().toLowerCase() !== 'payment') return total;
        const amount = Number(tx?.amount);
        if (!Number.isFinite(amount)) return total;
        return total + amount;
    }, 0);
    const dateRange = `${filters.startDate} to ${filters.endDate}`;

    let text = `<b>ClickPesa Account Statement</b>\n`;
    text += `Currency: <code>TZS</code>\n`;
    text += `Period: <code>${escapeHtml(dateRange)}</code> Africa/Nairobi\n\n`;
    text += `<b>Summary</b>\n`;
    text += `Account Balance: ${formatClickPesaAmount(getClickPesaBalanceValue(balanceData))}\n`;
    text += `Payments: ${formatClickPesaAmount(paymentAmount)}\n`;
    text += `Transactions: ${transactions.length}\n`;

    if (!shownTransactions.length) return `${text}\nNo transactions found.`;

    text += `\n<b>Transactions${transactions.length > shownTransactions.length ? ` - showing ${shownTransactions.length}` : ''}</b>\n`;
    text += shownTransactions.map((tx, index) => {
        const date = formatClickPesaTransactionDate(tx.date);
        const description = escapeHtml(tx.description || '-');
        const reference = escapeHtml(tx.orderReference || tx.id || '-');

        return `${index + 1}. <code>${date}</code>\n${description}\nAmount: ${formatClickPesaAmount(tx.amount)}\nBalance: ${formatClickPesaAmount(tx.balance)}\nRef: <code>${reference}</code>`;
    }).join('\n\n');

    return text;
};

async function handleClickPesaStatementCommand(ctx) {
    await ctx.replyWithChatAction('typing');

    const filters = parseClickPesaStatementCommand(ctx.match);
    const window = getClickPesaStatementWindow(filters);
    const token = await generateClickPesaToken();
    const [statement, balance] = await Promise.all([
        getClickPesaAccountStatement({
            startDate: window.queryStartDate,
            endDate: window.queryEndDate,
            token,
        }),
        getClickPesaAccountBalance({ token }),
    ]);
    const filteredStatement = filterClickPesaStatementForWindow(statement, window);
    const text = formatClickPesaAccountStatement(filteredStatement, filters, balance);

    return ctx.reply(text, { parse_mode: 'HTML' });
}

module.exports = { handleClickPesaStatementCommand };
