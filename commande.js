const mongoose = require('mongoose');

const schemaCommande = new mongoose.Schema({
    client: {
        nom: String,
        telephone: String,
        residence: String
    },
    articles: [
        {
            nom: String,
            prix: Number,
            quantite: Number
        }
    ],
    dateCommande: {
        type: Date,
        default: Date.now
    }
});

const Commande = mongoose.model('Commande', schemaCommande);

module.exports = Commande;