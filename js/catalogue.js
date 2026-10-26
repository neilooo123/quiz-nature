// Catalogue des taxons et de leurs quiz.
// Un taxon contient des « quiz » et/ou des sous-groupes (« groupes », ex. Mammifères >
// Chiroptères), qui contiennent à leur tour des quiz.
// Pour ajouter un quiz : ajouter une entrée dans « quiz » et charger son fichier
// de données dans index.html (window.QUIZ_DONNEES[<donnees>]). L'id d'un quiz doit
// être unique dans tout le catalogue (il sert à mémoriser la sélection).
//
// Types de quiz :
//   "audio-saisie" : on écoute un son et on choisit le nom dans une combobox.
//   "vocabulaire"  : on lit une définition et on retrouve le mot, parmi 4 propositions
//                    ou en l'écrivant (« modes » proposés avant de commencer).
//   "image-qcm"    : on regarde une image (carte de répartition…) et on choisit
//                    le nom parmi 4 propositions.

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
    description: "Chauves-souris et autres mammifères de France.",
    icone: "patte",
    groupes: [
      {
        id: "chiropteres",
        nom: "Chiroptères",
        description: "Les chauves-souris.",
        icone: "chauveSouris",
        quiz: [
          {
            id: "chiropteres-repartition",
            nom: "Répartition France métropolitaine",
            description: "Observe la carte de répartition et retrouve la chauve-souris.",
            type: "image-qcm",
            mode: "qcm",
            donnees: "chiropteres-repartition",
            icone: "carte",
            libelles: {
              singulier: "chauve-souris",
              pluriel: "chauves-souris",
              feminin: true,
              question: "Quelle chauve-souris a cette répartition ?",
              image: "Carte de répartition en France de l’espèce à trouver",
            },
          },
        ],
      },
    ],
  },
  {
    id: "lepidopteres",
    nom: "Lépidoptères",
    description: "Papillons de jour et de nuit.",
    icone: "papillon",
    quiz: [],
  },
];
