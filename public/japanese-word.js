// Japanese Word of the Day
// Rotates through a list of intermediate-to-advanced Japanese words (JLPT N3-N1)

const japaneseWords = [
  // Abstract concepts
  { word: '挑戦', reading: 'ちょうせん', romanization: 'chōsen', translation: 'challenge' },
  { word: '努力', reading: 'どりょく', romanization: 'doryoku', translation: 'effort' },
  { word: '経験', reading: 'けいけん', romanization: 'keiken', translation: 'experience' },
  { word: '冒険', reading: 'ぼうけん', romanization: 'bōken', translation: 'adventure' },
  { word: '勇気', reading: 'ゆうき', romanization: 'yūki', translation: 'courage' },
  { word: '希望', reading: 'きぼう', romanization: 'kibō', translation: 'hope' },
  { word: '信頼', reading: 'しんらい', romanization: 'shinrai', translation: 'trust' },
  { word: '覚悟', reading: 'かくご', romanization: 'kakugo', translation: 'resolve; preparedness' },
  { word: '矛盾', reading: 'むじゅん', romanization: 'mujun', translation: 'contradiction' },
  { word: '本質', reading: 'ほんしつ', romanization: 'honshitsu', translation: 'essence; true nature' },
  { word: '概念', reading: 'がいねん', romanization: 'gainen', translation: 'concept; notion' },
  { word: '運命', reading: 'うんめい', romanization: 'unmei', translation: 'fate; destiny' },
  { word: '絆', reading: 'きずな', romanization: 'kizuna', translation: 'bond; connection' },
  { word: '感謝', reading: 'かんしゃ', romanization: 'kansha', translation: 'gratitude' },
  { word: '誠意', reading: 'せいい', romanization: 'seii', translation: 'sincerity' },
  { word: '志', reading: 'こころざし', romanization: 'kokorozashi', translation: 'ambition; aspiration' },
  { word: '意志', reading: 'いし', romanization: 'ishi', translation: 'willpower' },
  { word: '哲学', reading: 'てつがく', romanization: 'tetsugaku', translation: 'philosophy' },
  { word: '真実', reading: 'しんじつ', romanization: 'shinjitsu', translation: 'truth; reality' },
  { word: '奇跡', reading: 'きせき', romanization: 'kiseki', translation: 'miracle' },

  // Emotions and states
  { word: '懐かしい', reading: 'なつかしい', romanization: 'natsukashii', translation: 'nostalgic' },
  { word: '切ない', reading: 'せつない', romanization: 'setsunai', translation: 'bittersweet; painful' },
  { word: '嬉しい', reading: 'うれしい', romanization: 'ureshii', translation: 'happy; glad' },
  { word: '悔しい', reading: 'くやしい', romanization: 'kuyashii', translation: 'frustrating; vexing' },
  { word: '寂しい', reading: 'さびしい', romanization: 'sabishii', translation: 'lonely' },
  { word: '恥ずかしい', reading: 'はずかしい', romanization: 'hazukashii', translation: 'embarrassing; shy' },
  { word: '愛おしい', reading: 'いとおしい', romanization: 'itooshii', translation: 'dear; precious' },
  { word: '穏やか', reading: 'おだやか', romanization: 'odayaka', translation: 'calm; gentle' },
  { word: '素直', reading: 'すなお', romanization: 'sunao', translation: 'honest; obedient' },
  { word: '健気', reading: 'けなげ', romanization: 'kenage', translation: 'brave; admirable' },
  { word: '微妙', reading: 'びみょう', romanization: 'bimyō', translation: 'subtle; delicate' },
  { word: '厄介', reading: 'やっかい', romanization: 'yakkai', translation: 'troublesome; burdensome' },
  { word: '憂鬱', reading: 'ゆううつ', romanization: 'yūutsu', translation: 'melancholy; depressed' },
  { word: '爽やか', reading: 'さわやか', romanization: 'sawayaka', translation: 'refreshing; crisp' },
  { word: '曖昧', reading: 'あいまい', romanization: 'aimai', translation: 'ambiguous; vague' },
  { word: '呑気', reading: 'のんき', romanization: 'nonki', translation: 'carefree; easygoing' },
  { word: '不安', reading: 'ふあん', romanization: 'fuan', translation: 'anxiety; unease' },
  { word: '充実', reading: 'じゅうじつ', romanization: 'jūjitsu', translation: 'fulfillment; enrichment' },

  // Verbs
  { word: '成長する', reading: 'せいちょうする', romanization: 'seichō suru', translation: 'to grow; to develop' },
  { word: '克服する', reading: 'こくふくする', romanization: 'kokufuku suru', translation: 'to overcome' },
  { word: '挑む', reading: 'いどむ', romanization: 'idomu', translation: 'to challenge; to confront' },
  { word: '貫く', reading: 'つらぬく', romanization: 'tsuranuku', translation: 'to pierce; to persist' },
  { word: '磨く', reading: 'みがく', romanization: 'migaku', translation: 'to polish; to refine' },
  { word: '悟る', reading: 'さとる', romanization: 'satoru', translation: 'to realize; to attain enlightenment' },
  { word: '励む', reading: 'はげむ', romanization: 'hagemu', translation: 'to strive; to work hard' },
  { word: '耐える', reading: 'たえる', romanization: 'taeru', translation: 'to endure; to withstand' },
  { word: '諦める', reading: 'あきらめる', romanization: 'akirameru', translation: 'to give up; to abandon' },
  { word: '築く', reading: 'きずく', romanization: 'kizuku', translation: 'to build; to construct' },
  { word: '培う', reading: 'つちかう', romanization: 'tsuchikau', translation: 'to cultivate; to foster' },
  { word: '省みる', reading: 'かえりみる', romanization: 'kaerimiru', translation: 'to reflect on; to look back' },
  { word: '漂う', reading: 'ただよう', romanization: 'tadayou', translation: 'to drift; to float' },
  { word: '潤う', reading: 'うるおう', romanization: 'uruou', translation: 'to be moistened; to be enriched' },
  { word: '囁く', reading: 'ささやく', romanization: 'sasayaku', translation: 'to whisper' },
  { word: '戸惑う', reading: 'とまどう', romanization: 'tomadou', translation: 'to be bewildered; to be confused' },
  { word: '見守る', reading: 'みまもる', romanization: 'mimamoru', translation: 'to watch over; to protect' },
  { word: '受け入れる', reading: 'うけいれる', romanization: 'ukeireru', translation: 'to accept; to receive' },
  { word: '乗り越える', reading: 'のりこえる', romanization: 'norikoeru', translation: 'to get over; to surmount' },
  { word: '立ち向かう', reading: 'たちむかう', romanization: 'tachimukau', translation: 'to stand up against' },

  // Nature
  { word: '虹', reading: 'にじ', romanization: 'niji', translation: 'rainbow' },
  { word: '嵐', reading: 'あらし', romanization: 'arashi', translation: 'storm; tempest' },
  { word: '夜明け', reading: 'よあけ', romanization: 'yoake', translation: 'dawn; daybreak' },
  { word: '桜', reading: 'さくら', romanization: 'sakura', translation: 'cherry blossom' },
  { word: '黄昏', reading: 'たそがれ', romanization: 'tasogare', translation: 'twilight; dusk' },
  { word: '稲妻', reading: 'いなずま', romanization: 'inazuma', translation: 'lightning' },
  { word: '霧', reading: 'きり', romanization: 'kiri', translation: 'fog; mist' },
  { word: '滝', reading: 'たき', romanization: 'taki', translation: 'waterfall' },
  { word: '渓谷', reading: 'けいこく', romanization: 'keikoku', translation: 'valley; ravine' },
  { word: '草原', reading: 'そうげん', romanization: 'sōgen', translation: 'grassland; prairie' },
  { word: '潮', reading: 'しお', romanization: 'shio', translation: 'tide; current' },
  { word: '新緑', reading: 'しんりょく', romanization: 'shinryoku', translation: 'fresh green leaves' },
  { word: '紅葉', reading: 'こうよう', romanization: 'kōyō', translation: 'autumn leaves' },
  { word: '吹雪', reading: 'ふぶき', romanization: 'fubuki', translation: 'blizzard; snowstorm' },
  { word: '陽炎', reading: 'かげろう', romanization: 'kagerō', translation: 'heat haze; mirage' },
  { word: '梅雨', reading: 'つゆ', romanization: 'tsuyu', translation: 'rainy season' },
  { word: '星空', reading: 'ほしぞら', romanization: 'hoshizora', translation: 'starry sky' },
  { word: '大地', reading: 'だいち', romanization: 'daichi', translation: 'earth; ground' },

  // Society and culture
  { word: '文化', reading: 'ぶんか', romanization: 'bunka', translation: 'culture' },
  { word: '伝統', reading: 'でんとう', romanization: 'dentō', translation: 'tradition' },
  { word: '自由', reading: 'じゆう', romanization: 'jiyū', translation: 'freedom; liberty' },
  { word: '平和', reading: 'へいわ', romanization: 'heiwa', translation: 'peace' },
  { word: '社会', reading: 'しゃかい', romanization: 'shakai', translation: 'society' },
  { word: '礼儀', reading: 'れいぎ', romanization: 'reigi', translation: 'manners; etiquette' },
  { word: '義理', reading: 'ぎり', romanization: 'giri', translation: 'duty; obligation' },
  { word: '本音', reading: 'ほんね', romanization: 'honne', translation: 'true feelings; real intention' },
  { word: '建前', reading: 'たてまえ', romanization: 'tatemae', translation: 'public facade; pretense' },
  { word: '思いやり', reading: 'おもいやり', romanization: 'omoiyari', translation: 'compassion; consideration' },
  { word: '調和', reading: 'ちょうわ', romanization: 'chōwa', translation: 'harmony; balance' },
  { word: '共存', reading: 'きょうぞん', romanization: 'kyōzon', translation: 'coexistence' },
  { word: '尊敬', reading: 'そんけい', romanization: 'sonkei', translation: 'respect; esteem' },
  { word: '責任', reading: 'せきにん', romanization: 'sekinin', translation: 'responsibility' },
  { word: '正義', reading: 'せいぎ', romanization: 'seigi', translation: 'justice; righteousness' },
  { word: '民主', reading: 'みんしゅ', romanization: 'minshu', translation: 'democracy' },

  // Daily life advanced
  { word: '習慣', reading: 'しゅうかん', romanization: 'shūkan', translation: 'habit; custom' },
  { word: '日常', reading: 'にちじょう', romanization: 'nichijō', translation: 'daily life; everyday' },
  { word: '余裕', reading: 'よゆう', romanization: 'yoyū', translation: 'composure; room to spare' },
  { word: '段取り', reading: 'だんどり', romanization: 'dandori', translation: 'preparation; arrangement' },
  { word: '手間', reading: 'てま', romanization: 'tema', translation: 'time and effort; labor' },
  { word: '加減', reading: 'かげん', romanization: 'kagen', translation: 'degree; adjustment' },
  { word: '都合', reading: 'つごう', romanization: 'tsugō', translation: 'convenience; circumstances' },
  { word: '気配り', reading: 'きくばり', romanization: 'kikubari', translation: 'attentiveness; consideration' },
  { word: '節約', reading: 'せつやく', romanization: 'setsuyaku', translation: 'saving; economizing' },
  { word: '整理', reading: 'せいり', romanization: 'seiri', translation: 'organization; sorting' },
  { word: '支度', reading: 'したく', romanization: 'shitaku', translation: 'preparation; getting ready' },
  { word: '世話', reading: 'せわ', romanization: 'sewa', translation: 'care; looking after' },
  { word: '贅沢', reading: 'ぜいたく', romanization: 'zeitaku', translation: 'luxury; extravagance' },
  { word: '我慢', reading: 'がまん', romanization: 'gaman', translation: 'patience; endurance' },
  { word: '根気', reading: 'こんき', romanization: 'konki', translation: 'perseverance; patience' },

  // Academic and professional
  { word: '研究', reading: 'けんきゅう', romanization: 'kenkyū', translation: 'research; study' },
  { word: '発展', reading: 'はってん', romanization: 'hatten', translation: 'development; growth' },
  { word: '革新', reading: 'かくしん', romanization: 'kakushin', translation: 'innovation; reform' },
  { word: '分析', reading: 'ぶんせき', romanization: 'bunseki', translation: 'analysis' },
  { word: '論理', reading: 'ろんり', romanization: 'ronri', translation: 'logic; reasoning' },
  { word: '仮説', reading: 'かせつ', romanization: 'kasetsu', translation: 'hypothesis' },
  { word: '実績', reading: 'じっせき', romanization: 'jisseki', translation: 'achievements; track record' },
  { word: '効率', reading: 'こうりつ', romanization: 'kōritsu', translation: 'efficiency' },
  { word: '戦略', reading: 'せんりゃく', romanization: 'senryaku', translation: 'strategy' },
  { word: '交渉', reading: 'こうしょう', romanization: 'kōshō', translation: 'negotiation' },
  { word: '貢献', reading: 'こうけん', romanization: 'kōken', translation: 'contribution' },
  { word: '洞察', reading: 'どうさつ', romanization: 'dōsatsu', translation: 'insight; discernment' },
  { word: '応用', reading: 'おうよう', romanization: 'ōyō', translation: 'application; practical use' },
  { word: '基盤', reading: 'きばん', romanization: 'kiban', translation: 'foundation; base' },
  { word: '傾向', reading: 'けいこう', romanization: 'keikō', translation: 'tendency; trend' },
  { word: '促進', reading: 'そくしん', romanization: 'sokushin', translation: 'promotion; acceleration' },

  // Beautiful and poetic Japanese words
  { word: '木漏れ日', reading: 'こもれび', romanization: 'komorebi', translation: 'sunlight filtering through leaves' },
  { word: '侘寂', reading: 'わびさび', romanization: 'wabi-sabi', translation: 'beauty in imperfection' },
  { word: '花鳥風月', reading: 'かちょうふうげつ', romanization: 'kachōfūgetsu', translation: 'beauties of nature' },
  { word: '一期一会', reading: 'いちごいちえ', romanization: 'ichigo ichie', translation: 'once-in-a-lifetime encounter' },
  { word: '物の哀れ', reading: 'もののあわれ', romanization: 'mono no aware', translation: 'pathos of things; gentle sadness' },
  { word: '風情', reading: 'ふぜい', romanization: 'fuzei', translation: 'elegance; atmosphere' },
  { word: '幽玄', reading: 'ゆうげん', romanization: 'yūgen', translation: 'profound grace; subtle mystery' },
  { word: '無常', reading: 'むじょう', romanization: 'mujō', translation: 'impermanence; transience' },
  { word: '七転八起', reading: 'ななころびやおき', romanization: 'nanakorobi yaoki', translation: 'fall seven times, rise eight' },
  { word: '生き甲斐', reading: 'いきがい', romanization: 'ikigai', translation: 'reason for living; purpose' },
  { word: '花吹雪', reading: 'はなふぶき', romanization: 'hanafubuki', translation: 'flurry of falling petals' },
  { word: '月見', reading: 'つきみ', romanization: 'tsukimi', translation: 'moon viewing' },
  { word: '森林浴', reading: 'しんりんよく', romanization: 'shinrinyoku', translation: 'forest bathing' },
  { word: '空蝉', reading: 'うつせみ', romanization: 'utsusemi', translation: 'cicada shell; fleeting world' },
  { word: '儚い', reading: 'はかない', romanization: 'hakanai', translation: 'fleeting; ephemeral' },
  { word: '佇まい', reading: 'たたずまい', romanization: 'tatazumai', translation: 'appearance; bearing; atmosphere' },
  { word: '淡い', reading: 'あわい', romanization: 'awai', translation: 'faint; pale; fleeting' },
  { word: '凛とした', reading: 'りんとした', romanization: 'rin to shita', translation: 'dignified; commanding' },
  { word: '粋', reading: 'いき', romanization: 'iki', translation: 'chic; stylish; refined' },
  { word: '趣', reading: 'おもむき', romanization: 'omomuki', translation: 'charm; taste; elegance' },
];

function getJapaneseWord() {
  const index = Math.floor(Math.random() * japaneseWords.length);
  return japaneseWords[index];
}

function displayJapaneseWord() {
  const wordData = getJapaneseWord();

  const wordElement = document.querySelector('.japanese-word');
  const translationElement = document.querySelector('.japanese-translation');

  if (wordElement) {
    wordElement.textContent = wordData.word;
  }

  if (translationElement) {
    translationElement.textContent = wordData.reading + ' (' + wordData.romanization + ') - ' + wordData.translation;
  }
}

// Display word on page load
displayJapaneseWord();
