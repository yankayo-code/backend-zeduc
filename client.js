const mongoose = require('mongoose');

const schemaClient = new mongoose.Schema({
    nom: String,
    telephone: { type: String, unique: true },
    dateInscription: { type: Date, default: Date.now },
    derniereVisite: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', schemaClient);

module.exports = Client;