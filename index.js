const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Commande = require('./commande');
const app = express();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json());

const cheminMongoDB = process.env.MONGO_URL;

mongoose.connect(cheminMongoDB)
    .then(function() {
        console.log('Connecté à MongoDB avec succès !');
    })
    .catch(function(erreur) {
        console.log('Erreur de connexion à MongoDB :', erreur);
    });

app.get('/', function(req, res) {
    res.send('Mon serveur backend fonctionne !');
});

app.post('/commande', function(req, res) {
    const nouvelleCommande = new Commande(req.body);

    nouvelleCommande.save()
        .then(function(commandeEnregistree) {
            console.log('Commande enregistrée dans la base :', commandeEnregistree);

            resend.emails.send({
                from: 'onboarding@resend.dev',
                to: 'kayotaduyandimitri@gmail.com',
                subject: 'Nouvelle commande - ZeducPlace',
                text: 'Nouvelle commande de ' + req.body.client.nom + ' (' + req.body.client.telephone + ', ' + req.body.client.residence + ')'
            });

            res.send('Commande bien reçue et enregistrée !');
        })
        .catch(function(erreur) {
            console.log('Erreur lors de l\'enregistrement :', erreur);
            res.status(500).send('Erreur lors de l\'enregistrement de la commande.');
        });
});

const port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log('Serveur démarré sur le port ' + port);
});