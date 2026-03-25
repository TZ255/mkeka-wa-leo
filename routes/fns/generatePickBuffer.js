const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

const WIDTH = 1200;
const HEIGHT = 440;

// Colors
const BG_DARK = '#0b1219';
const CARD_TOP = '#14222e';
const CARD_BOT = '#0f1a24';
const TEXT_WHITE = '#f0f2f5';
const TEXT_LIGHT = '#c4cdd8';
const TEXT_MUTED = '#6b7f92';
const GREEN = '#00e676';
const GREEN_DIM = 'rgba(0, 230, 118, 0.08)';
const BORDER = '#1e3044';
const FOOTER_BG = '#0d1820';

/**
 * Fetch an image URL and return a canvas-compatible Image, or null on failure.
 */
async function fetchLogo(url) {
    if (!url) return null;
    try {
        const { data } = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
        });
        return await loadImage(Buffer.from(data));
    } catch {
        return null;
    }
}

/**
 * Draw a rounded rectangle path (does not fill/stroke).
 */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * Truncate text to fit within maxWidth, appending "…" if needed.
 */
function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + '…';
}

/**
 * Draw a circle and clip an image into it (for logos).
 */
function drawCircleLogo(ctx, img, cx, cy, radius) {
    ctx.save();
    // Circle bg
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2e3e';
    ctx.fill();
    // Border
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Clip & draw
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
}

/**
 * Draw a placeholder circle when logo is unavailable.
 */
function drawPlaceholderCircle(ctx, cx, cy, radius) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2e3e';
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Shield icon placeholder
    ctx.font = `bold ${radius}px sans-serif`;
    ctx.fillStyle = TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚽', cx, cy + 2);
    ctx.textBaseline = 'alphabetic';
}

/**
 * Generate a PNG buffer for a betting pick card.
 *
 * @param {object} pickData
 * @param {string} pickData.homeTeam
 * @param {string} pickData.awayTeam
 * @param {string} [pickData.homeLogo] - URL
 * @param {string} [pickData.awayLogo] - URL
 * @param {string} pickData.pick
 * @param {string} pickData.time
 * @param {string} pickData.league
 * @param {string} [pickData.date]
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generatePickBuffer(pickData) {
    const { homeTeam, awayTeam, homeLogo, awayLogo, pick, time, league, date } = pickData;

    const [homeImg, awayImg] = await Promise.all([
        fetchLogo(homeLogo),
        fetchLogo(awayLogo),
    ]);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // ── Outer background ──
    ctx.fillStyle = BG_DARK;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // ── Main card ──
    const pad = 24;
    const cardX = pad, cardY = pad;
    const cardW = WIDTH - pad * 2, cardH = HEIGHT - pad * 2;
    const radius = 20;

    // Card gradient fill
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, CARD_TOP);
    cardGrad.addColorStop(1, CARD_BOT);
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = cardGrad;
    ctx.fill();

    // Card border
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Green accent bar at top ──
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();
    const accentGrad = ctx.createLinearGradient(cardX + 200, cardY, cardX + cardW - 200, cardY);
    accentGrad.addColorStop(0, 'rgba(0, 230, 118, 0)');
    accentGrad.addColorStop(0.3, GREEN);
    accentGrad.addColorStop(0.7, GREEN);
    accentGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(cardX, cardY, cardW, 3);
    ctx.restore();

    // ── League badge ──
    const headerY = cardY + 50;
    ctx.font = 'bold 18px sans-serif';
    const leagueText = league.toUpperCase();
    const leagueW = ctx.measureText(leagueText).width;
    const badgePad = 18;
    const badgeH = 30;
    const badgeX = (WIDTH - leagueW - badgePad * 2) / 2;
    const badgeY = headerY - 20;

    roundRect(ctx, badgeX, badgeY, leagueW + badgePad * 2, badgeH, 15);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.1)';
    ctx.fill();
    roundRect(ctx, badgeX, badgeY, leagueW + badgePad * 2, badgeH, 15);
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = GREEN;
    ctx.textAlign = 'center';
    ctx.fillText(leagueText, WIDTH / 2, headerY + 1);

    // ── Time & date ──
    const timeDate = date ? `${time}  ·  ${date}` : time;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = TEXT_MUTED;
    ctx.fillText(timeDate, WIDTH / 2, headerY + 30);

    // ── Teams row ──
    const teamY = headerY + 90;
    const logoRadius = 34;
    const teamMaxWidth = 260;

    // Home logo
    const homeLogoCX = cardX + 100;
    if (homeImg) {
        drawCircleLogo(ctx, homeImg, homeLogoCX, teamY, logoRadius);
    } else {
        drawPlaceholderCircle(ctx, homeLogoCX, teamY, logoRadius);
    }

    // Home name
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = TEXT_WHITE;
    ctx.textAlign = 'left';
    ctx.fillText(
        truncateText(ctx, homeTeam, teamMaxWidth),
        homeLogoCX + logoRadius + 20,
        teamY + 10
    );

    // Away logo
    const awayLogoCX = cardX + cardW - 100;
    if (awayImg) {
        drawCircleLogo(ctx, awayImg, awayLogoCX, teamY, logoRadius);
    } else {
        drawPlaceholderCircle(ctx, awayLogoCX, teamY, logoRadius);
    }

    // Away name
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = TEXT_WHITE;
    ctx.textAlign = 'right';
    ctx.fillText(
        truncateText(ctx, awayTeam, teamMaxWidth),
        awayLogoCX - logoRadius - 20,
        teamY + 10
    );

    // ── VS circle ──
    const vsRadius = 24;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, teamY, vsRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1923';
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = TEXT_LIGHT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', WIDTH / 2, teamY);
    ctx.textBaseline = 'alphabetic';

    // ── Pick pill ──
    const pickY = teamY + 78;
    ctx.font = 'bold 34px sans-serif';
    const pickText = pick.toUpperCase();
    const pickW = ctx.measureText(pickText).width;
    const pillPadX = 32;
    const pillH = 52;
    const pillW = pickW + pillPadX * 2;
    const pillX = (WIDTH - pillW) / 2;
    const pillYTop = pickY - 35;

    // Glow behind pill
    ctx.save();
    ctx.shadowColor = 'rgba(0, 230, 118, 0.25)';
    ctx.shadowBlur = 20;
    roundRect(ctx, pillX, pillYTop, pillW, pillH, 26);
    ctx.fillStyle = GREEN_DIM;
    ctx.fill();
    ctx.restore();

    // Pill border
    roundRect(ctx, pillX, pillYTop, pillW, pillH, 26);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pill text
    ctx.fillStyle = GREEN;
    ctx.textAlign = 'center';
    ctx.fillText(pickText, WIDTH / 2, pickY + 2);

    // ── Footer bar ──
    const footerH = 40;
    const footerY = cardY + cardH - footerH;

    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();
    ctx.fillStyle = FOOTER_BG;
    ctx.fillRect(cardX, footerY, cardW, footerH);
    // Top border of footer
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX, footerY);
    ctx.lineTo(cardX + cardW, footerY);
    ctx.stroke();
    ctx.restore();

    // Footer text
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('MKEKAWALEO.COM', WIDTH / 2, footerY + 25);

    // Small green dot before text
    const footerTextW = ctx.measureText('MKEKAWALEO.COM').width;
    ctx.beginPath();
    ctx.arc(WIDTH / 2 - footerTextW / 2 - 10, footerY + 21, 3, 0, Math.PI * 2);
    ctx.fillStyle = GREEN;
    ctx.fill();

    return canvas.toBuffer('image/png');
}

module.exports = { generatePickBuffer };
