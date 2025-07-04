const affAnalyticsModel = require("../../model/affiliates-analytics");
const mkekaUsersModel = require("../../model/mkeka-users");
const { GLOBAL_VARS } = require("./global-var");
const sendEmail = require("./sendemail");
const { sendNormalSMS } = require("./sendSMS");

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
    return new Date(date).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

const generateSubscriptionMessage = (startDate, endDate, type, user, plan) => {
    return {
        text: `Hongera 🎉 \nMalipo ya VIP MIKEKA (${plan}) yamethibitishwa kwa muda wa ${type} kuanzia ${formatDate(startDate)} hadi ${formatDate(endDate)}\n\nAccount yako ni:\n📧 Email: ${user.email}\n🔑 Password: ${user.password}\n\nKwa mikeka yetu ya VIP kila siku, fungua \nhttps://mkekawaleo.com/mkeka/vip`,
        html: `<p>Hongera 🎉 <br> Malipo ya VIP MIKEKA (${plan}) yamethibitishwa kwa muda wa ${type} kuanzia <b>${formatDate(startDate)}</b> hadi <b>${formatDate(endDate)}</b></p> <p>Kwa mikeka yetu ya VIP kila siku kumbuka kutembelea <br> <a href="https://mkekawaleo.com/mkeka/vip?date=leo" class="text-success">www.mkekawaleo.com/mkeka/vip</a></p>`,
    };
};

const updateUserSubscription = async (user, endDate, now, plan) => {
    user.status = 'paid';
    user.plan = plan
    user.pay_until = endDate;
    user.payments.unshift({ paidOn: now, endedOn: endDate });
    await user.save();
};



// MAIN SUSCRIPTION FUNCTION
async function grantSubscription(email, param) {
    try {
        // Find user
        const user = await mkekaUsersModel.findOne({ email });
        if (!user) {
            return {
                success: true,
                grant_success: false,
                message: `No user found with email ${email}`
            };
        }

        // Handle unpaid status
        if (param === 'unpaid') {
            user.status = 'unpaid';
            user.plan = '0 plan';
            await user.save();
            return {
                success: true,
                message: `${email} status payment set to unpaid`
            };
        }

        // Handle subscriptions
        if (['silver', 'gold', 'gold2', 'one'].includes(param)) {
            const subscriptionMap = {
                'silver': SUBSCRIPTION_TYPES.SILVER,
                'gold': SUBSCRIPTION_TYPES.GOLD,
                'gold2': SUBSCRIPTION_TYPES.GOLD2,
                'one': SUBSCRIPTION_TYPES.one,
            };

            const subscriptionType = subscriptionMap[param];
            const now = Date.now();
            let endDate = now + (1000 * 60 * 60 * 24 * subscriptionType.days);

            if (param === 'gold2') {
                endDate = new Date(new Date(Date.now()).setMonth(new Date(Date.now()).getMonth() + 1)).getTime();
            }

            // Update user subscription
            await updateUserSubscription(user, endDate, now, subscriptionType.plan);

            // Generate and send messages
            const messages = generateSubscriptionMessage(now, endDate, subscriptionType.name, user, subscriptionType.plan);

            // Send email
            sendEmail(email.toLowerCase(), 'Malipo yako yamethibitishwa 🎉', messages.html)
                .catch(e => console.log(e?.message, e));

            // Update analytics if user is not admin
            const adminEmails = ['georgehmariki@gmail.com', 'janjatzblog@gmail.com', 'shmdgrg@gmail.com'];
            if (!adminEmails.includes(email.toLowerCase())) {
                await affAnalyticsModel.findOneAndUpdate(
                    { pid: 'shemdoe' },
                    { $inc: { vip_revenue: subscriptionType.amount } }
                );
            }

            return {
                success: true,
                grant_success: true,
                message: messages.text,
                message_html: messages.html,
                subscription: {
                    type: subscriptionType.name,
                    plan: subscriptionType.plan,
                    startDate: now,
                    endDate: endDate
                }
            };
        }

        return {
            success: true,
            grant_success: false,
            message: 'Invalid parameter. Use: silver, gold, gold2, one, or unpaid'
        };

    } catch (error) {
        console.error('Grant subscription error:', error);
        return {
            success: false,
            grant_success: false,
            message: 'An error occurred while processing your request. Please try again.',
            error: error.message
        };
    }
}

module.exports = grantSubscription;

module.exports = {
    grantSubscription
}