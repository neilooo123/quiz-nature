"""Prépare les sons du quiz « Cris oiseaux ».

Lit les MP3 de sources/ (format « NN Nom de l'oiseau.mp3 »), corrige les noms,
copie les fichiers dans media/oiseaux/chants/ avec des noms sans accent ni espace,
puis écrit la liste des espèces dans data/oiseaux-chants.js.

Utilisation (depuis la racine du projet) :
    python tools/generer-chants.py
"""

import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_SOURCES = RACINE / "sources"
DOSSIER_MEDIA = RACINE / "media" / "oiseaux" / "chants"
FICHIER_DONNEES = RACINE / "data" / "oiseaux-chants.js"
FICHIER_CORRECTIONS = Path(__file__).resolve().parent / "corrections-noms.json"
CLE_DONNEES = "oiseaux-chants"

# Mots ignorés pour former le groupe : « Grand Tétras » est rangé avec les « Tétras ».
MOTS_IGNORES_GROUPE = {"grand", "grande", "petit", "petite"}


def nfc(texte):
    return unicodedata.normalize("NFC", texte)


def slugifier(texte):
    texte = texte.replace("œ", "oe").replace("Œ", "oe").replace("æ", "ae").replace("Æ", "ae")
    texte = unicodedata.normalize("NFD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", texte.lower()).strip("-")


def cle_tri(texte):
    return slugifier(texte).replace("-", " ")


def nom_brut(fichier):
    """« 16 Engoulevent d_europe.mp3 » -> « Engoulevent d_europe »."""
    return nfc(re.sub(r"^\d+\s*", "", fichier.stem)).strip()


def nom_affiche(brut, corrections):
    nom = corrections.get(brut)
    if nom is None:
        # « d_Europe » -> « d'Europe »
        nom = re.sub(r"\b([dDlL])_(?=\w)", r"\1'", brut)
        nom = nom.replace("_", " ")
    nom = re.sub(r"\s+", " ", nom).strip()
    return nom.replace("'", "’")


def groupe_de(nom):
    mots = nom.split(" ")
    if len(mots) > 1 and mots[0].lower() in MOTS_IGNORES_GROUPE:
        mot = mots[1]
    else:
        mot = mots[0]
    return mot[:1].upper() + mot[1:]


def main():
    sys.stdout.reconfigure(errors="replace")

    if not DOSSIER_SOURCES.is_dir():
        sys.exit(f"Dossier introuvable : {DOSSIER_SOURCES}")

    reglages = json.loads(FICHIER_CORRECTIONS.read_text(encoding="utf-8"))
    corrections = {nfc(k): nfc(v) for k, v in reglages.get("corrections", {}).items()}
    a_ignorer = {nfc(n) for n in reglages.get("ignorer", [])}

    fichiers = sorted(DOSSIER_SOURCES.glob("*.mp3"), key=lambda f: cle_tri(f.name))
    especes = {}
    ignores = []
    corrections_utilisees = set()

    for fichier in fichiers:
        brut = nom_brut(fichier)
        if brut in a_ignorer:
            ignores.append(fichier.name)
            continue
        if brut in corrections:
            corrections_utilisees.add(brut)
        nom = nom_affiche(brut, corrections)
        identifiant = slugifier(nom)
        espece = especes.setdefault(
            identifiant, {"id": identifiant, "nom": nom, "groupe": groupe_de(nom), "sources": []}
        )
        espece["sources"].append(fichier)

    DOSSIER_MEDIA.mkdir(parents=True, exist_ok=True)
    fichiers_attendus = set()
    nb_copies = 0
    for espece in especes.values():
        espece["sons"] = []
        for rang, source in enumerate(espece["sources"], start=1):
            nom_fichier = espece["id"] + (f"-{rang}" if rang > 1 else "") + ".mp3"
            destination = DOSSIER_MEDIA / nom_fichier
            fichiers_attendus.add(nom_fichier)
            if not destination.exists() or destination.stat().st_size != source.stat().st_size:
                shutil.copy2(source, destination)
                nb_copies += 1
            espece["sons"].append(f"media/oiseaux/chants/{nom_fichier}")

    # Supprime les anciennes copies qui ne correspondent plus à aucun fichier source.
    obsoletes = [f for f in DOSSIER_MEDIA.glob("*.mp3") if f.name not in fichiers_attendus]
    for fichier in obsoletes:
        fichier.unlink()

    liste = sorted(especes.values(), key=lambda e: cle_tri(e["nom"]))
    lignes = [
        json.dumps({k: e[k] for k in ("id", "nom", "groupe", "sons")}, ensure_ascii=False)
        for e in liste
    ]
    FICHIER_DONNEES.parent.mkdir(parents=True, exist_ok=True)
    FICHIER_DONNEES.write_text(
        "// Fichier généré par tools/generer-chants.py : ne pas modifier à la main.\n"
        "window.QUIZ_DONNEES = window.QUIZ_DONNEES || {};\n"
        f'window.QUIZ_DONNEES["{CLE_DONNEES}"] = [\n  ' + ",\n  ".join(lignes) + "\n];\n",
        encoding="utf-8",
    )

    nb_sons = sum(len(e["sons"]) for e in liste)
    print(f"{len(fichiers)} fichiers MP3 trouvés dans sources/")
    print(f"{nb_sons} sons retenus pour {len(liste)} espèces ({nb_copies} copiés, {len(obsoletes)} obsolètes supprimés)")
    for nom_fichier in ignores:
        print(f"  ignoré : {nom_fichier}")
    for espece in liste:
        if len(espece["sons"]) > 1:
            print(f"  plusieurs sons : {espece['nom']} ({len(espece['sons'])})")
    for brut in sorted(set(corrections) - corrections_utilisees):
        print(f"  correction inutilisée (aucun fichier) : {brut}")
    print(f"Données écrites dans {FICHIER_DONNEES.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
