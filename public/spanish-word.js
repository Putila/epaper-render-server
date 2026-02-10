// Spanish Word of the Day
// Rotates through a list of common Spanish words

const spanishWords = [
  { word: 'hola', translation: 'hello', example: 'Hola, ¿cómo estás?' },
  { word: 'casa', translation: 'house', example: 'Mi casa es grande' },
  { word: 'perro', translation: 'dog', example: 'El perro es amable' },
  { word: 'gato', translation: 'cat', example: 'El gato está durmiendo' },
  { word: 'agua', translation: 'water', example: 'Necesito agua fresca' },
  { word: 'comida', translation: 'food', example: 'La comida está deliciosa' },
  { word: 'libro', translation: 'book', example: 'Estoy leyendo un libro' },
  { word: 'mesa', translation: 'table', example: 'La mesa es de madera' },
  { word: 'silla', translation: 'chair', example: 'Siéntate en la silla' },
  { word: 'amigo', translation: 'friend', example: 'Mi amigo se llama Juan' },
  { word: 'familia', translation: 'family', example: 'Mi familia es grande' },
  { word: 'tiempo', translation: 'time/weather', example: 'El tiempo está bueno' },
  { word: 'día', translation: 'day', example: 'Hoy es un buen día' },
  { word: 'noche', translation: 'night', example: 'Buenas noches' },
  { word: 'mañana', translation: 'tomorrow/morning', example: 'Hasta mañana' },
  { word: 'sol', translation: 'sun', example: 'El sol brilla hoy' },
  { word: 'luna', translation: 'moon', example: 'La luna es hermosa' },
  { word: 'trabajo', translation: 'work', example: 'Voy al trabajo' },
  { word: 'escuela', translation: 'school', example: 'Los niños van a la escuela' },
  { word: 'ciudad', translation: 'city', example: 'Vivo en la ciudad' },
  { word: 'país', translation: 'country', example: 'España es un país bonito' },
  { word: 'mundo', translation: 'world', example: 'El mundo es grande' },
  { word: 'amor', translation: 'love', example: 'El amor es importante' },
  { word: 'vida', translation: 'life', example: 'La vida es bella' },
  { word: 'música', translation: 'music', example: 'Me gusta la música' },
  { word: 'coche', translation: 'car', example: 'Mi coche es rojo' },
  { word: 'bicicleta', translation: 'bicycle', example: 'Voy en bicicleta' },
  { word: 'café', translation: 'coffee', example: 'Quiero un café' },
  { word: 'leche', translation: 'milk', example: 'La leche es blanca' },
  { word: 'pan', translation: 'bread', example: 'El pan está fresco' },
  { word: 'árbol', translation: 'tree', example: 'El árbol es alto' },
  { word: 'flor', translation: 'flower', example: 'La flor es bonita' },
  { word: 'verde', translation: 'green', example: 'El césped es verde' },
  { word: 'azul', translation: 'blue', example: 'El cielo es azul' },
  { word: 'rojo', translation: 'red', example: 'La manzana es roja' },
  { word: 'grande', translation: 'big', example: 'La casa es grande' },
  { word: 'pequeño', translation: 'small', example: 'El ratón es pequeño' }
];

function getWordOfDay() {
  // Calculate day of the year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Select word based on day of year
  const index = dayOfYear % spanishWords.length;
  return spanishWords[index];
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
