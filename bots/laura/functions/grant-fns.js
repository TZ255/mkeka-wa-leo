const SUBSCRIPTION_TYPES = {
    SILVER: {
        days: 7,
        plan: 'Silver Plan',
        amount: 7500,
        name: 'Siku 7'
    },
    GOLD: {
        days: 7,
        plan: 'Gold Plan',
        amount: 12500,
        name: 'Siku 7'
    },
    GOLD2: {
        days: 30,
        plan: 'Gold Plan',
        amount: 25000,
        name: 'Mwezi 1'
    },
    one: {
        days: 1,
        plan: 'Gold Plan',
        amount: 0,
        name: 'Siku 1'
    }
};

const formatDate = (date) => {
    return new Date(date).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' });
};

const generateSubscriptionMessage = (startDate, endDate, type, user, plan) => {
    return {
        text: `Hongera 🎉 \nMalipo ya VIP MIKEKA (${plan}) yamethibitishwa kwa muda wa ${type} kuanzia *${formatDate(startDate)}* hadi *${formatDate(endDate)}*\n\nAccount yako ni:\n📧 Email: *${user.email}*\n🔑 Password: *${user.password}*\n\nKwa mikeka yetu ya VIP kila siku, fungua \nhttps://mkekawaleo.com/mkeka/vip`,
        html: `<p>Hongera 🎉 <br> Malipo ya VIP MIKEKA (${plan}) yamethibitishwa kwa muda wa ${type} kuanzia <b>${formatDate(startDate)}</b> hadi <b>${formatDate(endDate)}</b></p>`
    };
};

const updateUserSubscription = async (user, endDate, now, plan) => {
    user.status = 'paid';
    user.plan = plan
    user.pay_until = endDate;
    user.payments.unshift({ paidOn: now, endedOn: endDate });
    await user.save();
};

module.exports = {
    SUBSCRIPTION_TYPES, generateSubscriptionMessage, updateUserSubscription
}