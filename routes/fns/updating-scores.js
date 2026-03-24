const updatingScores = (tip, home, away, ft_total, ht_total, ht_home, ht_away) => {
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
        case 'HT Over 0.5': case 'Over 0.5 HT': case '1st Half. Over 0.5':
            return ht_total > 0 ? 'won' : 'lose';
        case 'HT Over 1.5':
            return ht_total > 1 ? 'won' : 'lose';
        case 'HT Under 1.5':
            return ht_total < 2 ? 'won' : 'lose';
        case 'HT Under 2.5':
            return ht_total < 3 ? 'won' : 'lose';

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

        default:
            return 'unknown';
    }
}

module.exports = updatingScores;