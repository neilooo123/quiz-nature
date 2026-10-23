// Catalogue des taxons et de leurs quiz.
// Pour ajouter un quiz : ajouter une entrée dans « quiz » et charger son fichier
// de données dans index.html (window.QUIZ_DONNEES[<donnees>]).
//
// Types de quiz :
//   "audio-saisie" : on écoute un son et on choisit le nom dans une combobox.
//   "vocabulaire"  : on lit une définition et on retrouve le mot, parmi 4 propositions
//                    ou en l'écrivant (« modes » proposés avant de commencer).

window.CATALOGUE = [
  {
    id: "ornithologie",
    nom: "Ornithologie",
    description: "Les oiseaux : chants, cris et identification.",
    icone: "oiseau",
    quiz: [
      {
        id: "cris-oiseaux",
        nom: "Cris oiseaux",
        description: "Écoute un chant ou un cri et retrouve l’oiseau.",
        type: "audio-saisie",
        donnees: "oiseaux-chants",
        icone: "casque",
        libelles: {
          singulier: "oiseau",
          pluriel: "oiseaux",
          question: "Quel est cet oiseau ?",
          choisir: "Choisir un oiseau…",
          rechercher: "Rechercher un oiseau…",
          aucun: "Aucun oiseau trouvé.",
        },
      },
    ],
  },
  {
    id: "vocabulaire",
    nom: "Vocabulaire",
    description: "Les mots des naturalistes et leurs définitions.",
    icone: "livre",
    quiz: [
      {
        id: "vocabulaire-nature",
        nom: "Vocabulaire nature",
        description: "Lis la définition et retrouve le mot.",
        type: "vocabulaire",
        donnees: "vocabulaire",
        icone: "livre",
        modes: [
          { id: "qcm", nom: "4 propositions" },
          { id: "saisie", nom: "Écrire le mot" },
          { id: "melange", nom: "Les deux" },
        ],
        libelles: {
          singulier: "mot",
          pluriel: "mots",
          question: "Quel est ce mot ?",
          saisie: "Écris le mot…",
        },
      },
    ],
  },
  {
    id: "mammiferes",
    nom: "Mammifères",
    description: "Traces, silhouettes et cris des mammifères.",
    icone: "patte",
    quiz: [],
  },
  {
    id: "lepidopteres",
    nom: "Lépidoptères",
    description: "Papillons de jour et de nuit.",
    icone: "papillon",
    quiz: [],
  },
];
