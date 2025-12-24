export const MAP_STYLES = {
  VOYAGER: {
    id: 'voyager',
    label: 'Default',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    theme: 'light',
  },
} as const;

export type MapStyleId = keyof typeof MAP_STYLES;
export type MapStyleUrl = typeof MAP_STYLES[MapStyleId]['url'];
export type Theme = typeof MAP_STYLES[MapStyleId]['theme'];
