require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Plat = require('./plat');
const Commande = require('./commande');

const app = express();
app.use(cors());
app.use(express.json());

// Liste des plats
app.get('/plats', async (req, res) => {
    const plats = await Plat.find();
    res.json(plats);
});

// Activer / désactiver UN seul plat (l'id vient de l'URL)
app.put('/plats/:id', async (req, res) => {
    const plat = await Plat.findByIdAndUpdate(
        req.params.id,
        { disponible: req.body.disponible },
        { new: true }
    );
    res.json(plat);
});

// Enregistrer une commande
app.post('/commande', async (req, res) => {
    const commande = await Commande.create(req.body);
    res.status(201).json(commande);
});

// Liste des commandes (utile pour vérifier)
app.get('/commandes', async (req, res) => {
    const commandes = await Commande.find().sort({ dateCommande: 1 });
    res.json(commandes);
});

mongoose.connect(process.env.MONGO_URL).then(function() {
    const port = process.env.PORT || 3000;
    app.listen(port, function() {
        console.log('Serveur prêt sur le port ' + port);
    });
});