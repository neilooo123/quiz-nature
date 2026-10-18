// Navigation entre les écrans (via l'adresse #/…) et affichage.
//
//   #/                              choix du taxon
//   #/<taxon>                       choix du quiz
//   #/<taxon>/<quiz>                sélection des espèces
//   #/<taxon>/<quiz>/jeu            questions
//   #/<taxon>/<quiz>/resume         résumé

(function () {
  const { icone, normaliser, echapper, formaterDuree, stockage } = window.Outils;
  const app = document.getElementById("app");
  const fil = document.getElementById("fil-ariane");
  const MINIMUM_ESPECES = 2;

  let session = null; // SessionQuiz en cours, ou terminée pour le résumé
  let nettoyages = []; // appelées en quittant l'écran (arrêt des sons…)

  document.querySelectorAll("[data-icone]").forEach((el) => (el.innerHTML = icone(el.dataset.icone)));

  // ---------- Routage ----------

  function chemin(...parties) {
    return "#/" + parties.map(encodeURIComponent).join("/");
  }

  function lireRoute() {
    const [taxonId, quizId, etape] = location.hash
      .replace(/^#\/?/, "")
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    return { taxonId, quizId, etape };
  }

  function especesDu(quiz) {
    return (window.QUIZ_DONNEES || {})[quiz.donnees] || [];
  }

  function rendre() {
    nettoyages.forEach((f) => f());
    nettoyages = [];

    const route = lireRoute();
    const taxon = window.CATALOGUE.find((t) => t.id === route.taxonId);
    const quiz = taxon && taxon.quiz.find((q) => q.id === route.quizId);

    if (route.taxonId && !taxon) return location.replace("#/");
    if (route.quizId && !quiz) return location.replace(chemin(taxon.id));

    if (quiz && route.etape === "jeu" && (!session || session.quiz !== quiz || session.terminee)) {
      return location.replace(chemin(taxon.id, quiz.id));
    }
    if (quiz && route.etape === "resume" && (!session || session.quiz !== quiz)) {
      return location.replace(chemin(taxon.id, quiz.id));
    }

    if (!taxon) ecranTaxons();
    else if (!quiz) ecranQuiz(taxon);
    else if (route.etape === "jeu") ecranJeu(taxon, quiz);
    else if (route.etape === "resume") ecranResume(taxon, quiz);
    else ecranSelection(taxon, quiz);

    afficherFil(taxon, quiz, route.etape);
  }

  // Remplace le contenu de la page ; renvoie l'élément de l'écran (pour y brancher les événements).
  function afficher(html, { focusTitre = true } = {}) {
    app.innerHTML = `<div class="ecran">${html}</div>`;
    window.scrollTo(0, 0);
    const titre = app.querySelector("h1");
    if (focusTitre && titre) titre.focus({ preventScroll: true });
    return app.firstElementChild;
  }

  function enteteDePage(titre, sousTitre) {
    return `<div class="titre-page"><h1 tabindex="-1">${echapper(titre)}</h1><p>${echapper(sousTitre)}</p></div>`;
  }

  function afficherFil(taxon, quiz, etape) {
    const elements = [];
    if (taxon) {
      elements.push(quiz ? lienFil(chemin(taxon.id), taxon.nom, true) : courantFil(taxon.nom));
    }
    if (quiz) {
      elements.push(etape ? lienFil(chemin(taxon.id, quiz.id), quiz.nom) : courantFil(quiz.nom));
    }
    if (etape) elements.push(courantFil(etape === "jeu" ? "Quiz" : "Résumé"));
    fil.innerHTML = elements.join("");
  }

  function lienFil(href, texte, masquable) {
    return `<span class="fil-element${masquable ? " fil-masquable" : ""}"><span class="separateur">${icone("chevronDroite")}</span><a href="${href}">${echapper(texte)}</a></span>`;
  }

  function courantFil(texte) {
    return `<span class="fil-element"><span class="separateur">${icone("chevronDroite")}</span><span aria-current="page">${echapper(texte)}</span></span>`;
  }

  // ---------- Écran 1 : taxons ----------

  function ecranTaxons() {
    const cartes = window.CATALOGUE.map((taxon) => {
      const nb = taxon.quiz.length;
      const contenu = `
        <span class="carte-icone">${icone(taxon.icone)}</span>
        <div><h2>${echapper(taxon.nom)}</h2><p>${echapper(taxon.description)}</p></div>
        ${nb ? `<span class="badge badge--accent">${nb} quiz</span>` : `<span class="badge">Bientôt disponible</span>`}`;
      return nb
        ? `<a class="carte" href="${chemin(taxon.id)}">${contenu}</a>`
        : `<div class="carte carte--inactive" aria-disabled="true">${contenu}</div>`;
    });
    afficher(`
      ${enteteDePage("Choisis un taxon", "Sur quel groupe veux-tu t’entraîner ?")}
      <div class="grille-cartes">${cartes.join("")}</div>`);
  }

  // ---------- Écran 2 : quiz d'un taxon ----------

  function ecranQuiz(taxon) {
    const cartes = taxon.quiz.map((quiz) => {
      const nb = especesDu(quiz).length;
      return `
        <a class="carte" href="${chemin(taxon.id, quiz.id)}">
          <span class="carte-icone">${icone(quiz.icone)}</span>
          <div><h2>${echapper(quiz.nom)}</h2><p>${echapper(quiz.description)}</p></div>
          <span class="badge badge--accent">${nb} ${echapper(nb > 1 ? quiz.libelles.pluriel : quiz.libelles.singulier)}</span>
        </a>`;
    });
    afficher(`
      ${enteteDePage(taxon.nom, "Choisis le quiz que tu veux faire.")}
      ${cartes.length ? `<div class="grille-cartes">${cartes.join("")}</div>` : `<p class="vide">Aucun quiz pour l’instant : bientôt disponible.</p>`}`);
  }

  // ---------- Écran 3 : sélection des espèces ----------

  function grouperEspeces(especes) {
    const parGroupe = new Map();
    especes.forEach((e) => {
      if (!parGroupe.has(e.groupe)) parGroupe.set(e.groupe, []);
      parGroupe.get(e.groupe).push(e);
    });
    const groupes = [];
    const seules = [];
    [...parGroupe.entries()]
      .sort(([a], [b]) => normaliser(a).localeCompare(normaliser(b)))
      .forEach(([nom, liste]) => (liste.length > 1 ? groupes.push({ nom, especes: liste }) : seules.push(...liste)));
    // Les genres à une seule espèce sont réunis pour éviter une multitude de petits blocs.
    if (seules.length) {
      seules.sort((a, b) => normaliser(a.nom).localeCompare(normaliser(b.nom)));
      groupes.push({ nom: "Autres espèces", especes: seules });
    }
    return groupes;
  }

  function ecranSelection(taxon, quiz) {
    const L = quiz.libelles;
    const especes = especesDu(quiz);
    const cleStockage = "quiz-nature:selection:" + quiz.id;
    const existantes = new Set(especes.map((e) => e.id));
    const selection = new Set(stockage.lire(cleStockage, []).filter((id) => existantes.has(id)));
    const groupes = grouperEspeces(especes);

    const ecran = afficher(`
      ${enteteDePage(quiz.nom, `Coche les ${L.pluriel} sur lesquels portera le quiz.`)}
      <div class="barre-outils">
        <label class="champ">
          ${icone("loupe")}
          <input type="search" data-filtre placeholder="Filtrer les ${echapper(L.pluriel)}…" aria-label="Filtrer les ${echapper(L.pluriel)}">
        </label>
        <button type="button" class="bouton bouton--contour" data-action="tout-cocher">Tout cocher</button>
        <button type="button" class="bouton bouton--contour" data-action="tout-decocher">Tout décocher</button>
      </div>
      <p class="vide" data-aucun hidden>Aucun ${echapper(L.singulier)} ne correspond à ta recherche.</p>
      <div class="groupes">
        ${groupes
          .map(
            (groupe, i) => `
          <div class="groupe" role="group" aria-labelledby="groupe-${i}">
            <label class="groupe-entete">
              <input type="checkbox" data-groupe="${i}">
              <span id="groupe-${i}">${echapper(groupe.nom)}</span>
              <span class="compte" data-compte="${i}"></span>
            </label>
            <ul>
              ${groupe.especes
                .map(
                  (e) => `
                <li data-cle="${echapper(normaliser(e.nom))}">
                  <label class="espece">
                    <input type="checkbox" value="${e.id}" data-dans="${i}"${selection.has(e.id) ? " checked" : ""}>
                    <span>${echapper(e.nom)}</span>
                    ${e.sons.length > 1 ? `<span class="espece-sons">${e.sons.length} sons</span>` : ""}
                  </label>
                </li>`
                )
                .join("")}
            </ul>
          </div>`
          )
          .join("")}
      </div>
      <div class="barre-bas">
        <div class="conteneur barre-bas-contenu">
          <div class="barre-bas-info" aria-live="polite">
            <span data-compteur></span>
            <small data-aide></small>
          </div>
          <button type="button" class="bouton bouton--grand" data-action="commencer">Commencer ${icone("flecheDroite")}</button>
        </div>
      </div>`);

    const casesEspeces = [...ecran.querySelectorAll("input[data-dans]")];
    const casesGroupes = [...ecran.querySelectorAll("input[data-groupe]")];
    const filtre = ecran.querySelector("[data-filtre]");
    const boutonCommencer = ecran.querySelector('[data-action="commencer"]');

    const estVisible = (c) => !c.closest("li").hidden && !c.closest(".groupe").hidden;

    function cocher(cases, oui) {
      cases.forEach((c) => {
        c.checked = oui;
        oui ? selection.add(c.value) : selection.delete(c.value);
      });
      mettreAJour();
    }

    function mettreAJour() {
      casesGroupes.forEach((caseGroupe) => {
        const dedans = casesEspeces.filter((c) => c.dataset.dans === caseGroupe.dataset.groupe);
        const nb = dedans.filter((c) => c.checked).length;
        caseGroupe.checked = nb === dedans.length;
        caseGroupe.indeterminate = nb > 0 && nb < dedans.length;
        ecran.querySelector(`[data-compte="${caseGroupe.dataset.groupe}"]`).textContent = `${nb} / ${dedans.length}`;
      });
      const nb = selection.size;
      ecran.querySelector("[data-compteur]").innerHTML =
        `Sélection : <strong>${nb}</strong> / ${especes.length} ${echapper(L.pluriel)}`;
      ecran.querySelector("[data-aide]").textContent =
        nb < MINIMUM_ESPECES ? `Coche au moins ${MINIMUM_ESPECES} ${L.pluriel} pour commencer.` : "";
      boutonCommencer.disabled = nb < MINIMUM_ESPECES;
      stockage.ecrire(cleStockage, [...selection]);
    }

    filtre.addEventListener("input", () => {
      const mots = normaliser(filtre.value).split(" ").filter(Boolean);
      let total = 0;
      ecran.querySelectorAll(".groupe").forEach((groupe) => {
        let nb = 0;
        groupe.querySelectorAll("li").forEach((li) => {
          const ok = mots.every((m) => li.dataset.cle.includes(m));
          li.hidden = !ok;
          if (ok) nb++;
        });
        groupe.hidden = nb === 0;
        total += nb;
      });
      ecran.querySelector("[data-aucun]").hidden = total > 0;
    });

    ecran.addEventListener("change", (e) => {
      const c = e.target;
      if (c.matches("input[data-dans]")) {
        cocher([c], c.checked);
      } else if (c.matches("input[data-groupe]")) {
        cocher(casesEspeces.filter((x) => x.dataset.dans === c.dataset.groupe && estVisible(x)), c.checked);
      }
    });

    ecran.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "tout-cocher") cocher(casesEspeces.filter(estVisible), true);
      if (action === "tout-decocher") cocher(casesEspeces.filter(estVisible), false);
      if (action === "commencer") {
        session = new window.SessionQuiz(quiz, especes.filter((x) => selection.has(x.id)));
        location.hash = chemin(taxon.id, quiz.id, "jeu");
      }
    });

    mettreAJour();
  }

  // ---------- Écran 4 : jeu ----------

  function creerLecteur(src) {
    const audio = new Audio(src);
    audio.preload = "auto";
    const element = document.createElement("div");
    element.className = "lecteur";
    element.innerHTML = `
      <button type="button" class="lecteur-bouton" aria-label="Écouter">${icone("lecture", "icone--plein")}</button>
      <div class="lecteur-piste">
        <input type="range" min="0" max="1000" value="0" aria-label="Position dans l’enregistrement">
        <div class="lecteur-temps"><span>0:00</span><span>0:00</span></div>
      </div>`;
    const bouton = element.querySelector("button");
    const piste = element.querySelector("input");
    const [tempsActuel, tempsTotal] = element.querySelectorAll(".lecteur-temps span");
    let deplacement = false;

    function majBouton() {
      const enLecture = !audio.paused;
      bouton.innerHTML = icone(enLecture ? "pause" : "lecture", "icone--plein");
      bouton.setAttribute("aria-label", enLecture ? "Mettre en pause" : "Écouter");
    }

    bouton.addEventListener("click", () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
    audio.addEventListener("play", majBouton);
    audio.addEventListener("pause", majBouton);
    audio.addEventListener("loadedmetadata", () => (tempsTotal.textContent = formaterDuree(audio.duration)));
    audio.addEventListener("timeupdate", () => {
      if (deplacement || !audio.duration) return;
      piste.value = (audio.currentTime / audio.duration) * 1000;
      tempsActuel.textContent = formaterDuree(audio.currentTime);
    });
    audio.addEventListener("error", () => (tempsActuel.textContent = "Son indisponible"));
    piste.addEventListener("input", () => {
      deplacement = true;
      if (audio.duration) tempsActuel.textContent = formaterDuree((piste.value / 1000) * audio.duration);
    });
    piste.addEventListener("change", () => {
      if (audio.duration) audio.currentTime = (piste.value / 1000) * audio.duration;
      deplacement = false;
    });

    return {
      element,
      lire() {
        audio.play().catch(() => {}); // lecture auto parfois bloquée : le bouton reste disponible
      },
      arreter() {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      },
    };
  }

  function ecranJeu(taxon, quiz) {
    const L = quiz.libelles;
    const ecran = afficher(
      `
      <div class="jeu-entete">
        <div class="jeu-compteurs">
          <span class="numero" data-numero></span>
          <span class="badge badge--accent" data-score></span>
        </div>
        <button type="button" class="bouton bouton--danger bouton--petit" data-action="fin">${icone("drapeau")} Mettre fin au quiz</button>
      </div>
      <section class="carte-jeu" data-carte></section>`,
      { focusTitre: false }
    );
    const carte = ecran.querySelector("[data-carte]");
    const options = session.especes.map((e) => ({ valeur: e.id, libelle: e.nom }));
    let lecteur = null;
    let combobox = null;

    function majScore() {
      ecran.querySelector("[data-score]").textContent = `Score : ${session.score} / ${session.total}`;
    }

    function arreter() {
      if (lecteur) lecteur.arreter();
      if (combobox) combobox.detruire();
    }
    nettoyages.push(arreter);

    // Affiche la question en cours, ou en tire une nouvelle si elle a déjà été répondue.
    function afficherQuestion() {
      arreter();
      if (!session.courante || session.courante.correcte !== null) session.nouvelleQuestion();
      const question = session.courante;
      ecran.querySelector("[data-numero]").textContent = `Question ${question.numero}`;
      majScore();

      carte.innerHTML = `
        <h1 tabindex="-1">${echapper(L.question)}</h1>
        <div data-lecteur></div>
        <div class="zone-reponse">
          <span class="etiquette" id="etiquette-reponse">Ta réponse</span>
          <div data-combobox></div>
          <div data-retour aria-live="polite"></div>
          <div class="actions" data-actions>
            <button type="button" class="bouton bouton--grand" data-action="valider" disabled>Valider</button>
          </div>
        </div>`;

      lecteur = creerLecteur(question.son);
      carte.querySelector("[data-lecteur]").replaceWith(lecteur.element);

      combobox = window.Combobox.creer({
        options,
        placeholder: L.choisir,
        recherche: L.rechercher,
        aucun: L.aucun,
        etiquette: "etiquette-reponse",
        onChange() {
          const valider = carte.querySelector('[data-action="valider"]');
          valider.disabled = false;
          valider.focus();
        },
      });
      carte.querySelector("[data-combobox]").replaceWith(combobox.element);

      lecteur.lire();
      combobox.focus();
    }

    function valider() {
      if (!combobox.valeur) return;
      const question = session.repondre(combobox.valeur);
      combobox.definirEtat(question.correcte ? "succes" : "erreur");
      combobox.desactiver(true);
      const nom = `<b>${echapper(question.espece.nom)}</b>`;
      carte.querySelector("[data-retour]").innerHTML = question.correcte
        ? `<div class="alerte alerte--succes">${icone("cercleCoche")}<div><strong>Bonne réponse !</strong>C’est bien : ${nom}</div></div>`
        : `<div class="alerte alerte--erreur">${icone("cercleCroix")}<div><strong>Raté !</strong>C’était : ${nom}</div></div>`;
      carte.querySelector("[data-actions]").innerHTML =
        `<button type="button" class="bouton bouton--grand" data-action="suivant">Question suivante ${icone("flecheDroite")}</button>`;
      carte.querySelector('[data-action="suivant"]').focus();
      majScore();
    }

    ecran.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "valider") valider();
      if (action === "suivant") afficherQuestion();
      if (action === "fin") {
        session.terminer();
        location.hash = chemin(taxon.id, quiz.id, "resume");
      }
    });

    afficherQuestion();
  }

  // ---------- Écran 5 : résumé ----------

  function messageScore(pourcentage) {
    if (pourcentage === 100) return "Parfait, sans aucune erreur !";
    if (pourcentage >= 80) return "Excellent travail !";
    if (pourcentage >= 50) return "Bien joué, continue comme ça.";
    return "Continue à t’entraîner, ça va venir !";
  }

  function ecranResume(taxon, quiz) {
    const { score, total } = session;
    const pourcentage = total ? Math.round((score / total) * 100) : 0;
    const nbEspeces = session.especes.length;

    const lignes = session.questions.map(
      (q) => `
      <li class="recap-ligne${q.correcte ? " recap-ligne--juste" : ""}">
        <span class="recap-numero">${q.numero}</span>
        <button type="button" class="bouton bouton--contour bouton--icone" data-son="${echapper(q.son)}" aria-label="Réécouter le son de la question ${q.numero}">${icone("lecture", "icone--plein")}</button>
        <span>${echapper(q.espece.nom)}</span>
        <span${q.correcte ? "" : ' class="recap-reponse--fausse"'}>${q.reponse ? echapper(q.reponse.nom) : "—"}</span>
        <span class="recap-icone recap-icone--${q.correcte ? "juste" : "fausse"}" role="img" aria-label="${q.correcte ? "Juste" : "Faux"}">${icone(q.correcte ? "cercleCoche" : "cercleCroix")}</span>
      </li>`
    );

    const ecran = afficher(`
      ${enteteDePage("Résumé du quiz", `${quiz.nom} · ${nbEspeces} ${nbEspeces > 1 ? quiz.libelles.pluriel : quiz.libelles.singulier} sélectionnés`)}
      <div class="score">
        <div class="score-valeur">${score}<small> / ${total}</small></div>
        <div class="score-texte">
          <strong>${total ? `${pourcentage} % de bonnes réponses` : "Aucune question répondue"}</strong>
          <span>${total ? messageScore(pourcentage) : "Lance une partie pour voir ton score ici."}</span>
        </div>
        <div class="actions">
          <button type="button" class="bouton" data-action="rejouer">${icone("rejouer")} Rejouer avec la même sélection</button>
          <button type="button" class="bouton bouton--contour" data-action="modifier">Modifier la sélection</button>
          <a class="bouton bouton--fantome" href="#/">Accueil</a>
        </div>
      </div>
      ${
        total
          ? `<ol class="recap">
              <li class="recap-ligne recap-entete" aria-hidden="true"><span>N°</span><span></span><span>Bonne réponse</span><span>Ta réponse</span><span></span></li>
              ${lignes.join("")}
            </ol>`
          : ""
      }`);

    // Un seul lecteur partagé pour réécouter les sons.
    const audio = new Audio();
    let boutonActif = null;
    const majBouton = () => {
      if (boutonActif) boutonActif.innerHTML = icone(audio.paused ? "lecture" : "pause", "icone--plein");
    };
    audio.addEventListener("play", majBouton);
    audio.addEventListener("pause", majBouton);
    nettoyages.push(() => {
      audio.pause();
      audio.removeAttribute("src");
    });

    ecran.addEventListener("click", (e) => {
      const boutonSon = e.target.closest("[data-son]");
      if (boutonSon) {
        if (boutonSon === boutonActif && !audio.paused) return audio.pause();
        if (boutonActif && boutonActif !== boutonSon) boutonActif.innerHTML = icone("lecture", "icone--plein");
        if (boutonSon !== boutonActif) audio.src = boutonSon.dataset.son;
        boutonActif = boutonSon;
        audio.play().catch(() => {});
        return;
      }
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "rejouer") {
        session = new window.SessionQuiz(quiz, session.especes);
        location.hash = chemin(taxon.id, quiz.id, "jeu");
      }
      if (action === "modifier") location.hash = chemin(taxon.id, quiz.id);
    });
  }

  window.addEventListener("hashchange", rendre);
  rendre();
})();
