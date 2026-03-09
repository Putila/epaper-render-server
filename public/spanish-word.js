// Spanish Word of the Day
// Advanced B2-C2 vocabulary for intermediate-advanced learners

const spanishWords = [
  // Advanced abstract concepts
  { word: 'desempeñar', translation: 'to carry out/perform', example: 'Desempeña un papel crucial' },
  { word: 'sobresalir', translation: 'to stand out/excel', example: 'Sobresale en matemáticas' },
  { word: 'aprovechar', translation: 'to take advantage of', example: 'Aprovecha cada momento' },
  { word: 'imprescindible', translation: 'essential/indispensable', example: 'Es imprescindible actuar' },
  { word: 'desafío', translation: 'challenge', example: 'Un desafío emocionante' },
  { word: 'desenlace', translation: 'outcome/denouement', example: 'El desenlace fue inesperado' },
  { word: 'matiz', translation: 'nuance/shade', example: 'Un matiz de ironía' },
  { word: 'vislumbrar', translation: 'to glimpse/foresee', example: 'Vislumbro un futuro mejor' },
  { word: 'entrañable', translation: 'endearing/dear', example: 'Un recuerdo entrañable' },
  { word: 'efímero', translation: 'ephemeral/fleeting', example: 'La fama es efímera' },
  { word: 'arraigado', translation: 'deep-rooted', example: 'Una costumbre arraigada' },
  { word: 'escueto', translation: 'concise/succinct', example: 'Una respuesta escueta' },
  { word: 'desvelo', translation: 'sleeplessness/devotion', example: 'Sus desvelos dieron fruto' },
  { word: 'resiliencia', translation: 'resilience', example: 'Mostró gran resiliencia' },
  { word: 'añoranza', translation: 'longing/nostalgia', example: 'Siente añoranza del hogar' },
  { word: 'sosiego', translation: 'tranquility/calm', example: 'Busco un poco de sosiego' },
  { word: 'plenitud', translation: 'fullness/completeness', example: 'Vivir en plenitud' },
  { word: 'desgarrador', translation: 'heartbreaking', example: 'Un relato desgarrador' },
  { word: 'trascender', translation: 'to transcend', example: 'Trasciende las fronteras' },
  { word: 'conmovedora', translation: 'moving/touching', example: 'Una historia conmovedora' },

  // Advanced verbs
  { word: 'prescindir', translation: 'to do without/dispense', example: 'No puedo prescindir de ti' },
  { word: 'abarcar', translation: 'to encompass/cover', example: 'Abarca muchos temas' },
  { word: 'fomentar', translation: 'to promote/encourage', example: 'Fomentar la creatividad' },
  { word: 'menospreciar', translation: 'to underestimate/belittle', example: 'No menosprecies su esfuerzo' },
  { word: 'anhelar', translation: 'to yearn/long for', example: 'Anhelo volver a verte' },
  { word: 'acarrear', translation: 'to entail/bring about', example: 'Acarrea consecuencias graves' },
  { word: 'desglosar', translation: 'to break down/itemize', example: 'Desglosar los gastos' },
  { word: 'eludir', translation: 'to evade/avoid', example: 'Eludir la responsabilidad' },
  { word: 'plasmar', translation: 'to capture/embody', example: 'Plasmó sus ideas en el libro' },
  { word: 'subyacer', translation: 'to underlie', example: 'La tensión subyace al conflicto' },

  // Idiomatic expressions and advanced phrases
  { word: 'no dar abasto', translation: 'to not be able to cope', example: 'No doy abasto con todo' },
  { word: 'dar por sentado', translation: 'to take for granted', example: 'No lo des por sentado' },
  { word: 'a regañadientes', translation: 'reluctantly/grudgingly', example: 'Aceptó a regañadientes' },
  { word: 'de antemano', translation: 'in advance/beforehand', example: 'Lo sabía de antemano' },
  { word: 'sin rodeos', translation: 'straightforwardly/bluntly', example: 'Habló sin rodeos' },
  { word: 'a la larga', translation: 'in the long run', example: 'A la larga, valdrá la pena' },
  { word: 'dar en el clavo', translation: 'to hit the nail on the head', example: 'Diste en el clavo' },
  { word: 'ponerse las pilas', translation: 'to get one\'s act together', example: 'Hay que ponerse las pilas' },
  { word: 'echar de menos', translation: 'to miss (someone/thing)', example: 'Te echo mucho de menos' },
  { word: 'tener en cuenta', translation: 'to take into account', example: 'Tenlo en cuenta' },

  // Advanced adjectives
  { word: 'abrumador', translation: 'overwhelming', example: 'Una mayoría abrumadora' },
  { word: 'perspicaz', translation: 'perceptive/shrewd', example: 'Un análisis perspicaz' },
  { word: 'contundente', translation: 'forceful/conclusive', example: 'Una prueba contundente' },
  { word: 'paulatino', translation: 'gradual/slow', example: 'Un cambio paulatino' },
  { word: 'escurridizo', translation: 'elusive/slippery', example: 'Un concepto escurridizo' },
  { word: 'inverosímil', translation: 'implausible/unlikely', example: 'Una historia inverosímil' },
  { word: 'inquebrantable', translation: 'unbreakable/unwavering', example: 'Una voluntad inquebrantable' },
  { word: 'desmesurado', translation: 'disproportionate/excessive', example: 'Un orgullo desmesurado' },
  { word: 'esclarecedor', translation: 'illuminating/enlightening', example: 'Un discurso esclarecedor' },
  { word: 'avasallante', translation: 'overwhelming/domineering', example: 'Un talento avasallante' },

  // Literary and academic vocabulary
  { word: 'esbozar', translation: 'to sketch/outline', example: 'Esbozó una sonrisa' },
  { word: 'presagiar', translation: 'to foreshadow/presage', example: 'Presagia una tormenta' },
  { word: 'enarbolar', translation: 'to raise/brandish', example: 'Enarboló la bandera' },
  { word: 'albergar', translation: 'to harbor/shelter', example: 'Alberga grandes esperanzas' },
  { word: 'escatimar', translation: 'to skimp/spare', example: 'No escatimó en esfuerzos' },
  { word: 'desmoronar', translation: 'to crumble/collapse', example: 'El muro se desmoronó' },
  { word: 'deambular', translation: 'to wander/roam', example: 'Deambuló por las calles' },
  { word: 'atisbo', translation: 'hint/glimpse', example: 'Un atisbo de esperanza' },
  { word: 'indagar', translation: 'to investigate/inquire', example: 'Indagar en el pasado' },
  { word: 'estrépito', translation: 'uproar/clamor', example: 'Se oyó un gran estrépito' },
  { word: 'ataviado', translation: 'dressed up/adorned', example: 'Ataviado con elegancia' },
  { word: 'desconcierto', translation: 'bewilderment/confusion', example: 'Causó desconcierto' },
  { word: 'vehemente', translation: 'vehement/passionate', example: 'Un discurso vehemente' },
  { word: 'tergiversar', translation: 'to distort/misrepresent', example: 'No tergiverses mis palabras' },
  { word: 'resquicio', translation: 'crack/loophole', example: 'Un resquicio de luz' },
  { word: 'encrucijada', translation: 'crossroads/dilemma', example: 'Estoy en una encrucijada' },
  { word: 'desventura', translation: 'misfortune/adversity', example: 'A pesar de la desventura' },
  { word: 'esplendor', translation: 'splendor/magnificence', example: 'El esplendor del amanecer' },
  { word: 'ensimismado', translation: 'lost in thought/absorbed', example: 'Estaba ensimismado' },
  { word: 'conjetura', translation: 'conjecture/guess', example: 'Es solo una conjetura' },
  { word: 'perenne', translation: 'perennial/everlasting', example: 'Una lucha perenne' },
  { word: 'acérrimo', translation: 'staunch/fierce', example: 'Un defensor acérrimo' },
  { word: 'descomunal', translation: 'enormous/extraordinary', example: 'Un esfuerzo descomunal' },
  { word: 'disuadir', translation: 'to dissuade/deter', example: 'Intentó disuadirlo' },
  { word: 'zozobra', translation: 'anxiety/anguish', example: 'Vivir en zozobra' }
];

function getWordOfDay() {
  // Select a random word on each page load
  const index = Math.floor(Math.random() * spanishWords.length);
  return spanishWords[index];

  // Previous day-based selection (one word per day):
  // const now = new Date();
  // const start = new Date(now.getFullYear(), 0, 0);
  // const diff = now - start;
  // const oneDay = 1000 * 60 * 60 * 24;
  // const dayOfYear = Math.floor(diff / oneDay);
  // const index = dayOfYear % spanishWords.length;
  // return spanishWords[index];
}

function displaySpanishWord() {
  const wordData = getWordOfDay();

  const wordElement = document.querySelector('.spanish-word');
  const translationElement = document.querySelector('.spanish-translation');
  const exampleElement = document.querySelector('.spanish-example');

  if (wordElement) {
    wordElement.textContent = wordData.word;
  }

  if (translationElement) {
    translationElement.textContent = wordData.translation;
  }

  if (exampleElement) {
    exampleElement.textContent = wordData.example;
  }
}

// Display word on page load
displaySpanishWord();
