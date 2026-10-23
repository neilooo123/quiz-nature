"""Prépare les données du quiz « Vocabulaire nature ».

Lit data/vocabulaire.tsv : un tableau à 4 colonnes séparées par des tabulations
(Nom, Définition, Thème, Sources), comme un copier-coller depuis un tableur.
Plusieurs thèmes se séparent par « ; ». Écrit la liste dans data/vocabulaire.js.

Utilisation (depuis la racine du projet) :
    python tools/generer-vocabulaire.py
"""

import csv
import re
import sys
from collections import Counter
from pathlib import Path

from outils_texte import cle_tri, ecrire_donnees, nfc, slugifier

RACINE = Path(__file__).resolve().parent.parent
FICHIER_TABLEAU = RACINE / "data" / "vocabulaire.tsv"
FICHIER_DONNEES = RACINE / "data" / "vocabulaire.js"
CLE_DONNEES = "vocabulaire"
THEME_PAR_DEFAUT = "Sans thème"


def nettoyer(texte):
    return re.sub(r"\s+", " ", nfc(texte or "")).strip().replace("'", "’")


def main():
    sys.stdout.reconfigure(errors="replace")

    with FICHIER_TABLEAU.open(encoding="utf-8-sig", newline="") as f:
        _entete, *lignes = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)

    mots = {}
    for numero, ligne in enumerate(lignes, start=2):
        if not any(cellule.strip() for cellule in ligne):
            continue
        nom, definition, themes, source = (nettoyer(c) for c in (ligne + [""] * 4)[:4])
        if not nom or not definition:
            print(f"  ligne {numero} ignorée : mot ou définition manquant")
            continue
        identifiant = slugifier(nom)
        if identifiant in mots:
            print(f"  ligne {numero} ignorée : « {nom} » est déjà dans le tableau")
            continue
        mots[identifiant] = {
            "id": identifiant,
            "nom": nom,
            "definition": definition,
            "groupes": [t for t in (nettoyer(x) for x in themes.split(";")) if t] or [THEME_PAR_DEFAUT],
            "source": source,
        }

    liste = sorted(mots.values(), key=lambda m: cle_tri(m["nom"]))
    ecrire_donnees(FICHIER_DONNEES, CLE_DONNEES, liste, "tools/generer-vocabulaire.py")

    print(f"{len(liste)} mots écrits dans {FICHIER_DONNEES.relative_to(RACINE)}")
    for theme, nb in sorted(Counter(t for m in liste for t in m["groupes"]).items()):
        print(f"  thème « {theme} » : {nb} mots")


if __name__ == "__main__":
    main()
