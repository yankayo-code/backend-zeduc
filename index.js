const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Commande = require('./commande');
const app = express();

app.use(cors());
app.use(express.json());

const cheminMongoDB = 'mongodb://yankayo_db_user:RZFeCFzmBkPFD4vm@ac-ibuhca5-shard-00-00.niki0jt.mongodb.net:27017,ac-ibuhca5-shard-00-01.niki0jt.mongodb.net:27017,ac-ibuhca5-shard-00-02.niki0jt.mongodb.net:27017/zeducplace?ssl=true&replicaSet=atlas-zccau7-shard-0&authSource=admin&retryWrites=true&w=majority';

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