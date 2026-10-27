"""Prépare les cartes du quiz « Répartition des chiroptères ».

Lit les images de « sources chiroptère/Chiroptère répartition/ » (une carte par
espèce, le nom du fichier est le nom de l'espèce). Chaque carte est recadrée pour
retirer son titre (« Distribution du Grand Murin » donnerait la réponse), puis
enregistrée dans media/chiropteres/repartition/ sous un nom qui ne révèle pas
l'espèce. La liste est écrite dans data/chiropteres-repartition.js.

Nécessite Pillow (une seule fois) :
    python -m pip install pillow

Utilisation (depuis la racine du projet) :
    python tools/generer-cartes-chiros.py
"""

import hashlib
import sys
from pathlib import Path

from PIL import Image

from outils_texte import cle_tri, ecrire_donnees, nfc, slugifier

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_SOURCES = RACINE / "sources chiroptère" / "Chiroptère répartition"
DOSSIER_MEDIA = RACINE / "media" / "chiropteres" / "repartition"
FICHIER_DONNEES = RACINE / "data" / "chiropteres-repartition.js"
CLE_DONNEES = "chiropteres-repartition"
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

# Nom de fichier -> nom affiché, quand le fichier est mal orthographié.
CORRECTIONS = {
    "GrandMurin": "Grand murin",
    "Murin d'escalera": "Murin d'Escalera",
}

FOND = (254, 242, 232)  # beige du cadre des cartes
MOTS_IGNORES_GROUPE = {"grand", "grande", "petit", "petite"}


def groupe_de(nom):
    mots = nom.split(" ")
    mot = mots[1] if len(mots) > 1 and mots[0].lower() in MOTS_IGNORES_GROUPE else mots[0]
    return mot[:1].upper() + mot[1:]


def recadrer(image):
    """Garde le cadre beige de la carte, sans la bande du titre."""
    rgb = Image.alpha_composite(Image.new("RGBA", image.size, "white"), image.convert("RGBA")).convert("RGB")
    largeur, hauteur = rgb.size
    pixels = rgb.load()

    # Cadre : rectangle qui englobe tous les pixels de la couleur du fond.
    masque = Image.new("1", rgb.size)
    points = masque.load()
    for y in range(hauteur):
        for x in range(largeur):
            r, g, b = pixels[x, y]
            points[x, y] = abs(r - FOND[0]) <= 4 and abs(g - FOND[1]) <= 4 and abs(b - FOND[2]) <= 4
    gauche, haut, droite, bas = masque.getbbox()

    # Le titre est souligné : seul trait sombre continu sur plus d'un quart de la largeur
    # (les lettres du titre et les départements de la carte sont des traits courts).
    def plus_long_trait(y):
        trait = meilleur = 0
        for x in range(gauche, droite):
            trait = trait + 1 if sum(pixels[x, y]) < 450 else 0
            meilleur = max(meilleur, trait)
        return meilleur

    soulignement = None
    for y in range(haut, haut + (bas - haut) // 3):
        if plus_long_trait(y) > 0.25 * (droite - gauche):
            soulignement = y
        elif soulignement is not None:
            break
    if soulignement is None:
        raise ValueError("titre souligné introuvable")
    # + 4 : les jambages des lettres (p, g…) descendent sous le trait.
    return rgb.crop((gauche, soulignement + 4, droite, bas))


def main():
    sys.stdout.reconfigure(errors="replace")
    if not DOSSIER_SOURCES.is_dir():
        sys.exit(f"Dossier introuvable : {DOSSIER_SOURCES}")

    DOSSIER_MEDIA.mkdir(parents=True, exist_ok=True)
    especes = []
    attendus = set()
    for fichier in sorted(DOSSIER_SOURCES.iterdir(), key=lambda f: cle_tri(f.name)):
        if fichier.suffix.lower() not in EXTENSIONS:
            continue
        brut = nfc(fichier.stem).strip()
        nom = CORRECTIONS.get(brut, brut).replace("'", "’")
        identifiant = slugifier(nom)
        try:
            carte = recadrer(Image.open(fichier))
        except ValueError as erreur:
            print(f"  ignoré : {fichier.name} ({erreur})")
            continue
        # Nom de fichier neutre : l'adresse de l'image ne doit pas donner la réponse.
        nom_image = hashlib.sha1(identifiant.encode()).hexdigest()[:10] + ".png"
        carte.save(DOSSIER_MEDIA / nom_image, optimize=True)
        attendus.add(nom_image)
        especes.append(
            {
                "id": identifiant,
                "nom": nom,
                "groupe": groupe_de(nom),
                "image": f"media/chiropteres/repartition/{nom_image}",
            }
        )
        print(f"  {nom} : {carte.size[0]} × {carte.size[1]}")

    for ancienne in DOSSIER_MEDIA.glob("*.png"):
        if ancienne.name not in attendus:
            ancienne.unlink()

    especes.sort(key=lambda e: cle_tri(e["nom"]))
    ecrire_donnees(FICHIER_DONNEES, CLE_DONNEES, especes, "tools/generer-cartes-chiros.py")
    print(f"{len(especes)} cartes écrites dans {FICHIER_DONNEES.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
