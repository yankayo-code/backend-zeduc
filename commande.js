const mongoose = require('mongoose');

const schemaCommande = new mongoose.Schema({
    client: {
        nom: String,
        telephone: String,
        residence: String,
        modeReception: String,
    },
    articles: [
        {
            nom: String,
            prix: Number,
            quantite: Number,
            supplementQte: { type: Number, default: 0 }
        }
    ],
    dateCommande: {
        type: Date,
        default: Date.now
    }
});

const Commande = mongoose.model('Commande', schemaCommande);

module.exports = Commande;