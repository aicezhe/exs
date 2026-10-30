/* The one list of blocks: the home page draws its cards from it, swipe.js finds the neighbours in it.
   href is relative to docs/blocks/. A block opens only when ready is true. */
window.EXS_BLOCKS = [
  { n: 1,  title: 'Imports',      sub: 'Libraries and settings',    href: './01-imports/', ready: true },
  { n: 2,  title: 'Dataset',      sub: 'From files to a table',     href: './02-data/',    ready: true },
  { n: 3,  title: 'Sound',        sub: 'From a wave to numbers',    href: './03-sound/',   ready: true, chip: 'animation' },
  { n: 4,  title: 'Clips',        sub: 'Make every clip 1 second',  href: './04-clips/',   ready: true },
  { n: 5,  title: 'MFCC',         sub: 'The 99 × 13 matrix',        href: './05-mfcc/',    ready: true, chip: 'animation' },
  { n: 6,  title: 'Split',        sub: 'Train, validation, test',   href: './06-split/',   ready: true },
  { n: 7,  title: 'Model',        sub: 'A small CNN',               href: './07-model/',   ready: true },
  { n: 8,  title: 'Training',     sub: 'Learning from examples',    href: null,            ready: false },
  { n: 9,  title: 'Evaluation',   sub: 'Accuracy and errors',       href: null,            ready: false },
  { n: 10, title: 'Quantization', sub: 'Shrink to int8',            href: null,            ready: false },
  { n: 11, title: 'Deployment',   sub: 'Board to laptop',           href: null,            ready: false },
  { n: 12, title: 'Experiments',  sub: 'What moves the accuracy',   href: null,            ready: false },
];
