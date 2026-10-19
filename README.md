# Quiz Nature

Application web de quiz naturalistes (oiseaux, mammifères, papillons…), en HTML, CSS et JavaScript,
sans installation ni outil de compilation. Elle est hébergée sur GitHub Pages.

**Site en ligne :** https://neilooo123.github.io/quiz-nature/

## Parcours

1. Choisir un taxon (Ornithologie, Mammifères, Lépidoptères).
2. Choisir un quiz (pour l'instant : **Cris oiseaux**).
3. Cocher les espèces sur lesquelles portera le quiz.
4. Écouter le son, choisir le nom dans la liste, valider : vert si c'est juste, rouge sinon.
5. « Mettre fin au quiz » affiche le résumé des questions et le score.

## Tester sur son ordinateur

Double-cliquer sur `index.html` suffit. Avec Python, on peut aussi lancer un petit serveur :

```bash
python -m http.server 8000
```

puis ouvrir http://localhost:8000.

## Ajouter ou modifier des chants d'oiseaux

1. Déposer les MP3 dans `sources/` (nom de fichier : `NN Nom de l'oiseau.mp3`, par ex. `12 Fauvette des jardins.mp3`).
   Chaque sous-dossier de `sources/` devient une section de l'écran de sélection (ex. « Oiseaux d'eau et limicoles ») ;
   les MP3 posés directement dans `sources/` vont dans « Passereaux et autres ».
   Le dossier `sources/` n'est pas envoyé sur GitHub.
2. Si besoin, corriger un nom, ignorer un fichier ou renommer une section dans `tools/corrections-noms.json`.
3. Lancer le script, qui copie les sons dans `media/` et met à jour `data/oiseaux-chants.js` :

   ```bash
   python tools/generer-chants.py
   ```

4. Publier :

   ```bash
   git add -A
   git commit -m "Ajout de nouveaux chants"
   git push
   ```

   Le site se met à jour en une à deux minutes.

## Ajouter un quiz

- Décrire le quiz dans `js/catalogue.js` (taxon, nom, type, fichier de données).
- Charger son fichier de données dans `index.html` (`<script src="data/…js">`).

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page unique de l'application |
| `css/style.css` | Apparence (clair/sombre, mobile) |
| `js/catalogue.js` | Liste des taxons et des quiz |
| `js/app.js` | Navigation et affichage des écrans |
| `js/quiz.js` | Moteur de quiz : tirage des questions, score |
| `js/combobox.js` | Liste déroulante avec recherche (style shadcn/ui) |
| `js/outils.js` | Fonctions partagées (icônes, recherche sans accents…) |
| `tools/generer-chants.py` | Préparation des sons et des données |
