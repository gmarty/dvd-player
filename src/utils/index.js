/**
 * Transform a time in second to a human readable format.
 * Seconds are padded with leading 0.
 *
 * @param {number} time
 * @return {string}
 */
export function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time - (minutes * 60));

  return minutes + ':' + padWithZero(seconds);
}

/**
 * @param {number} num
 * @param {number} length Length of the resulting string.
 * @return {string}
 */
export function padWithZero(num, length = 2) {
  return ('0000' + num).slice(-length);
}
