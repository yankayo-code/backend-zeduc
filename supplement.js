const mongoose = require('mongoose');

const schemaSupplement = new mongoose.Schema({
    nom: String,
    prix: Number,
    disponible: {
        type: Boolean,
        default: true
    }
});

const Supplement = mongoose.model('Supplement', schemaSupplement);

module.exports = Supplement;