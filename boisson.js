const mongoose = require('mongoose');

const schemaBoisson = new mongoose.Schema({
    nom: String,
    prix: Number,
    disponible: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Boisson', schemaBoisson);