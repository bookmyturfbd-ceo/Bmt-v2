import assert from 'assert';
import { calcTeamMMR, calcPlayerBaseMMR } from '../lib/mmrCalculator';

console.log('--- Running MMR Calculator Tests ---');

// Test Case 1: Balanced rating matchup, Winner A
{
  const res = calcTeamMMR('teamA', 'teamB', 'teamA', 'FUTSAL_5', 1000, 1000, false);
  console.log('Test Case 1 (Balanced, Win A):', res);
  assert.strictEqual(res.multA, 1.0);
  assert.strictEqual(res.multB, 1.0);
  assert.strictEqual(res.mmrChangeA, 80);
  assert.strictEqual(res.mmrChangeB, -40);
}

// Test Case 2: Team A beats stronger Team B (+200 difference)
{
  const res = calcTeamMMR('teamA', 'teamB', 'teamA', 'FUTSAL_5', 1000, 1200, false);
  console.log('Test Case 2 (A beats stronger B):', res);
  assert.strictEqual(res.multA, 1.5);
  assert.strictEqual(res.multB, 1.5);
  assert.strictEqual(res.mmrChangeA, 120); // 80 * 1.5 = 120
  assert.strictEqual(res.mmrChangeB, -60); // -40 * 1.5 = -60
}

// Test Case 3: Team A beats weaker Team B (-200 difference)
{
  const res = calcTeamMMR('teamA', 'teamB', 'teamA', 'FUTSAL_5', 1200, 1000, false);
  console.log('Test Case 3 (A beats weaker B):', res);
  assert.strictEqual(res.multA, 0.5);
  assert.strictEqual(res.multB, 0.5);
  assert.strictEqual(res.mmrChangeA, 40);  // 80 * 0.5 = 40
  assert.strictEqual(res.mmrChangeB, -20); // -40 * 0.5 = -20
}

// Test Case 4: Provisional team matchup (diff >= 200, but isProvisional is true)
{
  const res = calcTeamMMR('teamA', 'teamB', 'teamA', 'FUTSAL_5', 1000, 1200, true);
  console.log('Test Case 4 (Provisional team):', res);
  assert.strictEqual(res.multA, 1.0);
  assert.strictEqual(res.multB, 1.0);
  assert.strictEqual(res.mmrChangeA, 80);
  assert.strictEqual(res.mmrChangeB, -40);
}

// Test Case 5: Draw outcome (balanced/imbalanced doesn't matter)
{
  const res = calcTeamMMR('teamA', 'teamB', null, 'FUTSAL_5', 1000, 1250, false);
  console.log('Test Case 5 (Draw outcome):', res);
  assert.strictEqual(res.multA, 1.0);
  assert.strictEqual(res.multB, 1.0);
  assert.strictEqual(res.mmrChangeA, 40);
  assert.strictEqual(res.mmrChangeB, 40);
}

// Test Case 6: Player MMR with participation gating
{
  const players = [
    { playerId: 'p1', teamId: 'teamA' }, // Starter A
    { playerId: 'p2', teamId: 'teamA' }, // Benched A (didn't play)
    { playerId: 'p3', teamId: 'teamB' }, // Starter B
  ];
  const playedPlayerIds = ['p1', 'p3']; // Only p1 and p3 played
  const res = calcPlayerBaseMMR(
    players,
    'teamA',
    'FUTSAL_5',
    'teamA',
    1.5, // multA
    0.5, // multB
    playedPlayerIds
  );
  console.log('Test Case 6 (Player MMR Gating):', res);
  // p1 (played): win base 70 * 1.5 = 105
  assert.strictEqual(res.find(r => r.playerId === 'p1')?.mmrChange, 105);
  // p2 (didn't play): 0 MMR
  assert.strictEqual(res.find(r => r.playerId === 'p2')?.mmrChange, 0);
  // p3 (played): loss base -40 * 0.5 = -20
  assert.strictEqual(res.find(r => r.playerId === 'p3')?.mmrChange, -20);
}

// Test Case 7: Rounding checks
{
  const players = [
    { playerId: 'p1', teamId: 'teamA' },
  ];
  const res = calcPlayerBaseMMR(
    players,
    'teamA',
    'FUTSAL_5',
    'teamA',
    1.25,
    1.0,
    ['p1']
  );
  console.log('Test Case 7 (Player rounding):', res);
  assert.strictEqual(res.find(r => r.playerId === 'p1')?.mmrChange, 88); // Math.round(70 * 1.25) = Math.round(87.5) = 88
}

console.log('🎉 All MMR Calculator tests passed successfully!');
