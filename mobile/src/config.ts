const DEFAULT_API_URL = 'https://gestaoparaclinicas.vercel.app';

/** Backend (same Vercel deployment as the web app). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

/** Public web app — patient-facing links (questionnaires, quick booking) open here. */
export const WEB_URL = DEFAULT_API_URL;
