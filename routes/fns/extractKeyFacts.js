const axios = require('axios').default;
const cheerio = require('cheerio');

/**
 * Fetches HTML for a prediction page and pulls out the "Key Facts" bullet texts.
 * @param {string} predictionUrl
 * @returns {Promise<string[]>}
 */
async function extractKeyFacts(predictionUrl = '') {
    if (!predictionUrl || typeof predictionUrl !== 'string') {
        throw new Error('prediction_url haipo au si sahihi');
    }
    try {
        const resp = await axios.get(predictionUrl.trim());
        const $ = cheerio.load(resp.data || '');

        // Find the "Key Facts" header then walk forward until the next title block.
        const facts = [];
        const header = $('.titlesright').filter((_, el) => $(el).text().trim().toLowerCase() === 'key facts').first();
        if (!header.length) throw new Error('Key Facts hazijapatikana kwenye ukurasa');

        // In sample HTML the parent .titlegames is followed by multiple .predictionsmarkets blocks
        // then another .titlegames divider. Traverse siblings until we hit the next title container.
        let node = header.closest('.titlegames').next();
        while (node && node.length) {
            if (node.hasClass('titlegames')) break;

            // grab the paragraph text inside .preditext
            const text = node.find('.preditext p').text().trim();
            if (text) facts.push(text);

            node = node.next();
        }
        return facts;
    } catch (error) {
        console.log('extractKeyFacts error:', error?.message);
        throw new Error(error?.message || 'Imeshindikana kusoma Key Facts');
    }
}

module.exports = { extractKeyFacts };
