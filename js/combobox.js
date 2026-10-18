// Combobox (liste déroulante avec recherche) inspirée de shadcn/ui.
//
//   const cb = Combobox.creer({ options: [{ valeur, libelle }], placeholder, recherche, aucun, onChange });
//   conteneur.append(cb.element);

(function () {
  const { icone, normaliser, echapper } = window.Outils;
  let compteur = 0;

  function creer({ options, placeholder, recherche, aucun, etiquette, onChange }) {
    const id = "combobox-" + ++compteur;
    const toutes = options.map((o) => ({ ...o, cle: normaliser(o.libelle) }));
    let visibles = toutes;
    let actif = -1;
    let valeur = null;

    const racine = document.createElement("div");
    racine.className = "combobox";
    racine.innerHTML = `
      <button type="button" class="combobox-declencheur" aria-haspopup="listbox" aria-expanded="false"${
        etiquette ? ` aria-labelledby="${etiquette} ${id}-valeur"` : ""
      }>
        <span class="combobox-valeur combobox-valeur--vide" id="${id}-valeur">${echapper(placeholder)}</span>
        ${icone("chevrons")}
      </button>
      <div class="combobox-popover" hidden>
        <div class="combobox-recherche">
          ${icone("loupe")}
          <input type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${id}-liste"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${echapper(recherche)}">
        </div>
        <ul class="combobox-liste" role="listbox" id="${id}-liste"></ul>
        <p class="combobox-vide" hidden>${echapper(aucun)}</p>
      </div>`;

    const declencheur = racine.querySelector(".combobox-declencheur");
    const texteValeur = racine.querySelector(".combobox-valeur");
    const popover = racine.querySelector(".combobox-popover");
    const champ = racine.querySelector("input");
    const liste = racine.querySelector(".combobox-liste");
    const vide = racine.querySelector(".combobox-vide");

    function filtrer() {
      const requete = normaliser(champ.value);
      if (!requete) {
        visibles = toutes;
      } else {
        const mots = requete.split(" ");
        // Les noms qui commencent par la saisie passent devant.
        visibles = toutes
          .filter((o) => mots.every((m) => o.cle.includes(m)))
          .map((o, rang) => ({ o, rang, score: o.cle.startsWith(requete) ? 0 : (" " + o.cle).includes(" " + mots[0]) ? 1 : 2 }))
          .sort((a, b) => a.score - b.score || a.rang - b.rang)
          .map((x) => x.o);
      }
      liste.innerHTML = visibles
        .map(
          (o, i) =>
            `<li class="combobox-option" role="option" id="${id}-option-${i}" data-index="${i}" aria-selected="${o.valeur === valeur}">` +
            `${icone("coche")}<span>${echapper(o.libelle)}</span></li>`
        )
        .join("");
      vide.hidden = visibles.length > 0;
      liste.hidden = visibles.length === 0;
      const rangChoisi = requete ? -1 : visibles.findIndex((o) => o.valeur === valeur);
      activer(rangChoisi >= 0 ? rangChoisi : visibles.length ? 0 : -1);
    }

    function activer(index) {
      const precedent = liste.querySelector(".combobox-option--active");
      if (precedent) precedent.classList.remove("combobox-option--active");
      actif = index;
      const element = index >= 0 ? liste.children[index] : null;
      if (element) {
        element.classList.add("combobox-option--active");
        element.scrollIntoView({ block: "nearest" });
        champ.setAttribute("aria-activedescendant", element.id);
      } else {
        champ.removeAttribute("aria-activedescendant");
      }
    }

    function ouvrir(texteInitial) {
      if (declencheur.disabled || !popover.hidden) return;
      popover.hidden = false;
      declencheur.setAttribute("aria-expanded", "true");
      champ.value = texteInitial || "";
      filtrer();
      champ.focus();
      document.addEventListener("pointerdown", clicExterieur, true);
      requestAnimationFrame(() => popover.scrollIntoView({ block: "nearest" }));
    }

    function fermer(rendreFocus) {
      if (popover.hidden) return;
      popover.hidden = true;
      declencheur.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", clicExterieur, true);
      if (rendreFocus) declencheur.focus();
    }

    function clicExterieur(e) {
      if (!racine.contains(e.target)) fermer(false);
    }

    function choisir(index) {
      const option = visibles[index];
      if (!option) return;
      valeur = option.valeur;
      texteValeur.textContent = option.libelle;
      texteValeur.classList.remove("combobox-valeur--vide");
      fermer(true);
      if (onChange) onChange(valeur);
    }

    declencheur.addEventListener("click", () => (popover.hidden ? ouvrir() : fermer(true)));

    // Taper directement une lettre sur le bouton ouvre la recherche.
    declencheur.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && e.key !== " ") {
        e.preventDefault();
        ouvrir(e.key);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        ouvrir();
      }
    });

    champ.addEventListener("input", filtrer);

    champ.addEventListener("keydown", (e) => {
      const n = visibles.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (n) activer((actif + 1) % n);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (n) activer((actif - 1 + n) % n);
          break;
        case "Home":
          e.preventDefault();
          if (n) activer(0);
          break;
        case "End":
          e.preventDefault();
          if (n) activer(n - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (actif >= 0) choisir(actif);
          break;
        case "Escape":
          e.preventDefault();
          fermer(true);
          break;
        case "Tab":
          fermer(false);
          break;
      }
    });

    liste.addEventListener("pointermove", (e) => {
      const option = e.target.closest(".combobox-option");
      if (option && Number(option.dataset.index) !== actif) activer(Number(option.dataset.index));
    });
    // Garde le focus dans le champ pendant le clic.
    liste.addEventListener("mousedown", (e) => e.preventDefault());
    liste.addEventListener("click", (e) => {
      const option = e.target.closest(".combobox-option");
      if (option) choisir(Number(option.dataset.index));
    });

    return {
      element: racine,
      get valeur() {
        return valeur;
      },
      definirEtat(etat) {
        racine.classList.toggle("combobox--succes", etat === "succes");
        racine.classList.toggle("combobox--erreur", etat === "erreur");
      },
      desactiver(oui) {
        fermer(false);
        declencheur.disabled = oui;
      },
      focus() {
        declencheur.focus();
      },
      detruire() {
        fermer(false);
      },
    };
  }

  window.Combobox = { creer };
})();
