const updatingScores = (tip, home, away, ft_total, ht_total, ht_home, ht_away) => {
    switch (tip) {
        case '1': case 'Home Win': 
            return home > away ? 'won' : 'lose'; 
        case '2': case 'Away Win': 
            return away > home ? 'won' : 'lose'; 
        case 'X': case 'Draw': 
            return home === away ? 'won' : 'lose'; 
        case '1X': 
            return home >= away ? 'won' : 'lose'; 
        case 'X2': 
            return away >= home ? 'won' : 'lose'; 

        // ##### OVER/UNDER FULLTIME CHECKING #####
        case 'Over 1.5': 
            return ft_total > 1 ? 'won' : 'lose'; 
        case 'Over 2.5': 
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

        // ##### OVER/UNDER HALFTIME CHECKING #####
        case 'HT Over 0.5': 
            return ht_total > 0 ? 'won' : 'lose'; 
        case 'HT Over 1.5': 
            return ht_total > 1 ? 'won' : 'lose'; 
        case 'HT Under 1.5': 
            return ht_total < 2 ? 'won' : 'lose'; 
        case 'HT Under 2.5': 
            return ht_total < 3 ? 'won' : 'lose'; 

        // ##### HALFTIME/FULLTIME CHECKING #####
        case '1/1': 
            if (ht_home > ht_away && home > away) return 'won'; 

        default:
            return 'unknown'; // Handle unknown tips
    }
}