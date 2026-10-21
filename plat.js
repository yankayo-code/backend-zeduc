const mongoose = require('mongoose');

const schemaPlat = new mongoose.Schema({
    nom: String,
    prix: Number,
    image: String,
    disponible: {
        type: Boolean,
        default: true
    },
    supplementAutorise: {
        type: Boolean,
        default: false
    },
});

const Plat = mongoose.model('Plat', schemaPlat);

module.exports = Plat;