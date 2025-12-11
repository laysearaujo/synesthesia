/**
 * @typedef {Object.<string, string>} VisualMapping
 *
 * VisualMapping maps a stem/channel id (e.g. 'drums', 'bass', 'vocals', 'guitar', 'piano')
 * to a visual object id (e.g. 'Orb', 'Terrain', 'Comet', 'Cloud').
 *
 * Example:
 * const mapping = {
 *   drums: 'Orb',
 *   bass: 'Terrain',
 *   vocals: 'Comet',
 *   guitar: 'Cloud'
 * }
 */

export const VISUAL_OBJECTS = ['Orb', 'Terrain', 'Comet', 'Cloud']

/**
 * Ensure a mapping is valid for a given set of stems.
 * This will assign a default visual to any missing stems.
 * @param {VisualMapping} mapping
 * @param {string[]} stems
 * @returns {VisualMapping}
 */
export function ensureMappingForStems(mapping = {}, stems = []) {
  const next = { ...mapping }
  const fallback = VISUAL_OBJECTS[0]
  stems.forEach((s, i) => {
    if (!next[s]) next[s] = VISUAL_OBJECTS[i % VISUAL_OBJECTS.length] || fallback
  })
  return next
}
