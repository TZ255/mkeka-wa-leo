const matchExplanation = (tip) => {
    switch (tip) {
        case 'Home Multigoals: 1 - 2': 
        case 'Multigoals Home: 1 - 2':
            return 'Timu ya nyumbani kufunga kati ya goli 1 au 2.';

        case 'Home Multigoals: 1 - 3': 
        case 'Multigoals Home: 1 - 3':
            return 'Timu ya nyumbani kufunga kati ya goli 1 hadi 3.';

        case 'Away Multigoals: 1 - 2': 
        case 'Multigoals Away: 1 - 2':
            return 'Timu ya ugenini kufunga kati ya goli 1 au 2.';
            
        case 'Away Multigoals: 1 - 3': 
        case 'Multigoals Away: 1 - 3':
            return 'Timu ya ugenini kufunga kati ya goli 1 hadi 3.';

        case '1st Half Multigoals: 1 - 2':
        case '1st Half. Multigoals: 1 - 2':
        case 'HT Multigoals: 1 - 2':
        case 'Multigoals 1st Half: 1 - 2':
            return 'Kati ya goli 1 au 2 kufungwa katika kipindi cha kwanza.';

        case '1st Half Multigoals: 1 - 3':
        case '1st Half. Multigoals: 1 - 3':
        case 'Multigoals 1st Half: 1 - 3':
        case 'HT Multigoals: 1 - 3':
            return 'Kati ya goli 1 hadi 3 kufungwa katika kipindi cha kwanza.';

        case 'HT Double Chance: 12':
        case 'HT DC: 12':
        case '1st Half. DC: 12':
        case '1st Half DC: 12':
            return 'Timu yoyote ishinde kipindi cha kwanza.';

        case 'Total Goals Rangess: 2 - 4':
        case 'Multigoals: 2 - 4':
        case 'Goal Bounds: 2 -4':
            return 'Mechi kuisha na jumla ya kati ya magoli mawili hadi manne.'

        default:
            return ''
    }
};

module.exports = matchExplanation;
// This function takes a string 'tip' as input and returns a string explanation for the given tip.