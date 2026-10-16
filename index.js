require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Plat = require('./plat');
const Commande = require('./commande');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion admin : renvoie un jeton si le mot de passe est bon
app.post('/admin/login', (req, res) => {
    const motDePasse = req.body.motDePasse;

    if (!motDePasse || motDePasse !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ erreur: 'Mot de passe incorrect' });
    }

    const jeton = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ jeton: jeton });
});

// Gardien : laisse passer uniquement ceux qui ont un jeton valide
function verifierAdmin(req, res, next) {
    const entete = req.headers.authorization || '';
    const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : null;

    if (!jeton) {
        return res.status(401).json({ erreur: 'Non autorisé' });
    }

    try {
        jwt.verify(jeton, process.env.JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ erreur: 'Jeton invalide ou expiré' });
    }
}

// Liste des plats
app.get('/commandes', verifierAdmin, async (req, res) => {
    const plats = await Plat.find();
    res.json(plats);
});

// Activer / désactiver UN seul plat (l'id vient de l'URL)
app.put('/plats/:id', verifierAdmin, async (req, res) => {
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