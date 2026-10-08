import { manuscripts as originalPapers } from './manuscripts.js';
import { scripts as originalScripts } from './scripts.js';

const paperSummaries = [
  'How medieval Christianity shaped legal thought through canon law, ethics, and social practice.',
  'Raphael\'s School of Athens as a lens on humanism, artistic expression, and the Renaissance.',
  'The narrative and symbolic roles of bamboo forests, rain, and deserts in modern wuxia cinema.',
];

const scriptSummaries = [
  'In a world where divorce carries a steep price, a witchcraft accusation changes Ace\'s fate. Years later, the same choice returns.',
  'Dongyu and Xiazhi travel from childhood companionship to a war zone, searching for meaning through filming, care, and farewell.',
  'In a nation divided by identity numbers, two brothers are separated as Yuan Qi is drawn into a struggle among church, crown, and society.',
];

export const papers = originalPapers.map((work, index) => ({
  ...work,
  originalTitle: work.title,
  title: work.en,
  kind: 'RESEARCH PAPER',
  author: 'WU XITING',
  summary: paperSummaries[index],
}));

export const screenplayWorks = originalScripts.map((work, index) => ({
  ...work,
  originalTitle: work.title,
  title: work.en,
  kind: 'SCREENPLAY',
  author: 'WU XITING',
  summary: scriptSummaries[index],
}));
