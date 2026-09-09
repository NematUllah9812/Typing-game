// Cadence — Content packs (words + quotes). Mirrors ARCHITECTURE.md §15.
// Small embedded English pack for v0.1; the shape matches the pipeline schema.

export const WORDS_EN = [
  'the','of','and','a','to','in','is','you','that','it','he','was','for','on',
  'are','as','with','his','they','be','at','one','have','this','from','or','had',
  'by','word','but','not','what','all','were','we','when','your','can','said',
  'there','use','an','each','which','she','do','how','their','if','will','up',
  'other','about','out','many','then','them','these','so','some','her','would',
  'make','like','him','into','time','has','look','two','more','write','go','see',
  'number','no','way','could','people','my','than','first','water','been','call',
  'who','now','find','long','down','day','did','get','come','made','may','part',
  'over','new','sound','take','only','little','work','know','place','year','live',
  'me','back','give','most','very','after','thing','our','just','name','good',
  'sentence','man','think','say','great','where','help','through','much','before',
  'line','right','too','mean','old','any','same','tell','boy','follow','came',
  'want','show','also','around','form','three','small','set','put','end','does',
  'another','well','large','must','big','even','such','because','turn','here',
  'why','ask','went','men','read','need','land','different','home','us','move',
  'try','kind','hand','picture','again','change','off','play','spell','air','away',
  'animal','house','point','page','letter','mother','answer','found','study',
  'still','learn','should','world','high','every','near','add','food','between',
  'own','below','country','plant','last','school','father','keep','tree','never',
];

export const QUOTES_EN = [
  { id: 1, length: 'short', source: 'Lao Tzu',
    text: 'The journey of a thousand miles begins with a single step.' },
  { id: 2, length: 'medium', source: 'Marcus Aurelius',
    text: 'You have power over your mind, not outside events. Realize this, and you will find strength. The happiness of your life depends upon the quality of your thoughts.' },
  { id: 3, length: 'short', source: 'Confucius',
    text: 'It does not matter how slowly you go as long as you do not stop.' },
  { id: 4, length: 'medium', source: 'Ada Lovelace',
    text: 'That brain of mine is something more than merely mortal, as time will show. The more I study, the more insatiable do I feel my genius for it to be.' },
  { id: 5, length: 'long', source: 'Theodore Roosevelt',
    text: 'It is not the critic who counts, not the man who points out how the strong man stumbles. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood, who strives valiantly, who errs and comes short again and again.' },
  { id: 6, length: 'short', source: 'Alan Kay',
    text: 'The best way to predict the future is to invent it.' },
  { id: 7, length: 'medium', source: 'Grace Hopper',
    text: 'The most dangerous phrase in the language is: we have always done it this way. A ship in port is safe, but that is not what ships are built for.' },
];

/** Load the word list for a language (v0.1 has en only). */
export function words(lang = 'en') {
  return WORDS_EN;
}

/** Load quotes, optionally filtered by length. */
export function quotes(lang = 'en', length = null) {
  return length ? QUOTES_EN.filter((q) => q.length === length) : QUOTES_EN;
}
