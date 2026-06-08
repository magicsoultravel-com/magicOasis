const LessonsBasics = [
  {
    title: "The goal",
    body: "Fill every row, column, and 3×3 box with digits 1–9. Each digit may appear only once per row, column, and box.",
  },
  {
    title: "How puzzles are made",
    body: "Every game is procedurally generated from a seed (key icon in the header). The same seed and difficulty always produces the same puzzle, so you can save or share seeds to replay or track games.",
  },
  {
    title: "Start with certainties",
    body: "Scan rows, columns, and boxes for cells where only one number can fit. A digit already present in the same row, column, or box eliminates candidates elsewhere.",
  },
  {
    title: "Use pencil marks",
    body: "Toggle pencil mode, pick a number on the numpad, then tap empty cells to mark candidates. When a candidate is ruled out everywhere else in a unit, you have found a hidden single.",
  },
  {
    title: "Naked singles",
    body: "If a cell has only one possible candidate left, place that digit. Remove it from pencil marks in the same row, column, and box.",
  },
  {
    title: "Hidden singles",
    body: "Sometimes a digit can only go in one cell within a row, column, or box — even if that cell has other candidates. Scan each unit for a number missing from all but one slot.",
  },
  {
    title: "Work in passes",
    body: "After each placement, rescan the board. Easy puzzles often collapse quickly once the first chain of singles is found.",
  },
  {
    title: "When stuck",
    body: "Use Check to verify mistakes without revealing answers. Select a number on the numpad to dim empty cells where that number can no longer go.",
  },
];

const LessonsAdvanced = [
  {
    title: "Pointing pairs & triples",
    body: "If candidates for a digit in a box are confined to one row or column, eliminate that digit from the rest of that row or column outside the box. The reverse also works: a line's candidates for a digit may be confined to one box.",
  },
  {
    title: "Naked pairs & triples",
    body: "When two cells in a unit contain exactly the same two candidates (and no others), those digits belong to those cells. Remove them from all other cells in that unit. Triples work the same with three cells and three digits.",
  },
  {
    title: "Hidden pairs & triples",
    body: "Harder to spot: two digits appear as candidates in only two cells of a unit (among other clutter). Those two digits are locked to those two cells — strip other candidates from those cells.",
  },
  {
    title: "Box-line reduction",
    body: "Also called claiming. If a row's candidates for a number all lie in one box, that number cannot appear elsewhere in the box on a different row. Mirror the logic for columns.",
  },
  {
    title: "X-Wing",
    body: "A digit appears in exactly two cells in two different rows, and those cells align in the same two columns (forming a rectangle). Eliminate that digit from other cells in those columns.",
  },
  {
    title: "Swordfish",
    body: "An extension of X-Wing across three rows and three columns. If a candidate lines up in at most three columns across three rows, eliminate it from the rest of those columns.",
  },
  {
    title: "XY-Wing",
    body: "Three cells with paired candidates: a pivot cell with XY, and two wings with XZ and YZ. Whichever wing is true, Z is forced in the cell that sees both wings — eliminate Z there.",
  },
  {
    title: "Unique rectangles",
    body: "Four cells forming a rectangle with matching pairs of candidates can create multiple solutions. If three corners share AB and the fourth is AB plus extra candidates, eliminate the extras to preserve a unique solution.",
  },
  {
    title: "Coloring & chains",
    body: "Track a single candidate in strong links (only two in a unit). Color alternating cells. If two same-colored cells see each other, that color is impossible. Useful on harder puzzles after basics are exhausted.",
  },
  {
    title: "When to guess",
    body: "A well-generated puzzle never requires guessing. If you feel forced to guess, revisit pencil marks — you likely missed a naked or hidden single, or a pointing pair.",
  },
];
