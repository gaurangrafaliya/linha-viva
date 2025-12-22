import lightPreview from '@/assets/previews/light.png';
import darkPreview from '@/assets/previews/dark.png';
import defaultPreview from '@/assets/previews/default.png';

export const MAP_STYLES = {
  VOYAGER: {
    id: 'voyager',
    label: 'Default',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    previewUrl: defaultPreview,
    theme: 'light',
  },
  POSITRON: {
    id: 'positron',
    label: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    previewUrl: lightPreview,
    theme: 'light',
  },
  DARK_MATTER: {
    id: 'dark-matter',
    label: 'Dark',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    previewUrl: darkPreview,
    theme: 'dark',
  },
} as const;

export type MapStyleId = keyof typeof MAP_STYLES;
export type MapStyleUrl = typeof MAP_STYLES[MapStyleId]['url'];
export type Theme = typeof MAP_STYLES[MapStyleId]['theme'];
