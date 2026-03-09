// Korean Word of the Day
// Rotates through a list of intermediate-to-advanced Korean words

const koreanWords = [
  // Abstract concepts
  { word: '도전', romanization: 'dojeon', translation: 'challenge' },
  { word: '성취', romanization: 'seongchwi', translation: 'achievement' },
  { word: '경험', romanization: 'gyeongheom', translation: 'experience' },
  { word: '가치', romanization: 'gachi', translation: 'value; worth' },
  { word: '의미', romanization: 'uimi', translation: 'meaning; significance' },
  { word: '본질', romanization: 'bonjil', translation: 'essence; true nature' },
  { word: '개념', romanization: 'gaenyeom', translation: 'concept; notion' },
  { word: '원칙', romanization: 'wonchik', translation: 'principle' },
  { word: '기준', romanization: 'gijun', translation: 'standard; criterion' },
  { word: '관점', romanization: 'gwanjeom', translation: 'perspective; viewpoint' },
  { word: '맥락', romanization: 'maengnak', translation: 'context' },
  { word: '모순', romanization: 'mosun', translation: 'contradiction' },
  { word: '균형', romanization: 'gyunhyeong', translation: 'balance; equilibrium' },
  { word: '조화', romanization: 'johwa', translation: 'harmony' },
  { word: '갈등', romanization: 'galdeung', translation: 'conflict; discord' },
  { word: '타협', romanization: 'tahyeop', translation: 'compromise' },
  { word: '신념', romanization: 'sinnyeom', translation: 'belief; conviction' },
  { word: '양심', romanization: 'yangsim', translation: 'conscience' },
  { word: '정의', romanization: 'jeongui', translation: 'justice; definition' },
  { word: '진실', romanization: 'jinsil', translation: 'truth' },
  { word: '운명', romanization: 'unmyeong', translation: 'fate; destiny' },
  { word: '인연', romanization: 'inyeon', translation: 'fateful connection; bond' },

  // Emotions and states
  { word: '그리움', romanization: 'grium', translation: 'longing; nostalgia' },
  { word: '설렘', romanization: 'seollem', translation: 'flutter; excited anticipation' },
  { word: '뿌듯함', romanization: 'ppudeusam', translation: 'pride; deep satisfaction' },
  { word: '허전함', romanization: 'heojeonham', translation: 'emptiness; feeling of void' },
  { word: '아쉬움', romanization: 'aswium', translation: 'regret; wistfulness' },
  { word: '서운함', romanization: 'seounham', translation: 'feeling let down; hurt' },
  { word: '답답함', romanization: 'dapdapam', translation: 'frustration; feeling stifled' },
  { word: '막막함', romanization: 'makmakam', translation: 'feeling overwhelmed; hopeless' },
  { word: '후회', romanization: 'huhoe', translation: 'regret; remorse' },
  { word: '감동', romanization: 'gamdong', translation: 'being deeply moved; touched' },
  { word: '동경', romanization: 'donggyeong', translation: 'yearning; admiration' },
  { word: '불안', romanization: 'buran', translation: 'anxiety; unease' },
  { word: '고독', romanization: 'godok', translation: 'solitude; loneliness' },
  { word: '평온', romanization: 'pyeongon', translation: 'tranquility; serenity' },
  { word: '열정', romanization: 'yeoljeong', translation: 'passion; enthusiasm' },
  { word: '호기심', romanization: 'hogisim', translation: 'curiosity' },
  { word: '자존심', romanization: 'jajonsim', translation: 'pride; self-esteem' },
  { word: '겸손', romanization: 'gyeomson', translation: 'humility; modesty' },
  { word: '억울함', romanization: 'eogulham', translation: 'feeling unjustly treated' },
  { word: '짜릿함', romanization: 'jjaritam', translation: 'thrill; electrifying feeling' },

  // Verbs
  { word: '성장하다', romanization: 'seongjang-hada', translation: 'to grow; to develop' },
  { word: '극복하다', romanization: 'geukbok-hada', translation: 'to overcome' },
  { word: '도전하다', romanization: 'dojeon-hada', translation: 'to challenge; to attempt' },
  { word: '실현하다', romanization: 'silhyeon-hada', translation: 'to realize; to fulfill' },
  { word: '포기하다', romanization: 'pogi-hada', translation: 'to give up; to abandon' },
  { word: '견디다', romanization: 'gyeondida', translation: 'to endure; to withstand' },
  { word: '깨닫다', romanization: 'kkaedatda', translation: 'to realize; to come to understand' },
  { word: '성찰하다', romanization: 'seongchal-hada', translation: 'to reflect; to introspect' },
  { word: '공감하다', romanization: 'gonggam-hada', translation: 'to empathize; to relate' },
  { word: '소통하다', romanization: 'sotong-hada', translation: 'to communicate' },
  { word: '적응하다', romanization: 'jeogeung-hada', translation: 'to adapt; to adjust' },
  { word: '발휘하다', romanization: 'balhwi-hada', translation: 'to display; to demonstrate ability' },
  { word: '추구하다', romanization: 'chugu-hada', translation: 'to pursue; to seek' },
  { word: '탐구하다', romanization: 'tamgu-hada', translation: 'to explore; to investigate' },
  { word: '헌신하다', romanization: 'heonsin-hada', translation: 'to devote; to dedicate' },
  { word: '번성하다', romanization: 'beonseong-hada', translation: 'to flourish; to thrive' },
  { word: '몰입하다', romanization: 'morip-hada', translation: 'to immerse oneself' },
  { word: '좌절하다', romanization: 'jwajeol-hada', translation: 'to be frustrated; to be defeated' },
  { word: '인정하다', romanization: 'injeong-hada', translation: 'to acknowledge; to admit' },
  { word: '영향을 미치다', romanization: 'yeonghyangeul michida', translation: 'to influence; to have an effect' },
  { word: '기여하다', romanization: 'giyeo-hada', translation: 'to contribute' },
  { word: '혁신하다', romanization: 'hyeoksin-hada', translation: 'to innovate' },

  // Nature and environment
  { word: '무지개', romanization: 'mujigae', translation: 'rainbow' },
  { word: '폭풍', romanization: 'pokpung', translation: 'storm; tempest' },
  { word: '여명', romanization: 'yeomyeong', translation: 'dawn; daybreak' },
  { word: '황혼', romanization: 'hwanghon', translation: 'dusk; twilight' },
  { word: '노을', romanization: 'noeul', translation: 'sunset glow' },
  { word: '안개', romanization: 'angae', translation: 'fog; mist' },
  { word: '이슬', romanization: 'iseul', translation: 'dew' },
  { word: '서리', romanization: 'seori', translation: 'frost' },
  { word: '폭포', romanization: 'pokpo', translation: 'waterfall' },
  { word: '절벽', romanization: 'jeolbyeok', translation: 'cliff; precipice' },
  { word: '해일', romanization: 'haeil', translation: 'tsunami; tidal wave' },
  { word: '가뭄', romanization: 'gamum', translation: 'drought' },
  { word: '생태계', romanization: 'saengtaegye', translation: 'ecosystem' },
  { word: '지평선', romanization: 'jipyeongseon', translation: 'horizon' },
  { word: '수평선', romanization: 'supyeongseon', translation: 'sea horizon' },
  { word: '오솔길', romanization: 'osolgil', translation: 'narrow trail; footpath' },
  { word: '초원', romanization: 'chowon', translation: 'meadow; prairie' },
  { word: '계곡', romanization: 'gyegok', translation: 'valley; gorge' },
  { word: '빙하', romanization: 'bingha', translation: 'glacier' },
  { word: '화산', romanization: 'hwasan', translation: 'volcano' },

  // Society and culture
  { word: '문화', romanization: 'munhwa', translation: 'culture' },
  { word: '전통', romanization: 'jeontong', translation: 'tradition' },
  { word: '자유', romanization: 'jayu', translation: 'freedom; liberty' },
  { word: '평등', romanization: 'pyeongdeung', translation: 'equality' },
  { word: '인권', romanization: 'ingwon', translation: 'human rights' },
  { word: '민주주의', romanization: 'minjujuui', translation: 'democracy' },
  { word: '시민', romanization: 'simin', translation: 'citizen' },
  { word: '여론', romanization: 'yeoron', translation: 'public opinion' },
  { word: '편견', romanization: 'pyeongyeon', translation: 'prejudice; bias' },
  { word: '차별', romanization: 'chabyeol', translation: 'discrimination' },
  { word: '공정', romanization: 'gongjeong', translation: 'fairness; impartiality' },
  { word: '윤리', romanization: 'yulli', translation: 'ethics; morality' },
  { word: '세대', romanization: 'sedae', translation: 'generation' },
  { word: '공동체', romanization: 'gongdongche', translation: 'community' },
  { word: '유산', romanization: 'yusan', translation: 'heritage; legacy' },
  { word: '풍습', romanization: 'pungsseup', translation: 'custom; practice' },
  { word: '정체성', romanization: 'jeongcheseong', translation: 'identity' },
  { word: '다양성', romanization: 'dayangseong', translation: 'diversity' },
  { word: '복지', romanization: 'bokji', translation: 'welfare' },
  { word: '교양', romanization: 'gyoyang', translation: 'refinement; liberal arts' },

  // Daily life (advanced)
  { word: '습관', romanization: 'seupgwan', translation: 'habit' },
  { word: '일상', romanization: 'ilsang', translation: 'daily life; routine' },
  { word: '여유', romanization: 'yeoyu', translation: 'leisure; composure' },
  { word: '보람', romanization: 'boram', translation: 'reward; worthwhile feeling' },
  { word: '체험', romanization: 'cheheom', translation: 'hands-on experience' },
  { word: '취향', romanization: 'chwihyang', translation: 'taste; preference' },
  { word: '분위기', romanization: 'bunwigi', translation: 'atmosphere; mood' },
  { word: '소소하다', romanization: 'sosoha-da', translation: 'to be small but pleasant' },
  { word: '정리정돈', romanization: 'jeongnijeondon', translation: 'tidying up; organizing' },
  { word: '절약', romanization: 'jeolyak', translation: 'saving; frugality' },
  { word: '낭비', romanization: 'nangbi', translation: 'waste; extravagance' },
  { word: '효율', romanization: 'hyoyul', translation: 'efficiency' },
  { word: '균형 잡힌', romanization: 'gyunhyeong japin', translation: 'balanced; well-balanced' },
  { word: '자기 관리', romanization: 'jagi gwalli', translation: 'self-management; self-care' },
  { word: '동기 부여', romanization: 'donggi buyeo', translation: 'motivation' },
  { word: '성취감', romanization: 'seongchwigam', translation: 'sense of accomplishment' },
  { word: '소확행', romanization: 'sohwakhaeng', translation: 'small but certain happiness' },
  { word: '워라밸', romanization: 'worabael', translation: 'work-life balance' },

  // Academic and professional
  { word: '연구', romanization: 'yeongu', translation: 'research' },
  { word: '발전', romanization: 'baljeon', translation: 'development; progress' },
  { word: '혁신', romanization: 'hyeoksin', translation: 'innovation' },
  { word: '분석', romanization: 'bunseok', translation: 'analysis' },
  { word: '평가', romanization: 'pyeongga', translation: 'evaluation; assessment' },
  { word: '전략', romanization: 'jeollyak', translation: 'strategy' },
  { word: '목표', romanization: 'mokpyo', translation: 'goal; objective' },
  { word: '과제', romanization: 'gwaje', translation: 'assignment; task; challenge' },
  { word: '논리', romanization: 'nolli', translation: 'logic' },
  { word: '가설', romanization: 'gaseol', translation: 'hypothesis' },
  { word: '결론', romanization: 'gyeollon', translation: 'conclusion' },
  { word: '근거', romanization: 'geungeo', translation: 'basis; evidence' },
  { word: '통계', romanization: 'tonggye', translation: 'statistics' },
  { word: '자료', romanization: 'jaryo', translation: 'data; materials' },
  { word: '보고서', romanization: 'bogoseo', translation: 'report' },
  { word: '협업', romanization: 'hyeobeop', translation: 'collaboration' },
  { word: '생산성', romanization: 'saengsanseong', translation: 'productivity' },
  { word: '경쟁력', romanization: 'gyeongjaengnyeok', translation: 'competitiveness' },
  { word: '지속 가능', romanization: 'jisok ganeung', translation: 'sustainable' },
  { word: '인재', romanization: 'injae', translation: 'talented person; human resource' },
  { word: '역량', romanization: 'yeokryang', translation: 'capability; competence' },
  { word: '성과', romanization: 'seonggwa', translation: 'results; achievements' },
  { word: '실적', romanization: 'siljeok', translation: 'performance; track record' },
  { word: '강점', romanization: 'gangjeom', translation: 'strength; strong point' },
  { word: '약점', romanization: 'yakjeom', translation: 'weakness; weak point' },
  { word: '개선', romanization: 'gaeseon', translation: 'improvement; reform' },
  { word: '혁명', romanization: 'hyeongmyeong', translation: 'revolution' },
  { word: '발명', romanization: 'balmyeong', translation: 'invention' },
  { word: '창의성', romanization: 'changuiseong', translation: 'creativity' },
  { word: '학문', romanization: 'hangmun', translation: 'scholarship; academic study' },
];

function getKoreanWord() {
  const index = Math.floor(Math.random() * koreanWords.length);
  return koreanWords[index];
}

function displayKoreanWord() {
  const wordData = getKoreanWord();

  const wordElement = document.querySelector('.korean-word');
  const translationElement = document.querySelector('.korean-translation');

  if (wordElement) {
    wordElement.textContent = wordData.word + ' (' + wordData.romanization + ')';
  }

  if (translationElement) {
    translationElement.textContent = wordData.translation;
  }
}

// Display word on page load
displayKoreanWord();
