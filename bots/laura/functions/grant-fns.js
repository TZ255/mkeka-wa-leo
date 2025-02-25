const SUBSCRIPTION_TYPES = {
    WIKI: {
        days: 7,
        amount: 7500,
        name: 'siku 7'
    },
    MONTHLY: {
        days: 30,
        amount: 25000,
        name: 'Mwezi 1'
    }
};

const formatDate = (date) => {
    return new Date(date).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' });
};

const generateSubscriptionMessage = (startDate, endDate, type) => {
    return {
        text: `Hongera 🎉 \nMalipo ya VIP MIKEKA yamethibitishwa kwa muda wa ${type} kuanzia *${formatDate(startDate)}* hadi *${formatDate(endDate)}*\n\nKwa mikeka yetu ya VIP kila siku, fungua \nhttps://mkekawaleo.com/mkeka/vip`,
        html: `<p>Hongera 🎉 <br> Malipo ya VIP MIKEKA yamethibitishwa kwa muda wa ${type} kuanzia <b>${formatDate(startDate)}</b> hadi <b>${formatDate(endDate)}</b></p>`
    };
};

const updateUserSubscription = async (user, endDate, now) => {
    user.status = 'paid';
    user.pay_until = endDate;
    user.payments.unshift({ paidOn: now, endedOn: endDate });
    await user.save();
};

module.exports = {
    SUBSCRIPTION_TYPES, generateSubscriptionMessage, updateUserSubscription
}