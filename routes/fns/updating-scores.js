const normalizeTip = (tip) => String(tip || '').trim();

const HALFTIME_TIP_LABELS = new Set([
    'HT Over 0.5',
    'Over 0.5 HT',
    '1st Half. Over 0.5',
    '1st Half - Over 0.5',
    'HT Over 1.5',
    'Over 1.5 HT',
    '1st Half. Over 1.5',
    '1st Half - Over 1.5',
    'HT Under 1.5',
    'Under 1.5 HT',
    '1st Half. Under 1.5',
    '1st Half - Under 1.5',
    'HT Under 2.5',
    'Under 2.5 HT',
    '1st Half. Under 2.5',
    '1st Half - Under 2.5',
    'HT 1X',
    '1st Half Double Chance: 1X',
    '1st Half DC: 1X',
    '1st Half. DC: 1X',
    'HT X2',
    '1st Half Double Chance: X2',
    '1st Half DC: X2',
    '1st Half. DC: X2',
    'HT 12',
    'HT DC: 12',
    '1st Half Double Chance: 12',
    '1st Half DC: 12',
    '1st Half DC. 12',
    '1st Half. DC: 12',
    '1st Half. DC. 12',
    '1st Half Multigoals: 1 - 2',
    '1st Half. Multigoals: 1 - 2',
    'Multigoals 1st Half: 1 - 2',
    'HT Multigoals: 1 - 2',
    '1st Half Multigoals: 1 - 3',
    '1st Half. Multigoals: 1 - 3',
    'Multigoals 1st Half: 1 - 3',
    'HT Multigoals: 1 - 3'
]);

const isHalftimeTip = (tip) => HALFTIME_TIP_LABELS.has(normalizeTip(tip));

const formatScore = (home, away, period = '') => `(${home}:${away}${period ? ` ${period}` : ''})`;

const getResultScore = (tip, scores) => {
    if (isHalftimeTip(tip)) return formatScore(scores.ht_home, scores.ht_away, 'HT');
    return formatScore(scores.home, scores.away);
};

const updatingScores = (tip, home, away, ft_total, ht_total, ht_home, ht_away, matchStr) => {
    tip = normalizeTip(tip);

    switch (tip) {
        case '1': case 'Home Win':
            return home > away ? 'won' : 'lose';
        case '2': case 'Away Win':
            return away > home ? 'won' : 'lose';
        case 'X': case 'Draw':
            return home === away ? 'won' : 'lose';
        case '1X': case 'Home/Draw': case 'DC: 1X': case '1X':
            return home >= away ? 'won' : 'lose';
        case 'X2': case 'Draw/Away': case 'DC: X2': case 'X2':
            return away >= home ? 'won' : 'lose';
        case '12': case 'Home/Away': case 'DC: 12': case '12':
            return home !== away ? 'won' : 'lose';

        // ##### OVER/UNDER FULLTIME CHECKING #####
        case 'Over 0.5':
            return ft_total > 0 ? 'won' : 'lose';
        case 'Over 1.5': case 'FT Over 1.5': case 'Over 1.5 Goals': case '+1.5': case 'Total Goals: +1.5':
            return ft_total > 1 ? 'won' : 'lose';
        case 'Over 2.5': case 'Over 2.5 Goals': case '+2.5': case 'Total Goals: +2.5':
            return ft_total > 2 ? 'won' : 'lose';
        case 'Over 3.5':
            return ft_total > 3 ? 'won' : 'lose';
        case 'Under 1.5':
            return ft_total < 2 ? 'won' : 'lose';
        case 'Under 2.5':
            return ft_total < 3 ? 'won' : 'lose';
        case 'Under 3.5':
            return ft_total < 4 ? 'won' : 'lose';
        case 'Under 4.5':
            return ft_total < 5 ? 'won' : 'lose';

        // ##### BTTS CHECKING #####
        case 'GG': case 'BTTS': case "GG - Yes": case 'BTTS: Yes':
            return (home > 0 && away > 0) ? 'won' : 'lose';
        case 'NG': case 'BTTS: No': case 'GG - No':
            return (home === 0 || away === 0) ? 'won' : 'lose';

        // ##### OVER/UNDER HALFTIME CHECKING #####
        case 'HT Over 0.5': case 'Over 0.5 HT': case '1st Half. Over 0.5': case '1st Half - Over 0.5':
            return ht_total > 0 ? 'won' : 'lose';
        case 'HT Over 1.5': case 'Over 1.5 HT': case '1st Half. Over 1.5': case '1st Half - Over 1.5':
            return ht_total > 1 ? 'won' : 'lose';
        case 'HT Under 1.5': case 'Under 1.5 HT': case '1st Half. Under 1.5': case '1st Half - Under 1.5':
            return ht_total < 2 ? 'won' : 'lose';
        case 'HT Under 2.5': case 'Under 2.5 HT': case '1st Half. Under 2.5': case '1st Half - Under 2.5':
            return ht_total < 3 ? 'won' : 'lose';

        // ##### HALFTIME DOUBLE CHANCE CHECKING #####
        case 'HT 1X': case '1st Half Double Chance: 1X': case '1st Half DC: 1X': case '1st Half. DC: 1X':
            return ht_home >= ht_away ? 'won' : 'lose';
        case 'HT X2': case '1st Half Double Chance: X2': case '1st Half DC: X2': case '1st Half. DC: X2':
            return ht_away >= ht_home ? 'won' : 'lose';
        case 'HT 12': case 'HT DC: 12': case '1st Half Double Chance: 12': case '1st Half DC: 12': case '1st Half DC. 12': case '1st Half. DC: 12': case '1st Half. DC. 12':
            return ht_home !== ht_away ? 'won' : 'lose';

        // ##### HALFTIME MULTIGOALS #####
        case '1st Half Multigoals: 1 - 2': case '1st Half. Multigoals: 1 - 2': case 'Multigoals 1st Half: 1 - 2': case 'HT Multigoals: 1 - 2':
            return (ht_total >= 1 && ht_total <= 2) ? 'won' : 'lose';
        case '1st Half Multigoals: 1 - 3': case '1st Half. Multigoals: 1 - 3': case 'Multigoals 1st Half: 1 - 3': case 'HT Multigoals: 1 - 3':
            return (ht_total >= 1 && ht_total <= 3) ? 'won' : 'lose';

        // ##### COMBO: RESULT & OVER 1.5 #####
        case '1 & Over 1.5':
            return (home > away && ft_total > 1) ? 'won' : 'lose';
        case '1X & Over 1.5':
            return (home >= away && ft_total > 1) ? 'won' : 'lose';
        case '12 & Over 1.5':
            return (home !== away && ft_total > 1) ? 'won' : 'lose';
        case '2 & Over 1.5':
            return (away > home && ft_total > 1) ? 'won' : 'lose';
        case 'X2 & Over 1.5':
            return (away >= home && ft_total > 1) ? 'won' : 'lose';

        // ##### COMBO: RESULT & OVER 2.5 #####
        case '1 & Over 2.5':
            return (home > away && ft_total > 2) ? 'won' : 'lose';
        case '1X & Over 2.5':
            return (home >= away && ft_total > 2) ? 'won' : 'lose';
        case '12 & Over 2.5':
            return (home !== away && ft_total > 2) ? 'won' : 'lose';
        case '2 & Over 2.5':
            return (away > home && ft_total > 2) ? 'won' : 'lose';
        case 'X2 & Over 2.5':
            return (away >= home && ft_total > 2) ? 'won' : 'lose';

        // ##### COMBO: GG & OVER #####
        case 'GG & Over 2.5':
            return (home > 0 && away > 0 && ft_total > 2) ? 'won' : 'lose';

        // ##### COMBO: RESULT & UNDER 3.5 #####
        case '1 & Under 3.5':
            return (home > away && ft_total < 4) ? 'won' : 'lose';
        case '2 & Under 3.5':
            return (away > home && ft_total < 4) ? 'won' : 'lose';
        case '1X & Under 3.5':
            return (home >= away && ft_total < 4) ? 'won' : 'lose';
        case 'X2 & Under 3.5':
            return (away >= home && ft_total < 4) ? 'won' : 'lose';
        case '12 & Under 3.5':
            return (home !== away && ft_total < 4) ? 'won' : 'lose';

        // ##### COMBO: RESULT & UNDER 4.5 #####
        case '1 & Under 4.5':
            return (home > away && ft_total < 5) ? 'won' : 'lose';
        case '2 & Under 4.5':
            return (away > home && ft_total < 5) ? 'won' : 'lose';
        case '1X & Under 4.5':
            return (home >= away && ft_total < 5) ? 'won' : 'lose';
        case 'X2 & Under 4.5':
            return (away >= home && ft_total < 5) ? 'won' : 'lose';
        case '12 & Under 4.5':
            return (home !== away && ft_total < 5) ? 'won' : 'lose';

        // ##### HALFTIME/FULLTIME CHECKING #####
        case '1/1': case 'Home/Home':
            return (ht_home > ht_away && home > away) ? 'won' : 'lose';
        case '2/2': case 'Away/Away':
            return (ht_away > ht_home && away > home) ? 'won' : 'lose';

        // ##### MULTIGOALS
        case 'Home Multigoals: 1 - 2':
            return (home >= 1 && home <= 2) ? 'won' : 'lose';
        case 'Away Multigoals: 1 - 2':
            return (away >= 1 && away <= 2) ? 'won' : 'lose';
        case 'Home Multigoals: 1 - 3':
            return (home >= 1 && home <= 3) ? 'won' : 'lose';
        case 'Away Multigoals: 1 - 3':
            return (away >= 1 && away <= 3) ? 'won' : 'lose';

        default:
            if (tip.endsWith(' Win') && matchStr) {
                const homeTeam = matchStr.split(/ - | vs /)[0];
                return tip.startsWith(homeTeam) ? (home > away ? 'won' : 'lose') : (away > home ? 'won' : 'lose');
            }
            return 'unknown';
    }
}

updatingScores.isHalftimeTip = isHalftimeTip;
updatingScores.getResultScore = getResultScore;

module.exports = updatingScores;
