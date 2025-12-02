const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.openAIKey
});

/**
 * Build a concise Swahili narrative (<=100 words) that links facts to the suggested tip.
 * @param {{facts: string[], match: string, league?: string, tip: string}} params
 * @returns {Promise<string>}
 */
async function generateSocialDescription({ facts = [], match = '', league = '', tip = '' }) {
    const cleanedFacts = Array.isArray(facts) ? facts.filter(Boolean).map(f => f.trim()).slice(0, 10) : [];

    if (!client.apiKey) throw new Error('OPENAI_KEY haijapatikana');

    try {
        const promptFacts = cleanedFacts.length ? cleanedFacts.map((f, idx) => `${idx + 1}. ${f}`).join('\n') : 'Hakuna facts zilizopatikana; tumia ujuzi wa mpira kwa ujumla.';
        const matchLabel = match || 'Mechi husika';
        
        const res = await client.responses.create({
            model: 'gpt-5.1',
            input: [
                {
                    role: 'system',
                    content: 'You are a Tanzanian betting analyst and social media content creator fluent in Swahili. Your task is to write engaging and concise descriptions for football match predictions, linking key facts to the betting tip provided. Dont use any formatting, just plain text not more than 120 words with one to two short paragraphs.'
                },
                {
                    role: 'user',
                    content: `Write a Swahili description, maximum 120 words. \nMatch: ${matchLabel} \nLeague: ${league || 'N/A'} \nTip to support: ${tip || 'N/A'} \nKey facts: ${promptFacts} \n\nExplain why the facts support the tip. Keep it flowing and concise.`
                }
            ],
            reasoning: { effort: "medium" },
        });

        const text = res?.output_text?.trim();
        if (!text) throw new Error('Hakuna majibu kutoka AI');
        return text;
    } catch (error) {
        console.log('generateSocialDescription error:', error?.message, error);
        throw error;
    }
}

module.exports = { generateSocialDescription };
