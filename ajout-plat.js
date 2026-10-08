require('dotenv').config();
const mongoose = require('mongoose');
const Plat = require('./plat');

mongoose.connect(process.env.MONGO_URL).then(function() {
    const nouveauxPlats = [
        {
            nom: 'Escargots sautés frites de plantain',
            prix: 2500,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRT4gtF0JPyUyHkXpq_o6XcEkfsDTwUxSsog8TUuCz5D9jXshx5IvbjO-U&s=10'
        },
        {
            nom: 'Gambas braisés',
            prix: 2500,
            image: 'https://mrcuisto.com/assets/images/1737006447291-our0qp0o.webp'
        },
        {
            nom: 'Poisson braisé frites de plantain 2200',
            prix: 2200,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6RUO4ljC5kOi-2datMDioZAuIZxBbsGcwEI3tZVWGg3DWjMlLynQzZRn5&s=10'
        },
        {
            nom: 'poisson braisé frites de plantain 2500',
            prix: 2500,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtK6bZk5dFbZfYK8z--sDF70Xli4aKSnBfE2PArJe3E1-cuF8L6XdU-O4&s=10'
        },
        {
            nom: 'poisson braisé frites de plantain 2000',
            prix: 2000,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTn6MmShM6nVQEkYdsyMZ-VlyV76-ALfXP8mXs4kTS0Hg&s=10'
        },
        {
            nom: 'Bolognaises riz',
            prix: 1000,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSH8z6IqR4Ip2b_gDB2vq6OBwfDo65ED0JcRCTEJBqvhQ&s=10'
        },
        {
            nom: 'Bolognaises riz frites',
            prix: 1500,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqyNP1Ga1kVz4Bw2CY2HTCxnG9DMqys7cs9uFYqKRlDcmwpGsRaywqGTm5&s=10'
        },
        {
            nom: 'Beignets haricots bouillie',
            prix: 500,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-Jsom5CrVGwXaIEoBghHqXEVW2AgUjEkTJXoLofDiDz7l1-MKkWyvpHE&s=10'
        },
        {
            nom: 'Beignets haricots',
            prix: 500,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9joXtDpTGE5rsVa0I1MO-254fIAjhr9U-6fxmtlikavsE1npPujUYWn4&s=10'
        },
        {
            nom: 'Beignets bouillie',
            prix: 500,
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFVum3bGrQrjV590BxNWLVpiJQ6KdLUrQbYIiyEzze6O0-4d_trUlrk0Y7&s=10'
        },
    ];

    Plat.insertMany(nouveauxPlats)
        .then(function() {
            console.log(nouveauxPlats.length + ' plats ajoutés avec succès !');
            mongoose.disconnect();
        })
        .catch(function(erreur) {
            console.log('Erreur :', erreur);
            mongoose.disconnect();
        });
});