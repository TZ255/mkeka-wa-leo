const axios = require('axios').default;
const mkekaUsersModel = require('../../../model/mkeka-users');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_EXPO_BATCH_SIZE = 100;
const DEFAULT_PUSH_TITLE = 'Mkeka Leo';
const DEFAULT_SCREEN = 'home';
const SCREEN_ROUTES = {
    home: '/',
    index: '/',
    mwanzo: '/',
    vip: '/vip',
    over15: '/over15',
    'over1.5': '/over15',
    over25: '/over25',
    'over2.5': '/over25'
};

function getHelpText() {
    return [
        'Mkeka Leo app push commands',
        '',
        'Reply to a message in this channel with:',
        'push all - send to every app user with notifications on',
        'push paid - send to paid VIP users only',
        'push free - send to free/unpaid users only',
        'push name@email.com - send to one user by email',
        '',
        'Optional flags:',
        '--title <title> - custom notification title',
        '--screen <home|vip|over15|over25> - page to open after tap',
        '',
        'Examples:',
        'push paid --title Leo Kumewaka. Odds 3.00 Bomba --screen vip',
        'push paid --screen vip --title Leo Kumewaka. Odds 3.00 Bomba',
        'push name@email.com --screen over15',
        '',
        'Send help to show this message again.'
    ].join('\n');
}

function getPushBody(sourceMessage) {
    return String(sourceMessage?.text || sourceMessage?.caption || '').trim();
}

function getAudienceQuery(audience) {
    const now = new Date();
    const hasPushToken = { 'pushTokens.0': { $exists: true } };

    if (audience === 'paid') {
        return {
            ...hasPushToken,
            status: 'paid',
            $or: [
                { pay_until: null },
                { pay_until: { $gt: now } }
            ]
        };
    }

    if (audience === 'free') {
        return {
            ...hasPushToken,
            $or: [
                { status: { $ne: 'paid' } },
                { pay_until: { $lte: now } }
            ]
        };
    }

    return hasPushToken;
}

function normalizeEmail(email) {
    const cleaned = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return '';

    return cleaned;
}

function normalizeScreen(screen) {
    const key = String(screen || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!Object.prototype.hasOwnProperty.call(SCREEN_ROUTES, key)) return DEFAULT_SCREEN;

    return key;
}

function getScreenRoute(screen) {
    const normalizedScreen = normalizeScreen(screen);
    return SCREEN_ROUTES[normalizedScreen] || SCREEN_ROUTES[DEFAULT_SCREEN];
}

function parsePushCommand(text) {
    const parts = String(text || '').trim().split(/\s+/);
    if (parts.shift()?.toLowerCase() !== 'push') return null;

    const target = parts.shift();
    if (!target) return null;

    const command = {
        audience: null,
        email: '',
        screen: DEFAULT_SCREEN,
        title: DEFAULT_PUSH_TITLE
    };

    if (['all', 'paid', 'free'].includes(target.toLowerCase())) {
        command.audience = target.toLowerCase();
    } else if (target.toLowerCase() === 'email') {
        command.audience = 'email';
        command.email = normalizeEmail(parts.shift());
    } else {
        const email = normalizeEmail(target);
        if (!email) return null;

        command.audience = 'email';
        command.email = email;
    }

    for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];

        if (part === '--screen') {
            command.screen = normalizeScreen(parts[index + 1]);
            index += 1;
            continue;
        }

        if (part === '--title') {
            const titleParts = [];

            for (let titleIndex = index + 1; titleIndex < parts.length; titleIndex += 1) {
                if (parts[titleIndex] === '--screen') break;
                titleParts.push(parts[titleIndex]);
            }

            const title = titleParts.join(' ').trim();
            if (title) command.title = title;
            index += titleParts.length;
        }
    }

    return command;
}

function getTokenList(users) {
    const tokens = new Set();

    users.forEach((user) => {
        (user.pushTokens || []).forEach((entry) => {
            if (/^Expo(nent)?PushToken\[[^\]]+\]$/.test(entry?.token || '')) {
                tokens.add(entry.token);
            }
        });
    });

    return Array.from(tokens);
}

function makeChunks(items, size) {
    const chunks = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}

function makeExpoMessage(token, body, command) {
    const url = getScreenRoute(command.screen);

    return {
        to: token,
        sound: 'default',
        title: command.title || DEFAULT_PUSH_TITLE,
        body: body.length > 180 ? body.slice(0, 177) + '...' : body,
        data: {
            audience: command.audience,
            screen: command.screen,
            source: 'laura',
            url
        }
    };
}

async function removeInvalidTokens(tokens) {
    if (!tokens.length) return;

    await mkekaUsersModel.updateMany(
        { 'pushTokens.token': { $in: tokens } },
        { $pull: { pushTokens: { token: { $in: tokens } } } }
    );
}

async function sendExpoPushes(tokens, body, command) {
    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    const tokenChunks = makeChunks(tokens, MAX_EXPO_BATCH_SIZE);

    for (const tokenChunk of tokenChunks) {
        const messages = tokenChunk.map((token) => makeExpoMessage(token, body, command));
        const response = await axios.post(EXPO_PUSH_URL, messages, {
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        const tickets = Array.isArray(response.data?.data) ? response.data.data : [];

        tickets.forEach((ticket, index) => {
            if (ticket.status === 'ok') {
                sent += 1;
                return;
            }

            failed += 1;
            if (ticket.details?.error === 'DeviceNotRegistered') {
                invalidTokens.push(tokenChunk[index]);
            }
        });

        if (!tickets.length) failed += tokenChunk.length;
    }

    await removeInvalidTokens(invalidTokens);

    return {
        failed,
        invalidTokenCount: invalidTokens.length,
        sent
    };
}

async function sendPushToAudience(command, body) {
    const users = await mkekaUsersModel
        .find(getAudienceQuery(command.audience))
        .select('pushTokens')
        .lean();
    const tokens = getTokenList(users);

    if (!tokens.length) {
        return {
            failed: 0,
            invalidTokenCount: 0,
            sent: 0,
            userCount: users.length
        };
    }

    const result = await sendExpoPushes(tokens, body, command);
    return {
        ...result,
        userCount: users.length
    };
}

async function sendPushToEmail(command, body) {
    if (!command.email) {
        return {
            email: '',
            failed: 0,
            invalidTokenCount: 0,
            sent: 0,
            userCount: 0,
            reason: 'invalid_email'
        };
    }

    const user = await mkekaUsersModel
        .findOne({ email: command.email })
        .select('email pushTokens')
        .lean();

    if (!user) {
        return {
            email: command.email,
            failed: 0,
            invalidTokenCount: 0,
            sent: 0,
            userCount: 0,
            reason: 'user_not_found'
        };
    }

    const tokens = getTokenList([user]);
    if (!tokens.length) {
        return {
            email: command.email,
            failed: 0,
            invalidTokenCount: 0,
            sent: 0,
            userCount: 1,
            reason: 'no_push_token'
        };
    }

    const result = await sendExpoPushes(tokens, body, command);
    return {
        ...result,
        email: command.email,
        userCount: 1
    };
}

async function handleMleoPushChannelPost(ctx, imp) {
    const channelPost = ctx.channelPost;
    const chatId = channelPost?.chat?.id;
    const text = String(channelPost?.text || '').trim();

    if (chatId !== imp.mleoPush || !text) return false;

    if (/^\/?help$/i.test(text)) {
        await ctx.reply(getHelpText(), { reply_to_message_id: channelPost.message_id });
        return true;
    }

    const command = parsePushCommand(text);
    if (!command) return false;

    if (!channelPost.reply_to_message) {
        await ctx.reply('Reply to the message you want to send, then use push all, push paid, or push free.', {
            reply_to_message_id: channelPost.message_id
        });
        return true;
    }

    const body = getPushBody(channelPost.reply_to_message);
    if (!body) {
        await ctx.reply('The replied message needs text or a caption for the push notification.', {
            reply_to_message_id: channelPost.message_id
        });
        return true;
    }

    const targetLabel = command.audience === 'email' ? command.email : command.audience;
    await ctx.reply(`Sending push to ${targetLabel}...`, {
        reply_to_message_id: channelPost.message_id
    });

    try {
        const result = command.audience === 'email'
            ? await sendPushToEmail(command, body)
            : await sendPushToAudience(command, body);

        if (result.reason === 'invalid_email') {
            await ctx.reply('Invalid email address. Use push name@email.com.', {
                reply_to_message_id: channelPost.message_id
            });
            return true;
        }

        if (result.reason === 'user_not_found') {
            await ctx.reply(`No user found for ${result.email}.`, {
                reply_to_message_id: channelPost.message_id
            });
            return true;
        }

        if (result.reason === 'no_push_token') {
            await ctx.reply(`${result.email} has no saved app push token yet. Ask them to login and allow notifications.`, {
                reply_to_message_id: channelPost.message_id
            });
            return true;
        }

        await ctx.reply(
            `Push ${targetLabel} complete.\nTitle: ${command.title}\nScreen: ${getScreenRoute(command.screen)}\nUsers matched: ${result.userCount}\nSent: ${result.sent}\nFailed: ${result.failed}\nRemoved bad tokens: ${result.invalidTokenCount}`,
            { reply_to_message_id: channelPost.message_id }
        );
    } catch (error) {
        console.error('Mleo push send error:', error);
        await ctx.reply('Push failed. Check server logs for details.', {
            reply_to_message_id: channelPost.message_id
        });
    }

    return true;
}

module.exports = {
    handleMleoPushChannelPost
};
