const mongoose = require('mongoose');

// Un seul document « secteurClient » : le restaurant est ouvert ou fermé aux commandes
const schemaReglage = new mongoose.Schema({
    cle: { type: String, unique: true },
    ouvert: { type: Boolean, default: true },
    fermeJusquA: { type: Date, default: null },
    ouvertJusquA: { type: Date, default: null }
});

const Reglage = mongoose.model('Reglage', schemaReglage);

module.exports = Reglage;