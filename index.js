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

function construireMessageCommande(commande) {
    let message = 'Nouvelle commande de ' + commande.client.nom + ' (' + commande.client.telephone + ', ' + commande.client.residence + ')\n\n';
    message = message + 'Détail de la commande :\n';

    let total = 0;

    commande.articles.forEach(function(article) {
        const sousTotal = article.prix * article.quantite;
        total = total + sousTotal;
        message = message + '- ' + article.quantite + 'x ' + article.nom + ' - ' + sousTotal + ' FCFA\n';
    });

    message = message + '\nTotal : ' + total + ' FCFA';

    return message;
}

app.post('/commande', function(req, res) {
    const nouvelleCommande = new Commande(req.body);

    nouvelleCommande.save()
        .then(function(commandeEnregistree) {
            console.log('Commande enregistrée dans la base :', commandeEnregistree);

            resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'yan.kayo@2031.icam.fr',
    subject: 'Nouvelle commande - ZeducPlace',
    text: construireMessageCommande(req.body)
            })
            .then(function(resultat) {
                console.log('Email envoyé :', resultat);
            })
            .catch(function(erreurEmail) {
                console.log('Erreur envoi email :', erreurEmail);
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