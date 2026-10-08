const transitions = {
  LOADING: ['BOOT', 'GROUND', 'ERROR'], ERROR: ['DETAIL'],
  GROUND: ['LENS_ZOOM', 'VIEWFINDER', 'DETAIL'], LENS_ZOOM: ['BOOT', 'VIEWFINDER'], BOOT: ['VIEWFINDER', 'ERROR'],
  VIEWFINDER: ['FOCUS_TV', 'DETAIL'], FOCUS_TV: ['DETAIL', 'RETURNING'],
  DETAIL: ['VIEWFINDER', 'GROUND', 'ERROR', 'RETURNING'], RETURNING: ['VIEWFINDER'],
};
export class AppState {
  constructor(onChange = () => {}) { this.value = 'LOADING'; this.onChange = onChange; }
  set(next) { if (!transitions[this.value]?.includes(next)) return false; this.value = next; this.onChange(next); return true; }
}
