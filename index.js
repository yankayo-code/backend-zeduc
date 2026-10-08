require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
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

    const lignes = commande.articles
        .map(a => a.quantite + 'x ' + a.nom + ' - ' + (a.prix * a.quantite) + ' FCFA')
        .join('\n');
    const total = commande.articles.reduce((s, a) => s + a.prix * a.quantite, 0);

    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'juniormbongue59@gmail.com',
            subject: 'Nouvelle commande de ' + commande.client.nom,
            text: 'Client : ' + commande.client.nom + '\n' +
                  'Téléphone : ' + commande.client.telephone + '\n' +
                  'Mode : ' + commande.client.modeReception + '\n' +
                  'Résidence : ' + (commande.client.residence || '-') + '\n\n' +
                  lignes + '\n\nTotal : ' + total + ' FCFA'
        });
    } catch (e) {
        console.log('Envoi e-mail échoué :', e.message);
    }

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