require('dotenv').config();
const mongoose = require('mongoose');
const Supplement = require('./supplement');

mongoose.connect(process.env.MONGO_URL).then(function() {
    const nouveauxSupplements = [
        { nom: 'Portion de riz', prix: 500 }
    ];

    Supplement.insertMany(nouveauxSupplements)
        .then(function() {
            console.log(nouveauxSupplements.length + ' suppléments ajoutés avec succès !');
            mongoose.disconnect();
        })
        .catch(function(erreur) {
            console.log('Erreur :', erreur);
            mongoose.disconnect();
        });
});