import { db } from '../data/db';

const ADJECTIVES = [
  'amber',
  'azure',
  'bold',
  'brave',
  'bright',
  'calm',
  'clever',
  'cool',
  'crisp',
  'daring',
  'dawn',
  'easy',
  'epic',
  'fast',
  'free',
  'fresh',
  'gentle',
  'golden',
  'grand',
  'green',
  'happy',
  'kind',
  'lively',
  'lucky',
  'mellow',
  'mighty',
  'nimble',
  'noble',
  'quiet',
  'rapid',
  'sharp',
  'silver',
  'sleek',
  'smooth',
  'solar',
  'still',
  'sunny',
  'swift',
  'teal',
  'vivid',
  'warm',
  'witty',
];

const NOUNS = [
  'bay',
  'birch',
  'brook',
  'canyon',
  'cedar',
  'cloud',
  'coast',
  'comet',
  'creek',
  'dune',
  'falcon',
  'fern',
  'fjord',
  'grove',
  'hawk',
  'hill',
  'island',
  'lake',
  'lark',
  'lotus',
  'lynx',
  'maple',
  'mesa',
  'moon',
  'moss',
  'otter',
  'peak',
  'pine',
  'pond',
  'quail',
  'raven',
  'reed',
  'ridge',
  'river',
  'robin',
  'rock',
  'sage',
  'snow',
  'star',
  'stone',
  'storm',
  'tide',
  'vale',
  'wave',
  'wolf',
];

function randomHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}_${noun}_${num}`;
}

export async function generateUniqueHandle(maxAttempts = 8): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const handle = randomHandle();
    const { data } = await db.queryOnce({
      user: { $: { where: { handle }, limit: 1 } },
    });
    if (!data?.user?.length) return handle;
  }
  // Fallback: timestamp base-36 + random numbers is virtually guaranteed unique
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `user_${Date.now().toString(36)}_${num}`;
}
