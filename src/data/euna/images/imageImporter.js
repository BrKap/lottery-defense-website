const FALLBACK_IMAGE = '';

function normalizeFileName(path) {
  const segments = path.split('/');
  const fileName = segments[segments.length - 1] ?? '';
  return fileName.replace(/\.[^/.]+$/, '').toLowerCase();
}

function buildImageMap(globResult) {
  return Object.entries(globResult).reduce((accumulator, [path, moduleValue]) => {
    const key = normalizeFileName(path);
    const resolvedSource =
      typeof moduleValue === 'string'
        ? moduleValue
        : moduleValue?.default ?? FALLBACK_IMAGE;

    accumulator[key] = resolvedSource;
    return accumulator;
  }, {});
}

const runeImageModules = import.meta.glob('./runes/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
});

const jewelImageModules = import.meta.glob('./jewels/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
});

export const RUNE_IMAGES = buildImageMap(runeImageModules);
export const JEWEL_IMAGES = buildImageMap(jewelImageModules);

export function getRuneImage(name, fallback = FALLBACK_IMAGE) {
  return RUNE_IMAGES[String(name ?? '').toLowerCase()] ?? fallback;
}

export function getJewelImage(name, fallback = FALLBACK_IMAGE) {
  return JEWEL_IMAGES[String(name ?? '').toLowerCase()] ?? fallback;
}

export function getImageFromMap(imageMap, name, fallback = FALLBACK_IMAGE) {
  return imageMap[String(name ?? '').toLowerCase()] ?? fallback;
}

export { FALLBACK_IMAGE };