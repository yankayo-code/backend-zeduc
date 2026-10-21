require('dotenv').config();
const mongoose = require('mongoose');
const Boisson = require('./boisson');

mongoose.connect(process.env.MONGO_URL).then(function() {
    const nouvellesBoissons = [
        { nom: 'Coca cola', prix: 500 },
        { nom: 'Top Grenadine', prix: 500 },
        { nom: 'Top Pamplemouse', prix: 500 },
        { nom: 'Top Ananas', prix: 500 },
        { nom: 'Top Orange', prix: 500 },
        { nom: 'Fanta', prix: 500 },
        { nom: 'Sprite', prix: 500 },
        { nom: 'Vimto', prix: 850 },
        { nom: 'Djino', prix: 750 },
        { nom: 'Orangina', prix: 850 },
        { nom: 'Planete pomme', prix: 500 },
        { nom: 'Planete cocktail', prix: 500 },
        { nom: 'Eau', prix: 500 },
    ];

    Boisson.insertMany(nouvellesBoissons)
        .then(function() {
            console.log(nouvellesBoissons.length + ' boissons ajoutées avec succès !');
            mongoose.disconnect();
        })
        .catch(function(erreur) {
            console.log('Erreur :', erreur);
            mongoose.disconnect();
        });
});