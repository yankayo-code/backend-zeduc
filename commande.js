const mongoose = require('mongoose');

const schemaCommande = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
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
      supplementQte: { type: Number, default: 0 },
      boissons: [
        { nom: String, prix: Number, quantite: Number }
      ],
      supplements: [
        { nom: String, prix: Number, quantite: Number }
      ]
    }
  ],

  statut: { type: String, enum: ['nouvelle', 'terminee'], default: 'nouvelle' },
  termineeLe: { type: Date, default: null },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client'    },

  dateCommande: {
    type: Date,
    default: Date.now
  }
});

const Commande = mongoose.model('Commande', schemaCommande);

module.exports = Commande;

