"""Fonctions partagées par les scripts de préparation des données."""

import json
import re
import unicodedata


def nfc(texte):
    return unicodedata.normalize("NFC", texte)


def slugifier(texte):
    texte = texte.replace("œ", "oe").replace("Œ", "oe").replace("æ", "ae").replace("Æ", "ae")
    texte = unicodedata.normalize("NFD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", texte.lower()).strip("-")


def cle_tri(texte):
    return slugifier(texte).replace("-", " ")


def ecrire_donnees(fichier, cle, elements, script):
    """Écrit window.QUIZ_DONNEES[cle] = [...] avec un élément par ligne."""
    lignes = [json.dumps(e, ensure_ascii=False) for e in elements]
    fichier.parent.mkdir(parents=True, exist_ok=True)
    fichier.write_text(
        f"// Fichier généré par {script} : ne pas modifier à la main.\n"
        "window.QUIZ_DONNEES = window.QUIZ_DONNEES || {};\n"
        f'window.QUIZ_DONNEES["{cle}"] = [\n  ' + ",\n  ".join(lignes) + "\n];\n",
        encoding="utf-8",
    )
