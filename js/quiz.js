// Moteur de quiz : tirage des questions, réponses et score.
// Indépendant de l'affichage pour servir à tous les quiz (sons, vocabulaire…).

(function () {
  const { melanger, auHasard, normaliser, distanceEdition } = window.Outils;
  const NB_CHOIX = 4;

  class SessionQuiz {
    // options.mode : "qcm" (4 propositions), "saisie" (écrire le mot) ou "melange" ;
    // options.toutes : toutes les entrées du quiz, où piocher les mauvaises propositions.
    constructor(quiz, especes, options = {}) {
      this.quiz = quiz;
      this.especes = especes;
      this.options = options;
      this.questions = []; // questions déjà répondues, dans l'ordre
      this.courante = null;
      this.terminee = false;
      this.sac = [];
      this.derniere = null;
    }

    // Tirage « sac mélangé » : chaque espèce sort une fois par tour, dans un ordre
    // aléatoire, puis le sac est re-mélangé. Jamais deux fois la même d'affilée.
    tirerEspece() {
      if (this.sac.length === 0) {
        this.sac = melanger(this.especes);
        const fin = this.sac.length - 1;
        if (fin > 0 && this.sac[fin] === this.derniere) {
          [this.sac[0], this.sac[fin]] = [this.sac[fin], this.sac[0]];
        }
      }
      return this.sac.pop();
    }

    // La bonne réponse et 3 leurres, pris d'abord parmi les entrées qui partagent un thème.
    tirerChoix(espece) {
      const autres = (this.options.toutes || this.especes).filter((e) => e.id !== espece.id);
      const themes = espece.groupes || [espece.groupe];
      const proches = autres.filter((e) => (e.groupes || [e.groupe]).some((g) => themes.includes(g)));
      const lointaines = autres.filter((e) => !proches.includes(e));
      const leurres = melanger(proches).concat(melanger(lointaines)).slice(0, NB_CHOIX - 1);
      return melanger([espece, ...leurres]);
    }

    nouvelleQuestion() {
      const espece = this.tirerEspece();
      const mode = this.options.mode === "melange" ? auHasard(["qcm", "saisie"]) : this.options.mode || null;
      this.derniere = espece;
      this.courante = {
        numero: this.questions.length + 1,
        espece,
        son: espece.sons ? auHasard(espece.sons) : null,
        mode,
        choix: mode === "qcm" ? this.tirerChoix(espece) : null,
        reponse: null, // entrée choisie (liste ou propositions)
        reponseTexte: null, // mot écrit
        correcte: null,
      };
      return this.courante;
    }

    repondre(idEspece) {
      const question = this.courante;
      if (!question || question.correcte !== null) return question;
      question.reponse = (this.options.toutes || this.especes).find((e) => e.id === idEspece) || null;
      question.correcte = idEspece === question.espece.id;
      this.questions.push(question);
      return question;
    }

    // Accents, majuscules et tirets ignorés ; une faute de frappe tolérée dans les mots longs.
    repondreTexte(texte) {
      const question = this.courante;
      if (!question || question.correcte !== null) return question;
      const attendu = normaliser(question.espece.nom);
      const donne = normaliser(texte);
      question.reponseTexte = texte.trim();
      question.correcte = donne === attendu || (attendu.length >= 6 && distanceEdition(donne, attendu) <= 1);
      this.questions.push(question);
      return question;
    }

    terminer() {
      this.terminee = true;
      this.courante = null;
    }

    get score() {
      return this.questions.filter((q) => q.correcte).length;
    }

    get total() {
      return this.questions.length;
    }
  }

  window.SessionQuiz = SessionQuiz;
})();
