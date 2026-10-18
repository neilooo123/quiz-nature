// Moteur de quiz : tirage des questions, réponses et score.
// Indépendant de l'affichage pour pouvoir servir aux futurs quiz (photos…).

(function () {
  const { melanger, auHasard } = window.Outils;

  class SessionQuiz {
    constructor(quiz, especes) {
      this.quiz = quiz;
      this.especes = especes;
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

    nouvelleQuestion() {
      const espece = this.tirerEspece();
      this.derniere = espece;
      this.courante = {
        numero: this.questions.length + 1,
        espece,
        son: auHasard(espece.sons),
        reponse: null,
        correcte: null,
      };
      return this.courante;
    }

    repondre(idEspece) {
      const question = this.courante;
      if (!question || question.correcte !== null) return question;
      question.reponse = this.especes.find((e) => e.id === idEspece) || null;
      question.correcte = idEspece === question.espece.id;
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
