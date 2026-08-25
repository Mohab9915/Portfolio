/**
 * Sprite atlas description for the "rick" pet from codex-pets.net.
 *
 * The downloaded package ships a spritesheet and a manifest that names the pet
 * but not its animations, so the grid below was measured off the atlas: an
 * 8 x 9 grid of 192 x 208 cells, left-aligned, with unused trailing cells left
 * transparent. Frame counts are exact — playing past them renders an empty
 * cell and the pet vanishes for a beat.
 *
 *   row 0  6 frames  standing, blinks
 *   row 1  8 frames  walk cycle
 *   row 2  8 frames  run cycle
 *   row 3  4 frames  arm raised — wave
 *   row 4  5 frames  arm across chest — cheer
 *   row 5  8 frames  droops, ends lying down
 *   row 6  6 frames  playing a guitar
 *   row 7  6 frames  gesturing — talk
 *   row 8  6 frames  hand to head, arms folded — think
 */

export const SHEET_SRC = '/pet/rick.webp'
export const SHEET_COLS = 8
export const SHEET_ROWS = 9
export const CELL_W = 192
export const CELL_H = 208

export type PetState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'wave'
  | 'cheer'
  | 'sleep'
  | 'guitar'
  | 'talk'
  | 'think'

export interface SpriteState {
  row: number
  frames: number
  fps: number
  /** false = play once. */
  loop: boolean
  /** For one-shot states, freeze on the last frame instead of reverting. */
  hold?: boolean
  /**
   * This row's artwork faces left instead of right.
   *
   * The atlas is not internally consistent, which is not something you would
   * guess. Measuring the face-vs-hair centroid on every frame of every row
   * (skin sits toward the facing direction, hair behind it) put eight rows
   * facing right by +3 to +9 px — and the run row facing LEFT by -7 px across
   * all 8 of its frames. Flipping by travel direction alone therefore made him
   * moonwalk whenever he broke into a run.
   */
  facesLeft?: boolean
}

export const STATES: Record<PetState, SpriteState> = {
  idle: { row: 0, frames: 6, fps: 5, loop: true },
  walk: { row: 1, frames: 8, fps: 10, loop: true },
  // The one row drawn facing left; see facesLeft above.
  run: { row: 2, frames: 8, fps: 14, loop: true, facesLeft: true },
  wave: { row: 3, frames: 4, fps: 5, loop: false },
  cheer: { row: 4, frames: 5, fps: 8, loop: false },
  // The row animates from upright to lying down, so it holds rather than
  // looping — otherwise he stands up and collapses over and over.
  sleep: { row: 5, frames: 8, fps: 3, loop: false, hold: true },
  guitar: { row: 6, frames: 6, fps: 8, loop: true },
  talk: { row: 7, frames: 6, fps: 8, loop: true },
  think: { row: 8, frames: 6, fps: 6, loop: true },
}
