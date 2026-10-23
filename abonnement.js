const mongoose = require('mongoose');

// Un appareil qui accepte les notifications, rattaché à un client
const schemaAbonnement = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, index: true },
    role: { type: String, enum: ['client', 'admin'], default: 'client' },
    endpoint: { type: String, unique: true },
    keys: { p256dh: String, auth: String },
    dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Abonnement', schemaAbonnement);