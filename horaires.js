// Heure du Cameroun : UTC+1, sans changement d'heure
const DECALAGE = 60 * 60 * 1000;

// [ouverture, fermeture] selon le jour (0 = dimanche)
const HORAIRES = {
    0: [8, 23], 1: [15, 24], 2: [15, 24], 3: [15, 24],
    4: [15, 24], 5: [15, 24], 6: [8, 23]
};

function heureCameroun(date) {
    return new Date(date.getTime() + DECALAGE);
}

function estOuvertHoraire(date) {
    const l = heureCameroun(date);
    const [debut, fin] = HORAIRES[l.getUTCDay()];
    const heure = l.getUTCHours() + l.getUTCMinutes() / 60;
    return heure >= debut && heure < fin;
}

// Prochaine ouverture strictement après `date`
function prochaineOuverture(date) {
    const l = heureCameroun(date);
    for (let i = 0; i < 8; i++) {
        const jour = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() + i));
        const debut = HORAIRES[jour.getUTCDay()][0];
        const instant = new Date(jour.getTime() + debut * 3600000 - DECALAGE);
        if (instant > date) { return instant; }
    }
}

if (typeof module !== 'undefined') {
    module.exports = { estOuvertHoraire, prochaineOuverture, prochaineFermeture };
        // Prochaine fermeture normale strictement après `date`
        function prochaineFermeture(date) {
            const l = heureCameroun(date);
            for (let i = 0; i < 8; i++) {
                const jour = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() + i));
                const fin = HORAIRES[jour.getUTCDay()][1];
                const instant = new Date(jour.getTime() + fin * 3600000 - DECALAGE);
                if (instant > date) { return instant; }
            }
        }

}