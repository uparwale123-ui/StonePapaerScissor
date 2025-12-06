/*
  Full rules chess UI using the chess.js library and a simple AI opponent.
  - Uses chess.js (loaded before this script) for rule enforcement: legal moves, castling, en-passant, checks, checkmate, stalemate, draws (50-move, repetition), insufficient material.
  - Implements a small minimax/alpha-beta engine for a computer opponent.
  - Provides New Game and Undo controls.
*/

const chess = new Chess(); // from chess.js library
let selectedSquare = null;
let highlighted = [];
let aiThinking = false;
const aiDepth = 2; // adjust for stronger/weaker AI (2-3 is reasonable in browser)

function renderBoard() {
  const boardEl = document.getElementById('chess-board');
  boardEl.innerHTML = '';
  const board = chess.board(); // array of ranks 8->1 (index 0 is rank 8)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + (((r + c) % 2 === 0) ? 'light' : 'dark');
      sq.dataset.r = r; sq.dataset.c = c;
      sq.dataset.square = toSquare(r, c);
      sq.addEventListener('click', onSquareClick);

      const piece = board[r][c];
      if (piece) {
        const p = createPieceElement(piece);
        sq.appendChild(p);
      }

      boardEl.appendChild(sq);
    }
  }
  updateStatus();
}

function toSquare(r, c) {
  // r: 0..7 where 0 is rank 8, c: 0..7 where 0 is file a
  const file = String.fromCharCode('a'.charCodeAt(0) + c);
  const rank = 8 - r;
  return file + rank;
}

function fromSquare(sq) {
  const file = sq[0].charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(sq[1], 10);
  return [rank, file];
}

function createPieceElement(piece) {
  const el = document.createElement('div');
  el.className = `piece ${piece.color==='w'?'white':'black'} ${piece.type}`;
  // insert SVG glyph and base
  el.innerHTML = `<div class="glyph">${svgForPiece(piece.type, piece.color)}</div><div class="base"></div>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); onPieceClick(e.target.closest('.piece')); });
  return el;
}

function svgForPiece(type, color) {
  const fill = (color === 'w') ? '#ffffff' : '#111111';
  const stroke = (color === 'w') ? '#c8c8c8' : '#222222';
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.5"`;
  // simple stylized SVGs for each piece
  switch(type) {
    case 'p':
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="32" r="14" ${common}></circle><rect x="30" y="48" width="40" height="38" rx="10" ${common}></rect></svg>`;
    case 'r':
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="28" width="60" height="20" rx="3" ${common}></rect><rect x="28" y="48" width="44" height="42" rx="6" ${common}></rect><rect x="24" y="18" width="12" height="8" ${common}></rect><rect x="64" y="18" width="12" height="8" ${common}></rect></svg>`;
    case 'n':
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M30 80 C28 70, 42 56, 48 50 C54 44, 62 42, 66 36 C70 30, 62 24, 56 26 C52 28, 44 32, 38 36 C32 40, 30 50, 30 60 Z" ${common} fill-rule="evenodd"></path><rect x="28" y="68" width="44" height="24" rx="8" ${common}></rect></svg>`;
    case 'b':
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="18" ry="12" ${common}></ellipse><path d="M36 52 C46 44, 54 44, 64 52 C68 56, 54 68, 50 72 C46 68, 32 56, 36 52 Z" ${common}></path><rect x="30" y="76" width="40" height="18" rx="8" ${common}></rect></svg>`;
    case 'q':
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="6" ${common}></circle><circle cx="50" cy="22" r="6" ${common}></circle><circle cx="72" cy="28" r="6" ${common}></circle><path d="M26 36 L74 36 L64 60 L36 60 Z" ${common}></path><rect x="30" y="60" width="40" height="30" rx="8" ${common}></rect></svg>`;
    case 'k':
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><rect x="44" y="14" width="12" height="18" ${common}></rect><path d="M26 46 L74 46 L64 70 L36 70 Z" ${common}></path><rect x="30" y="70" width="40" height="26" rx="8" ${common}></rect></svg>`;
    default:
      return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" ${common}></circle></svg>`;
  }
}

function onPieceClick(pieceEl) {
  if (aiThinking) return;
  const sq = pieceEl.closest('.square').dataset.square;
  handleSelectOrMove(sq);
}

function onSquareClick(e) {
  if (aiThinking) return;
  const sq = this.dataset.square;
  handleSelectOrMove(sq);
}

function handleSelectOrMove(sq) {
  const turnColor = chess.turn();
  const piece = chess.get(sq);
  if (selectedSquare && selectedSquare === sq) { clearHighlights(); return; }

  // If clicking a friendly piece, select it
  if (piece && piece.color === turnColor) {
    selectSquare(sq);
    return;
  }

  // Otherwise if we have a selection, attempt move
  if (selectedSquare) {
    const move = { from: selectedSquare, to: sq, promotion: 'q' };
    const result = chess.move(move);
    if (result) {
      clearHighlights();
      renderBoard();
      postMoveActions();
    } else {
      // invalid move
      clearHighlights();
    }
  }
}

function selectSquare(sq) {
  clearHighlights();
  selectedSquare = sq;
  const moves = chess.moves({ square: sq, verbose: true });
  const fromEl = document.querySelector(`#chess-board .square[data-square='${sq}']`);
  if (fromEl) fromEl.classList.add('highlight');
  moves.forEach(m => {
    const el = document.querySelector(`#chess-board .square[data-square='${m.to}']`);
    if (el) { el.classList.add('highlight'); highlighted.push(el); }
  });
}

function clearHighlights() {
  selectedSquare = null;
  const hs = document.querySelectorAll('#chess-board .square.highlight');
  hs.forEach(el => el.classList.remove('highlight'));
  highlighted = [];
}

function postMoveActions() {
  updateStatus();
  // after a player's move, if game isn't over and it's computer's turn, run AI
  if (!gameOver() && chess.turn() === 'b') {
    aiThinking = true;
    document.getElementById('gameStatus').textContent = 'Computer thinking...';
    // small timeout so UI updates before heavy work
    setTimeout(() => { const m = chooseBestMove(aiDepth); if (m) { chess.move(m); renderBoard(); } aiThinking = false; updateStatus(); }, 50);
  }
}

function gameOver() {
  return chess.game_over();
}

function updateStatus() {
  const el = document.getElementById('gameStatus');
  if (chess.in_checkmate()) {
    el.textContent = (chess.turn() === 'w') ? 'Black wins by checkmate' : 'White wins by checkmate';
    return;
  }
  if (chess.in_stalemate()) { el.textContent = 'Draw by stalemate'; return; }
  if (chess.in_threefold_repetition()) { el.textContent = 'Draw by threefold repetition'; return; }
  if (chess.insufficient_material()) { el.textContent = 'Draw by insufficient material'; return; }
  if (chess.in_draw()) { el.textContent = 'Draw'; return; }
  el.textContent = (chess.in_check()) ? `${chess.turn() === 'w' ? 'White' : 'Black'} in check` : `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
}

// Simple evaluation function (material + small positional bonuses)
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
function evaluateBoard() {
  const b = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      const val = pieceValues[p.type] || 0;
      score += (p.color === 'w') ? val : -val;
    }
  }
  return score;
}

// Minimax with alpha-beta (negamax style). Returns best score for side to move.
function minimax(depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.game_over()) {
    return evaluateBoard();
  }

  const moves = chess.moves({ verbose: true });
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      chess.move(m);
      const evalScore = minimax(depth - 1, alpha, beta, false);
      chess.undo();
      if (evalScore > maxEval) maxEval = evalScore;
      if (evalScore > alpha) alpha = evalScore;
      if (alpha >= beta) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      chess.move(m);
      const evalScore = minimax(depth - 1, alpha, beta, true);
      chess.undo();
      if (evalScore < minEval) minEval = evalScore;
      if (evalScore < beta) beta = evalScore;
      if (alpha >= beta) break;
    }
    return minEval;
  }
}

function chooseBestMove(depth) {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  let bestMove = null;
  let bestScore = -Infinity;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    chess.move(m);
    const score = -minimax(depth - 1, -Infinity, Infinity, false);
    chess.undo();
    if (score > bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove;
}

function newGame() {
  chess.reset();
  clearHighlights();
  renderBoard();
}

function undoMove() {
  if (aiThinking) return;
  // Undo last move; if it's AI vs human undo twice to go back to human's turn
  chess.undo();
  if (chess.turn() === 'b') chess.undo();
  clearHighlights();
  renderBoard();
}

// Wire controls
window.addEventListener('DOMContentLoaded', () => {
  renderBoard();
  document.getElementById('newGameBtn').addEventListener('click', newGame);
  document.getElementById('undoBtn').addEventListener('click', undoMove);
});

// Expose for debugging
window._fullChess = { chess, newGame, undoMove, chooseBestMove };
