import { doc, onSnapshot } from 'firebase/firestore';
import { db, saveSettingToFirestore } from './firebase';

const REVIEWS_STORAGE_KEY = 'wg_client_reviews';

const nowMs = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

export const INITIAL_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Alexei',
    locationEn: 'Toronto, ON · Airbnb Host',
    locationEs: 'Toronto, ON · Anfitrión Airbnb',
    reviewEn:
      'WhiteGlove transformed my Airbnb turnovers. My guests consistently mention how spotless the space feels. The attention to detail is unmatched.',
    reviewEs:
      'WhiteGlove transformó mis turnovers de Airbnb. Mis huéspedes constantemente mencionan lo impecable que se siente el espacio. La atención al detalle es inigualable.',
    stars: 5,
    publishedAt: new Date(nowMs - 2 * DAY_MS).toISOString(),
    customTimeLabel: '',
  },
  {
    id: 'rev-2',
    name: 'Mandy D.',
    locationEn: 'Markham, ON · Luxury Homeowner',
    locationEs: 'Markham, ON · Residencia Privada',
    reviewEn:
      'Reliable, professional, and detail-oriented. I never worry about my property between bookings — WhiteGlove has it covered.',
    reviewEs:
      'Confiables, profesionales y meticulosos. Nunca me preocupo por mi propiedad entre reservas — WhiteGlove lo tiene todo bajo control.',
    stars: 5,
    publishedAt: new Date(nowMs - 5 * DAY_MS).toISOString(),
    customTimeLabel: '',
  },
  {
    id: 'rev-3',
    name: 'Rohan',
    locationEn: 'Downtown Toronto · 3 Properties',
    locationEs: 'Downtown Toronto · 3 Propiedades',
    reviewEn:
      'The team manages all three of my units with incredible consistency. Communication is clear, service is impeccable.',
    reviewEs:
      'El equipo maneja mis tres unidades con una consistencia increíble. La comunicación es clara y el servicio impecable.',
    stars: 5,
    publishedAt: new Date(nowMs - 11 * DAY_MS).toISOString(),
    customTimeLabel: '',
  },
  {
    id: 'rev-4',
    name: 'Saadman',
    locationEn: 'Mississauga, ON · Estate Owner',
    locationEs: 'Mississauga, ON · Propietario',
    reviewEn:
      'Deep clean service was outstanding. Found that premium touch other companies promise but never deliver.',
    reviewEs:
      'El servicio de limpieza profunda fue excepcional. Encontré ese toque premium que otras compañías prometen pero nunca entregan.',
    stars: 5,
    publishedAt: new Date(nowMs - 18 * DAY_MS).toISOString(),
    customTimeLabel: '',
  },
  {
    id: 'rev-5',
    name: 'Max',
    locationEn: 'Hamilton, ON · Property Manager',
    locationEs: 'Hamilton, ON · Property Manager',
    reviewEn:
      'Been working with WhiteGlove for months. Their checklists and property reports make managing from a distance effortless.',
    reviewEs:
      'He trabajado con WhiteGlove por meses. Sus checklists y reportes de propiedad hacen que administrar a distancia sea sencillo.',
    stars: 5,
    publishedAt: new Date(nowMs - 27 * DAY_MS).toISOString(),
    customTimeLabel: '',
  },
  {
    id: 'rev-6',
    name: 'Larisse',
    locationEn: 'Yorkville, Toronto · Penthouse',
    locationEs: 'Yorkville, Toronto · Penthouse',
    reviewEn:
      'Michelle and her team are incredible. They treat my home like it was their own. Highly recommend.',
    reviewEs:
      'Michelle y su equipo son increíbles. Tratan mi casa como si fuera suya. Altamente recomendados.',
    stars: 5,
    publishedAt: new Date(nowMs - 42 * DAY_MS).toISOString(),
    customTimeLabel: '',
  },
];

export function sortReviewsNewestFirst(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const timeA = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const timeB = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return timeB - timeA;
  });
}

export function getSavedReviews() {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortReviewsNewestFirst(parsed);
      }
    }
  } catch (e) {
    console.warn('Error reading saved reviews:', e);
  }
  return sortReviewsNewestFirst(INITIAL_REVIEWS);
}

export async function saveReviewsToCloud(reviewsList) {
  const sorted = sortReviewsNewestFirst(reviewsList);
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.warn('Error saving reviews to localStorage:', e);
  }
  try {
    await saveSettingToFirestore('client_reviews', sorted);
  } catch (e) {
    console.warn('Error saving reviews to Firestore:', e);
  }
  return sorted;
}

export function subscribeReviewsFromCloud(onUpdate) {
  if (!db) return () => {};
  const ref = doc(db, 'settings', 'client_reviews');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data()?.value;
        if (Array.isArray(data) && data.length > 0) {
          const sorted = sortReviewsNewestFirst(data);
          try {
            localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(sorted));
          } catch {
            // ignore storage errors
          }
          onUpdate(sorted);
        }
      }
    },
    (err) => {
      console.warn('Error subscribing to client_reviews:', err);
    }
  );
}

export function formatReviewTimeAgo(review, lang = 'es') {
  if (!review) return '';
  if (review.customTimeLabel && String(review.customTimeLabel).trim()) {
    return String(review.customTimeLabel).trim();
  }
  if (!review.publishedAt) {
    return lang === 'es' ? 'Hace poco' : 'Recently';
  }
  const pubMs = new Date(review.publishedAt).getTime();
  if (Number.isNaN(pubMs)) {
    return lang === 'es' ? 'Hace poco' : 'Recently';
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - pubMs) / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (lang === 'en') {
    if (diffSec < 90) return 'Just now';
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffDays < 30) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  }

  if (diffSec < 90) return 'Hace unos momentos';
  if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
  if (diffHr < 24) return `Hace ${diffHr} ${diffHr === 1 ? 'hora' : 'horas'}`;
  if (diffDays === 1) return 'Hace 1 día';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffWeeks === 1) return 'Hace 1 semana';
  if (diffDays < 30) return `Hace ${diffWeeks} semanas`;
  if (diffMonths === 1) return 'Hace 1 mes';
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;
  return `Hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
}

export const ADMIN_TIME_PRESETS = [
  { id: 'now', labelEs: 'Hace unos momentos', labelEn: 'Just now', offsetMs: 0 },
  { id: '2h', labelEs: 'Hace 2 horas', labelEn: '2 hours ago', offsetMs: 2 * 60 * 60 * 1000 },
  { id: '1d', labelEs: 'Hace 1 día', labelEn: '1 day ago', offsetMs: 1 * DAY_MS },
  { id: '3d', labelEs: 'Hace 3 días', labelEn: '3 days ago', offsetMs: 3 * DAY_MS },
  { id: '5d', labelEs: 'Hace 5 días', labelEn: '5 days ago', offsetMs: 5 * DAY_MS },
  { id: '1w', labelEs: 'Hace 1 semana', labelEn: '1 week ago', offsetMs: 7 * DAY_MS },
  { id: '2w', labelEs: 'Hace 2 semanas', labelEn: '2 weeks ago', offsetMs: 14 * DAY_MS },
  { id: '3w', labelEs: 'Hace 3 semanas', labelEn: '3 weeks ago', offsetMs: 21 * DAY_MS },
  { id: '1m', labelEs: 'Hace 1 mes', labelEn: '1 month ago', offsetMs: 30 * DAY_MS },
  { id: '2m', labelEs: 'Hace 2 meses', labelEn: '2 months ago', offsetMs: 60 * DAY_MS },
  { id: '3m', labelEs: 'Hace 3 meses', labelEn: '3 months ago', offsetMs: 90 * DAY_MS },
  { id: '6m', labelEs: 'Hace 6 meses', labelEn: '6 months ago', offsetMs: 180 * DAY_MS },
];
