// Navigation entre les écrans (via l'adresse #/…) et affichage.
//
//   #/                                       accueil : choix du taxon
//   #/<taxon>[/<groupe>…]                    sous-groupes et quiz (ex. Mammifères > Chiroptères)
//   #/<taxon>[/<groupe>…]/<quiz>             sélection des espèces
//   #/<taxon>[/<groupe>…]/<quiz>/jeu         questions
//   #/<taxon>[/<groupe>…]/<quiz>/resume      résumé

(function () {
  const { icone, normaliser, echapper, formaterDuree, stockage } = window.Outils;
  const app = document.getElementById("app");
  const fil = document.getElementById("fil-ariane");
  const sourceQuiz = document.getElementById("source-quiz");
  const MINIMUM_ESPECES = 2;

  let session = null; // SessionQuiz en cours, ou terminée pour le résumé
  let nettoyages = []; // appelées en quittant l'écran (arrêt des sons…)

  document.querySelectorAll("[data-icone]").forEach((el) => (el.innerHTML = icone(el.dataset.icone)));

  // ---------- Routage ----------

  function chemin(...parties) {
    return "#/" + parties.map(encodeURIComponent).join("/");
  }

  // Descend dans le catalogue : taxon, sous-groupes éventuels, puis quiz et étape.
  function lireRoute() {
    const parties = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const noeuds = [];
    let enfants = window.CATALOGUE;
    let i = 0;
    for (; i < parties.length; i++) {
      const noeud = enfants.find((n) => n.id === parties[i]);
      if (!noeud) break;
      noeuds.push(noeud);
      enfants = noeud.groupes || [];
    }
    const dernier = noeuds[noeuds.length - 1];
    const quiz = dernier && (dernier.quiz || []).find((q) => q.id === parties[i]);
    if (quiz) i++;
    const etape = quiz && ["jeu", "resume"].includes(parties[i]) ? parties[i++] : undefined;
    return { noeuds, quiz, etape, reconnue: i === parties.length };
  }

  function nbQuiz(noeud) {
    return (noeud.quiz || []).length + (noeud.groupes || []).reduce((total, g) => total + nbQuiz(g), 0);
  }

  function especesDu(quiz) {
    return (window.QUIZ_DONNEES || {})[quiz.donnees] || [];
  }

  function rendre() {
    nettoyages.forEach((f) => f());
    nettoyages = [];

    const { noeuds, quiz, etape, reconnue } = lireRoute();
    // Ids de l'adresse jusqu'au quiz (ou jusqu'au dernier groupe) : base des liens.
    const base = noeuds.map((n) => n.id).concat(quiz ? [quiz.id] : []);

    // Adresse inconnue, ou partie terminée / jamais commencée : on remonte au dernier niveau valide.
    if (!reconnue) return location.replace(chemin(...base));
    if (etape === "jeu" && (!session || session.quiz !== quiz || session.terminee)) {
      return location.replace(chemin(...base));
    }
    if (etape === "resume" && (!session || session.quiz !== quiz)) return location.replace(chemin(...base));

    if (!noeuds.length) ecranAccueil();
    else if (!quiz) ecranNoeud(noeuds[noeuds.length - 1], base);
    else if (etape === "jeu") ecranJeu(base, quiz);
    else if (etape === "resume") ecranResume(base, quiz);
    else ecranSelection(base, quiz);

    afficherFil(noeuds, quiz, etape);
    afficherSource(quiz);
  }

  // Bas de page : source des données du quiz affiché (rien en dehors des quiz).
  function afficherSource(quiz) {
    let texte = (quiz && quiz.source) || "";
    if (texte.includes("{sources}")) {
      const sources = [...new Set(especesDu(quiz).map((e) => e.source).filter(Boolean))];
      texte = texte.replace("{sources}", sources.sort((a, b) => a.localeCompare(b, "fr")).join(", "));
    }
    sourceQuiz.textContent = texte;
    sourceQuiz.hidden = !texte;
  }

  // Remplace le contenu de la page ; renvoie l'élément de l'écran (pour y brancher les événements).
  function afficher(html, { focusTitre = true } = {}) {
    app.innerHTML = `<div class="ecran">${html}</div>`;
    window.scrollTo(0, 0);
    const titre = app.querySelector("h1");
    if (focusTitre && titre) titre.focus({ preventScroll: true });
    return app.firstElementChild;
  }

  // Accord des libellés : « les oiseaux sélectionnés » / « les chauves-souris sélectionnées ».
  function accord(quiz, masculin, feminin) {
    return quiz.libelles.feminin ? feminin : masculin;
  }

  function enteteDePage(titre, sousTitre) {
    return `<div class="titre-page"><h1 tabindex="-1">${echapper(titre)}</h1><p>${echapper(sousTitre)}</p></div>`;
  }

  function afficherFil(noeuds, quiz, etape) {
    const ids = noeuds.map((n) => n.id);
    // Sur téléphone, faute de place, seul le dernier niveau reste affiché.
    const elements = noeuds.map((n, i) =>
      i === noeuds.length - 1 && !quiz
        ? courantFil(n.nom)
        : lienFil(chemin(...ids.slice(0, i + 1)), n.nom, true)
    );
    if (quiz) {
      elements.push(etape ? lienFil(chemin(...ids, quiz.id), quiz.nom) : courantFil(quiz.nom));
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

  // Petits boutons ▶ portant data-son : un seul lecteur partagé, un seul son à la fois.
  function brancherBoutonsSon(ecran) {
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
      const bouton = e.target.closest("[data-son]");
      if (!bouton) return;
      if (bouton === boutonActif && !audio.paused) return audio.pause();
      if (boutonActif && boutonActif !== bouton) boutonActif.innerHTML = icone("lecture", "icone--plein");
      if (bouton !== boutonActif) audio.src = bouton.dataset.son;
      boutonActif = bouton;
      audio.play().catch(() => {});
    });
  }

  // ---------- Écran 1 : accueil ----------

  // Carte d'un taxon ou d'un sous-groupe ; grisée tant qu'il n'a aucun quiz.
  function carteNoeud(noeud, href) {
    const nb = nbQuiz(noeud);
    const contenu = `
      <span class="carte-icone">${icone(noeud.icone)}</span>
      <div><h2>${echapper(noeud.nom)}</h2><p>${echapper(noeud.description)}</p></div>
      ${nb ? `<span class="badge badge--accent">${nb} quiz</span>` : `<span class="badge">Bientôt disponible</span>`}`;
    return nb
      ? `<a class="carte" href="${href}">${contenu}</a>`
      : `<div class="carte carte--inactive" aria-disabled="true">${contenu}</div>`;
  }

  function ecranAccueil() {
    afficher(`
      ${enteteDePage("Que veux-tu réviser ?", "Choisis un taxon ou le vocabulaire.")}
      <div class="grille-cartes">${window.CATALOGUE.map((t) => carteNoeud(t, chemin(t.id))).join("")}</div>`);
  }

  // ---------- Écran 2 : sous-groupes et quiz d'un taxon ----------

  function ecranNoeud(noeud, base) {
    const groupes = noeud.groupes || [];
    const cartes = groupes
      .map((g) => carteNoeud(g, chemin(...base, g.id)))
      .concat(
        (noeud.quiz || []).map((quiz) => {
          const nb = especesDu(quiz).length;
          return `
            <a class="carte" href="${chemin(...base, quiz.id)}">
              <span class="carte-icone">${icone(quiz.icone)}</span>
              <div><h2>${echapper(quiz.nom)}</h2><p>${echapper(quiz.description)}</p></div>
              <span class="badge badge--accent">${nb} ${echapper(nb > 1 ? quiz.libelles.pluriel : quiz.libelles.singulier)}</span>
            </a>`;
        })
      );
    const consigne = groupes.length ? "Choisis un groupe." : "Choisis le quiz que tu veux faire.";
    afficher(`
      ${enteteDePage(noeud.nom, consigne)}
      ${cartes.length ? `<div class="grille-cartes">${cartes.join("")}</div>` : `<p class="vide">Aucun quiz pour l’instant : bientôt disponible.</p>`}`);
  }

  // ---------- Écran 3 : sélection des espèces ----------

  // Une entrée peut appartenir à plusieurs groupes (un mot de vocabulaire à plusieurs thèmes).
  function grouperEspeces(especes, fusionnerSeules) {
    const parGroupe = new Map();
    especes.forEach((e) => {
      (e.groupes || [e.groupe]).forEach((nom) => {
        if (!parGroupe.has(nom)) parGroupe.set(nom, []);
        parGroupe.get(nom).push(e);
      });
    });
    const groupes = [];
    const seules = [];
    [...parGroupe.entries()]
      .sort(([a], [b]) => normaliser(a).localeCompare(normaliser(b)))
      .forEach(([nom, liste]) =>
        fusionnerSeules && liste.length === 1 ? seules.push(...liste) : groupes.push({ nom, especes: liste })
      );
    // Les genres d'oiseaux à une seule espèce sont réunis pour éviter une multitude de petits blocs.
    if (seules.length) {
      seules.sort((a, b) => normaliser(a.nom).localeCompare(normaliser(b.nom)));
      groupes.push({ nom: "Autres espèces", especes: seules });
    }
    return groupes;
  }

  // Sections (catégories de sons) dans l'ordre des données, chacune découpée en groupes.
  function decouperEnSections(especes, fusionnerSeules) {
    const parCategorie = new Map();
    especes.forEach((e) => {
      const nom = e.categorie || "";
      if (!parCategorie.has(nom)) parCategorie.set(nom, []);
      parCategorie.get(nom).push(e);
    });
    return [...parCategorie.entries()].map(([nom, liste]) => ({ nom, groupes: grouperEspeces(liste, fusionnerSeules) }));
  }

  function ecranSelection(base, quiz) {
    const L = quiz.libelles;
    const especes = especesDu(quiz);
    const cleStockage = "quiz-nature:selection:" + quiz.id;
    const existantes = new Set(especes.map((e) => e.id));
    const selection = new Set(stockage.lire(cleStockage, []).filter((id) => existantes.has(id)));
    const sections = decouperEnSections(especes, quiz.type !== "vocabulaire");
    const avecTitres = sections.length > 1;
    // Sections dépliées (repliées par défaut pour garder la liste courte sur téléphone).
    const cleOuvertes = "quiz-nature:sections-ouvertes:" + quiz.id;
    const ouvertes = new Set(stockage.lire(cleOuvertes, []));
    const cleMode = "quiz-nature:mode:" + quiz.id;
    const modeMemorise = stockage.lire(cleMode, null);
    const modes = quiz.modes || [];
    const modeParDefaut = modes.some((m) => m.id === modeMemorise) ? modeMemorise : modes[0]?.id;
    let numeroGroupe = 0;

    const htmlGroupe = (groupe, s) => {
      const i = numeroGroupe++;
      return `
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
                <li class="espece" data-cle="${echapper(normaliser(e.nom))}">
                  <input type="checkbox" id="case-${i}-${e.id}" value="${e.id}" data-dans="${i}" data-section="${s}">
                  ${e.sons ? `<button type="button" class="bouton-ecoute" data-son="${echapper(e.sons[0])}" aria-label="Écouter : ${echapper(e.nom)}">${icone("lecture", "icone--plein")}</button>` : ""}
                  <label for="case-${i}-${e.id}">${echapper(e.nom)}</label>
                  ${e.sons && e.sons.length > 1 ? `<span class="espece-sons">${e.sons.length} sons</span>` : ""}
                </li>`
                )
                .join("")}
            </ul>
          </div>`;
    };

    const ecran = afficher(`
      ${enteteDePage(quiz.nom, `Coche les ${L.pluriel} sur ${accord(quiz, "lesquels", "lesquelles")} portera le quiz.`)}
      <div class="barre-outils">
        <label class="champ">
          ${icone("loupe")}
          <input type="search" data-filtre placeholder="Filtrer les ${echapper(L.pluriel)}…" aria-label="Filtrer les ${echapper(L.pluriel)}">
        </label>
        <button type="button" class="bouton bouton--contour" data-action="tout-cocher">Tout cocher</button>
        <button type="button" class="bouton bouton--contour" data-action="tout-decocher">Tout décocher</button>
      </div>
      ${
        modes.length
          ? `<fieldset class="choix-mode">
              <legend>Type de questions</legend>
              <div class="segments">
                ${modes
                  .map(
                    (m) =>
                      `<label class="segment"><input type="radio" name="mode" value="${m.id}"${m.id === modeParDefaut ? " checked" : ""}><span>${echapper(m.nom)}</span></label>`
                  )
                  .join("")}
              </div>
            </fieldset>`
          : ""
      }
      <p class="vide" data-aucun hidden>${accord(quiz, "Aucun", "Aucune")} ${echapper(L.singulier)} ne correspond à ta recherche.</p>
      ${sections
        .map(
          (section, s) => `
        <section class="categorie${avecTitres && !ouvertes.has(section.nom) ? " categorie--repliee" : ""}" data-nom-section="${echapper(section.nom)}">
          ${
            avecTitres
              ? `<div class="categorie-entete">
                  <input type="checkbox" data-section-case="${s}" aria-label="Tout cocher : ${echapper(section.nom)}">
                  <h2>
                    <button type="button" class="categorie-bascule" data-bascule aria-controls="section-${s}" aria-expanded="${ouvertes.has(section.nom)}">
                      <span class="categorie-titre">
                        <span>${echapper(section.nom)}</span>
                        <span class="compte" data-compte-section="${s}"></span>
                      </span>
                      ${icone("chevronBas", "categorie-chevron")}
                    </button>
                  </h2>
                </div>`
              : ""
          }
          <div class="groupes" id="section-${s}">${section.groupes.map((groupe) => htmlGroupe(groupe, s)).join("")}</div>
        </section>`
        )
        .join("")}
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
    const casesSections = [...ecran.querySelectorAll("input[data-section-case]")];
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

    // Case d'un groupe ou d'une section : cochée, à moitié (tiret) ou vide.
    function majCaseParente(caseParente, dedans, compte) {
      const nb = dedans.filter((c) => c.checked).length;
      caseParente.checked = nb === dedans.length;
      caseParente.indeterminate = nb > 0 && nb < dedans.length;
      compte.textContent = `${nb} / ${dedans.length}`;
    }

    function mettreAJour() {
      // Un même mot peut avoir une case dans plusieurs thèmes : toutes suivent la sélection.
      casesEspeces.forEach((c) => (c.checked = selection.has(c.value)));
      casesGroupes.forEach((c) =>
        majCaseParente(
          c,
          casesEspeces.filter((x) => x.dataset.dans === c.dataset.groupe),
          ecran.querySelector(`[data-compte="${c.dataset.groupe}"]`)
        )
      );
      casesSections.forEach((c) =>
        majCaseParente(
          c,
          casesEspeces.filter((x) => x.dataset.section === c.dataset.sectionCase),
          ecran.querySelector(`[data-compte-section="${c.dataset.sectionCase}"]`)
        )
      );
      const nb = selection.size;
      ecran.querySelector("[data-compteur]").innerHTML =
        `Sélection : <strong>${nb}</strong> / ${especes.length} ${echapper(L.pluriel)}`;
      ecran.querySelector("[data-aide]").textContent =
        nb < MINIMUM_ESPECES ? `Coche au moins ${MINIMUM_ESPECES} ${L.pluriel} pour commencer.` : "";
      boutonCommencer.disabled = nb < MINIMUM_ESPECES;
      stockage.ecrire(cleStockage, [...selection]);
    }

    // Pendant une recherche, les sections repliées s'ouvrent pour montrer les résultats.
    function majBascules() {
      const recherche = ecran.classList.contains("ecran--recherche");
      ecran.querySelectorAll("[data-bascule]").forEach((bouton) => {
        const repliee = bouton.closest(".categorie").classList.contains("categorie--repliee");
        bouton.setAttribute("aria-expanded", String(recherche || !repliee));
      });
    }

    function basculer(section) {
      const repliee = section.classList.toggle("categorie--repliee");
      const nom = section.dataset.nomSection;
      repliee ? ouvertes.delete(nom) : ouvertes.add(nom);
      stockage.ecrire(cleOuvertes, [...ouvertes]);
      majBascules();
      // En repliant une longue section, ramène son titre à l'écran.
      const haut = section.getBoundingClientRect().top - document.querySelector(".entete").offsetHeight;
      if (repliee && haut < 0) window.scrollBy(0, haut - 8);
    }

    filtre.addEventListener("input", () => {
      const mots = normaliser(filtre.value).split(" ").filter(Boolean);
      ecran.classList.toggle("ecran--recherche", mots.length > 0);
      majBascules();
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
      ecran.querySelectorAll(".categorie").forEach((section) => {
        section.hidden = !section.querySelector(".groupe:not([hidden])");
      });
      ecran.querySelector("[data-aucun]").hidden = total > 0;
    });

    ecran.addEventListener("change", (e) => {
      const c = e.target;
      if (c.matches("input[data-dans]")) {
        cocher([c], c.checked);
      } else if (c.matches("input[data-groupe]")) {
        cocher(casesEspeces.filter((x) => x.dataset.dans === c.dataset.groupe && estVisible(x)), c.checked);
      } else if (c.matches("input[data-section-case]")) {
        cocher(casesEspeces.filter((x) => x.dataset.section === c.dataset.sectionCase && estVisible(x)), c.checked);
      } else if (c.name === "mode") {
        stockage.ecrire(cleMode, c.value);
      }
    });

    brancherBoutonsSon(ecran);

    ecran.addEventListener("click", (e) => {
      const bascule = e.target.closest("[data-bascule]");
      if (bascule) basculer(bascule.closest(".categorie"));
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "tout-cocher") cocher(casesEspeces.filter(estVisible), true);
      if (action === "tout-decocher") cocher(casesEspeces.filter(estVisible), false);
      if (action === "commencer") {
        session = new window.SessionQuiz(quiz, especes.filter((x) => selection.has(x.id)), {
          mode: ecran.querySelector('input[name="mode"]:checked')?.value || quiz.mode,
          toutes: especes,
        });
        location.hash = chemin(...base, "jeu");
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

  function ecranJeu(base, quiz) {
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
      <section class="carte-jeu${quiz.type === "image-qcm" ? " carte-jeu--large" : ""}" data-carte></section>`,
      { focusTitre: false }
    );
    const carte = ecran.querySelector("[data-carte]");
    const options = session.especes
      .map((e) => ({ valeur: e.id, libelle: e.nom }))
      .sort((a, b) => normaliser(a.libelle).localeCompare(normaliser(b.libelle)));
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
      if (quiz.type === "vocabulaire") afficherDefinition(question);
      else if (quiz.type === "image-qcm") afficherImage(question);
      else afficherSon(question);
    }

    function htmlChoix(question) {
      return `<div class="choix" role="group" aria-label="Propositions">
        ${question.choix
          .map((c) => `<button type="button" class="choix-bouton" data-choix="${c.id}">${echapper(c.nom)}</button>`)
          .join("")}
      </div>`;
    }

    // Quiz en images : une image (ex. carte de répartition), 4 propositions.
    function afficherImage(question) {
      carte.innerHTML = `
        <h1 tabindex="-1">${echapper(L.question)}</h1>
        <a href="${echapper(question.espece.image)}" target="_blank" rel="noopener" title="Ouvrir l’image en grand">
          <img class="image-question" src="${echapper(question.espece.image)}" alt="${echapper(L.image)}">
        </a>
        <div class="zone-reponse">
          ${htmlChoix(question)}
          <div data-retour aria-live="polite"></div>
          <div class="actions" data-actions></div>
        </div>`;
      carte.querySelector("[data-choix]").focus({ preventScroll: true });
    }

    // Quiz sonore : on écoute, on choisit le nom dans la combobox.
    function afficherSon(question) {
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

    // Quiz de vocabulaire : on lit la définition, puis 4 propositions ou le mot à écrire.
    function afficherDefinition(question) {
      const qcm = question.mode === "qcm";
      carte.innerHTML = `
        <h1 tabindex="-1">${echapper(L.question)}</h1>
        <blockquote class="definition">${echapper(question.espece.definition)}</blockquote>
        <div class="zone-reponse">
          ${
            qcm
              ? htmlChoix(question)
              : `<label class="etiquette" for="saisie-reponse">Ta réponse</label>
                <input type="text" class="champ-texte" id="saisie-reponse" data-saisie placeholder="${echapper(L.saisie)}"
                  autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">`
          }
          <div data-retour aria-live="polite"></div>
          <div class="actions" data-actions>
            ${qcm ? "" : `<button type="button" class="bouton bouton--grand" data-action="valider-saisie" disabled>Valider</button>`}
          </div>
        </div>`;

      if (qcm) return carte.querySelector("[data-choix]").focus();
      const saisie = carte.querySelector("[data-saisie]");
      saisie.addEventListener("input", () => {
        carte.querySelector('[data-action="valider-saisie"]').disabled = !saisie.value.trim();
      });
      saisie.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        // Sans cela, la même touche Entrée « clique » ensuite sur « Question suivante »,
        // qui vient de prendre le focus, et le résultat disparaît aussitôt.
        e.preventDefault();
        validerSaisie();
      });
      saisie.focus();
    }

    function afficherRetour(question) {
      const nom = `<b>${echapper(question.espece.nom)}</b>`;
      // Accepté malgré une faute de frappe ou un accent oublié (les majuscules ne comptent pas).
      const fauteOrthographe =
        question.correcte &&
        question.reponseTexte &&
        question.reponseTexte.toLowerCase() !== question.espece.nom.toLowerCase();
      const infos = [
        question.espece.groupes ? `Thème : ${question.espece.groupes.map(echapper).join(", ")}` : "",
        question.espece.source ? `Source : ${echapper(question.espece.source)}` : "",
      ].filter(Boolean);
      const meta = infos.length ? `<small class="alerte-meta">${infos.join(" · ")}</small>` : "";
      carte.querySelector("[data-retour]").innerHTML = question.correcte
        ? `<div class="alerte alerte--succes">${icone("cercleCoche")}<div><strong>Bonne réponse !</strong>C’est bien : ${nom}${
            fauteOrthographe ? " (vérifie l’orthographe)" : ""
          }${meta}</div></div>`
        : `<div class="alerte alerte--erreur">${icone("cercleCroix")}<div><strong>Raté !</strong>C’était : ${nom}${meta}</div></div>`;
      carte.querySelector("[data-actions]").innerHTML =
        `<button type="button" class="bouton bouton--grand" data-action="suivant">Question suivante ${icone("flecheDroite")}</button>`;
      carte.querySelector('[data-action="suivant"]').focus();
      majScore();
    }

    function valider() {
      if (!combobox.valeur) return;
      const question = session.repondre(combobox.valeur);
      combobox.definirEtat(question.correcte ? "succes" : "erreur");
      combobox.desactiver(true);
      afficherRetour(question);
    }

    function choisir(id) {
      const question = session.repondre(id);
      carte.querySelectorAll("[data-choix]").forEach((bouton) => {
        bouton.disabled = true;
        if (bouton.dataset.choix === question.espece.id) bouton.classList.add("choix-bouton--juste");
        else if (bouton.dataset.choix === id) bouton.classList.add("choix-bouton--faux");
      });
      afficherRetour(question);
    }

    function validerSaisie() {
      const saisie = carte.querySelector("[data-saisie]");
      if (!saisie.value.trim() || saisie.readOnly) return;
      const question = session.repondreTexte(saisie.value);
      saisie.readOnly = true;
      saisie.classList.add(question.correcte ? "champ-texte--juste" : "champ-texte--faux");
      afficherRetour(question);
    }

    ecran.addEventListener("click", (e) => {
      const choix = e.target.closest("[data-choix]");
      if (choix && !choix.disabled) return choisir(choix.dataset.choix);
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "valider") valider();
      if (action === "valider-saisie") validerSaisie();
      if (action === "suivant") afficherQuestion();
      if (action === "fin") {
        session.terminer();
        location.hash = chemin(...base, "resume");
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

  function ecranResume(base, quiz) {
    const { score, total } = session;
    const pourcentage = total ? Math.round((score / total) * 100) : 0;
    const nbEspeces = session.especes.length;

    const lignes = session.questions.map(
      (q) => `
      <li class="recap-ligne${q.correcte ? " recap-ligne--juste" : ""}">
        <span class="recap-numero">${q.numero}</span>
        ${
          q.son
            ? `<button type="button" class="bouton bouton--contour bouton--icone" data-son="${echapper(q.son)}" aria-label="Réécouter le son de la question ${q.numero}">${icone("lecture", "icone--plein")}</button>`
            : q.espece.image
              ? `<a href="${echapper(q.espece.image)}" target="_blank" rel="noopener"><img class="recap-vignette" src="${echapper(q.espece.image)}" alt="Image de la question ${q.numero}"></a>`
              : "<span></span>"
        }
        <span>${echapper(q.espece.nom)}${q.espece.definition ? `<small class="recap-definition">${echapper(q.espece.definition)}</small>` : ""}</span>
        <span${q.correcte ? "" : ' class="recap-reponse--fausse"'}>${echapper(q.reponse ? q.reponse.nom : q.reponseTexte || "—")}</span>
        <span class="recap-icone recap-icone--${q.correcte ? "juste" : "fausse"}" role="img" aria-label="${q.correcte ? "Juste" : "Faux"}">${icone(q.correcte ? "cercleCoche" : "cercleCroix")}</span>
      </li>`
    );

    const ecran = afficher(`
      ${enteteDePage("Résumé du quiz", `${quiz.nom} · ${nbEspeces} ${quiz.libelles.pluriel} ${accord(quiz, "sélectionnés", "sélectionnées")}`)}
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
          ? `<ol class="recap${quiz.type === "image-qcm" ? " recap--images" : ""}">
              <li class="recap-ligne recap-entete" aria-hidden="true"><span>N°</span><span></span><span>Bonne réponse</span><span>Ta réponse</span><span></span></li>
              ${lignes.join("")}
            </ol>`
          : ""
      }`);

    brancherBoutonsSon(ecran);

    ecran.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "rejouer") {
        session = new window.SessionQuiz(quiz, session.especes, session.options);
        location.hash = chemin(...base, "jeu");
      }
      if (action === "modifier") location.hash = chemin(...base);
    });
  }

  window.addEventListener("hashchange", rendre);
  rendre();
})();
