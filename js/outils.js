// Petites fonctions partagées par les autres scripts.

(function () {
  // Tracés d'icônes au format Lucide (24 × 24).
  const TRACES = {
    oiseau:
      '<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/>',
    patte:
      '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
    papillon:
      '<path d="M12 8v12"/><path d="M12 9C10.5 5.5 7 3.5 4.5 4.3 2.3 5 2.6 9.8 6.5 11.5 3.6 12.6 3.4 16.6 5.7 17.8 8.2 19 11 15.6 12 12.5"/><path d="M12 9c1.5-3.5 5-5.5 7.5-4.7 2.2.7 1.9 5.5-2 7.2 2.9 1.1 3.1 5.1.8 6.3-2.5 1.2-5.3-2.2-6.3-5.3"/><path d="m10 4 2 3 2-3"/>',
    casque:
      '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    coche: '<path d="M20 6 9 17l-5-5"/>',
    croix: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chevrons: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    chevronDroite: '<path d="m9 18 6-6-6-6"/>',
    chevronBas: '<path d="m6 9 6 6 6-6"/>',
    loupe: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    lecture: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    rejouer: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    flecheDroite: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    livre:
      '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    drapeau: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    cercleCoche: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    cercleCroix: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  };

  function icone(nom, classe) {
    return (
      '<svg class="icone' + (classe ? " " + classe : "") + '" viewBox="0 0 24 24" aria-hidden="true">' +
      (TRACES[nom] || "") +
      "</svg>"
    );
  }

  // « Pie-grièche » et « pie grieche » donnent la même chose.
  function normaliser(texte) {
    return String(texte)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[-'’_.,/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Nombre minimal de lettres à ajouter, enlever ou changer pour passer de a à b.
  function distanceEdition(a, b) {
    let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const ligne = [i];
      for (let j = 1; j <= b.length; j++) {
        ligne[j] = Math.min(precedente[j] + 1, ligne[j - 1] + 1, precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      precedente = ligne;
    }
    return precedente[b.length];
  }

  function echapper(texte) {
    return String(texte)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function melanger(liste) {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  }

  function auHasard(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function formaterDuree(secondes) {
    if (!isFinite(secondes) || secondes < 0) secondes = 0;
    const s = Math.floor(secondes);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  // localStorage peut être indisponible (navigation privée, stockage bloqué).
  const stockage = {
    lire(cle, defaut) {
      try {
        const valeur = localStorage.getItem(cle);
        return valeur === null ? defaut : JSON.parse(valeur);
      } catch (e) {
        return defaut;
      }
    },
    ecrire(cle, valeur) {
      try {
        localStorage.setItem(cle, JSON.stringify(valeur));
      } catch (e) {
        /* ignoré */
      }
    },
  };

  window.Outils = { icone, normaliser, distanceEdition, echapper, melanger, auHasard, formaterDuree, stockage };
})();
