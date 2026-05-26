'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, Trophy, Shield, User, ArrowLeftRight, 
  RotateCcw, AlertTriangle, Play, HelpCircle, Star, X, Check, ChevronRight, Award
} from 'lucide-react';

interface Delivery {
  runs: number;
  type: 'LEGAL' | 'WIDE' | 'NO_BALL';
  wicket?: {
    playerOutId: string;
    dismissalType: string;
    fielderId?: string;
  };
  runsType?: 'RUNS' | 'BYES' | 'LEG_BYES';
}

interface InningsData {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  legalBallsBowled: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  currentStrikerId: string | null;
  currentNonStrikerId: string | null;
  currentBowlerId: string | null;
  currentOverNumber: number;
  ballsInCurrentOver: Delivery[];
  battingStats: Record<string, {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: string;
    hasBatted: boolean;
  }>;
  bowlingStats: Record<string, {
    balls: number;
    runs: number;
    wickets: number;
    wides: number;
    noBalls: number;
  }>;
  battingOrder: string[];
  bowlingOrder: string[];
}

interface CricketState {
  stage: 'SETUP' | 'TOSS' | 'INNINGS1_SETUP' | 'PLAYING' | 'OVER_COMPLETE' | 'WICKET_FLOW' | 'INNINGS_COMPLETE' | 'INNINGS2_SETUP' | 'MATCH_COMPLETE';
  agreedOvers: number;
  tossWinnerId: string | null;
  tossElectedTo: 'BAT' | 'BOWL' | null;
  innings1: InningsData | null;
  innings2: InningsData | null;
  currentInningsNumber: 1 | 2;
  history?: string[];
  wicketSelector?: {
    strikerOrNonStriker: 'STRIKER' | 'NON_STRIKER';
    dismissalType: string;
    fielderId?: string;
  };
}

export default function CricketScorer({ match }: { match: any }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [extraModifier, setExtraModifier] = useState<'NORMAL' | 'WIDE' | 'NO_BALL'>('NORMAL');
  
  // Scorer state initialized as SETUP. Will load from match history if available.
  const [state, setState] = useState<CricketState>({
    stage: 'SETUP',
    agreedOvers: 5,
    tossWinnerId: null,
    tossElectedTo: null,
    innings1: null,
    innings2: null,
    currentInningsNumber: 1,
    history: []
  });

  // ─── Roster and Team Helpers ────────────────────────────────────────────────
  const getTeamName = (teamId: string) => {
    const reg = match.tournament.registrations.find((r: any) => r.entityId === teamId);
    return reg?.team?.name || teamId;
  };

  const getTeamLogo = (teamId: string) => {
    const reg = match.tournament.registrations.find((r: any) => r.entityId === teamId);
    return reg?.team?.logoUrl || null;
  };

  const getRoster = (teamId: string) => {
    const reg = match.tournament.registrations.find((r: any) => r.entityId === teamId);
    if (!reg || !reg.team || !reg.team.members) return [];
    return reg.team.members.map((m: any) => ({
      id: m.player.id,
      fullName: m.player.fullName,
      avatarUrl: m.player.avatarUrl,
      role: m.sportRole || m.role
    }));
  };

  const getPlayerName = (teamId: string, playerId: string) => {
    const roster = getRoster(teamId);
    const p = roster.find((r: any) => r.id === playerId);
    return p?.fullName || 'Unknown Player';
  };

  // Initialize stats records for squad
  const initBattingStats = (teamRoster: any[]) => {
    const stats: Record<string, any> = {};
    teamRoster.forEach((p) => {
      stats[p.id] = {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissal: '',
        hasBatted: false
      };
    });
    return stats;
  };

  const initBowlingStats = (teamRoster: any[]) => {
    const stats: Record<string, any> = {};
    teamRoster.forEach((p) => {
      stats[p.id] = {
        balls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0
      };
    });
    return stats;
  };

  // ─── Rehydrate State from Database Events ──────────────────────────────────
  useEffect(() => {
    const dbEvents = match.resultSummary?.events || [];
    // Search backwards for the last event with stored cricketState
    const lastStateEvent = [...dbEvents].reverse().find((e: any) => e.cricketState);
    
    if (lastStateEvent && lastStateEvent.cricketState) {
      setState(lastStateEvent.cricketState);
    } else if (match.resultSummary?.cricketState) {
      setState(match.resultSummary.cricketState);
    } else {
      // Setup initial default
      setState({
        stage: 'SETUP',
        agreedOvers: 5,
        tossWinnerId: null,
        tossElectedTo: null,
        innings1: null,
        innings2: null,
        currentInningsNumber: 1,
        history: []
      });
    }
  }, [match]);

  // ─── Core State Syncer ──────────────────────────────────────────────────────
  const updateStateAndSync = async (nextState: CricketState, eventPayload?: any) => {
    setState(nextState);
    if (!eventPayload) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/t-matches/${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventPayload,
          cricketState: nextState // Attach full state snapshot!
        })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to sync to database');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Network error syncing event');
    } finally {
      setLoading(false);
    }
  };

  // Push clean snapshot to state history before modifications
  const getHistoryWithSnapshot = (currState: CricketState) => {
    const historySnapshot = {
      stage: currState.stage,
      agreedOvers: currState.agreedOvers,
      tossWinnerId: currState.tossWinnerId,
      tossElectedTo: currState.tossElectedTo,
      innings1: currState.innings1,
      innings2: currState.innings2,
      currentInningsNumber: currState.currentInningsNumber,
      wicketSelector: currState.wicketSelector
    };
    return [...(currState.history || []), JSON.stringify(historySnapshot)];
  };

  // ─── Undo Last Action ───────────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!state.history || state.history.length === 0) return;
    if (!confirm('Are you sure you want to undo the last recorded ball?')) return;

    const dbEvents = match.resultSummary?.events || [];
    const lastEvent = dbEvents[dbEvents.length - 1];

    if (!lastEvent) return;

    setLoading(true);
    try {
      // 1. Rollback frontend state
      const prevStateStr = state.history[state.history.length - 1];
      const prevState = JSON.parse(prevStateStr);
      
      const nextHistory = state.history.slice(0, -1);
      const nextState: CricketState = {
        ...prevState,
        history: nextHistory
      };

      // 2. Call DB event delete API
      const res = await fetch(`/api/t-matches/${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', eventId: lastEvent.id })
      });
      const data = await res.json();
      
      if (data.success) {
        // Sync rolled back state back to DB as standard event sync
        await updateStateAndSync(nextState, {
          type: 'undo',
          description: 'Undid last scoring action'
        });
      } else {
        setErrorMsg(data.error || 'Failed to delete database event');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error rolling back state');
    } finally {
      setLoading(false);
    }
  };

  // ─── Phase Handlers ────────────────────────────────────────────────────────
  
  // Toss & Setup confirmation
  const handleConfirmSetup = async () => {
    if (!state.tossWinnerId || !state.tossElectedTo) {
      setErrorMsg('Please select toss details');
      return;
    }

    const nextState: CricketState = {
      ...state,
      history: getHistoryWithSnapshot(state),
      stage: 'INNINGS1_SETUP'
    };

    await updateStateAndSync(nextState, {
      type: 'toss_completed',
      description: `Toss won by ${getTeamName(state.tossWinnerId)}, elected to ${state.tossElectedTo}`
    });
  };

  // Innings 1 Setup confirmation
  const handleStartInnings1 = async (strikerId: string, nonStrikerId: string, bowlerId: string) => {
    const isBat1A = state.tossWinnerId === match.teamAId 
      ? state.tossElectedTo === 'BAT' 
      : state.tossElectedTo === 'BOWL';
    
    const battingTeamId = isBat1A ? match.teamAId : match.teamBId;
    const bowlingTeamId = isBat1A ? match.teamBId : match.teamAId;

    const battingRoster = getRoster(battingTeamId);
    const bowlingRoster = getRoster(bowlingTeamId);

    const bStats = initBattingStats(battingRoster);
    const bowlStats = initBowlingStats(bowlingRoster);

    // Set opener flags
    bStats[strikerId].hasBatted = true;
    bStats[nonStrikerId].hasBatted = true;

    const innings1: InningsData = {
      battingTeamId,
      bowlingTeamId,
      totalRuns: 0,
      totalWickets: 0,
      legalBallsBowled: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      currentOverNumber: 1,
      ballsInCurrentOver: [],
      battingStats: bStats,
      bowlingStats: bowlStats,
      battingOrder: [strikerId, nonStrikerId],
      bowlingOrder: [bowlerId]
    };

    const nextState: CricketState = {
      ...state,
      history: getHistoryWithSnapshot(state),
      stage: 'PLAYING',
      innings1,
      currentInningsNumber: 1
    };

    await updateStateAndSync(nextState, {
      type: 'innings_started',
      inningsNumber: 1,
      description: `Innings 1 started: ${getTeamName(battingTeamId)} batting`
    });
  };

  // Innings 2 Setup confirmation
  const handleStartInnings2 = async (strikerId: string, nonStrikerId: string, bowlerId: string) => {
    if (!state.innings1) return;

    const battingTeamId = state.innings1.bowlingTeamId;
    const bowlingTeamId = state.innings1.battingTeamId;

    const battingRoster = getRoster(battingTeamId);
    const bowlingRoster = getRoster(bowlingTeamId);

    const bStats = initBattingStats(battingRoster);
    const bowlStats = initBowlingStats(bowlingRoster);

    // Set opener flags
    bStats[strikerId].hasBatted = true;
    bStats[nonStrikerId].hasBatted = true;

    const innings2: InningsData = {
      battingTeamId,
      bowlingTeamId,
      totalRuns: 0,
      totalWickets: 0,
      legalBallsBowled: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      currentOverNumber: 1,
      ballsInCurrentOver: [],
      battingStats: bStats,
      bowlingStats: bowlStats,
      battingOrder: [strikerId, nonStrikerId],
      bowlingOrder: [bowlerId]
    };

    const nextState: CricketState = {
      ...state,
      history: getHistoryWithSnapshot(state),
      stage: 'PLAYING',
      innings2,
      currentInningsNumber: 2
    };

    await updateStateAndSync(nextState, {
      type: 'innings_started',
      inningsNumber: 2,
      description: `Innings 2 started: ${getTeamName(battingTeamId)} chasing ${state.innings1.totalRuns + 1}`
    });
  };

  // ─── Live Ball Scoring Logic ────────────────────────────────────────────────
  const handleScoreBall = async (runsScored: number, type: 'LEGAL' | 'WIDE' | 'NO_BALL', isLegBye: boolean = false) => {
    const isInn1 = state.currentInningsNumber === 1;
    const currInnings = isInn1 ? state.innings1 : state.innings2;
    if (!currInnings) return;

    const strikerId = currInnings.currentStrikerId;
    const bowlerId = currInnings.currentBowlerId;
    if (!strikerId || !bowlerId) return;

    // Clone innings objects deeply
    const innings: InningsData = JSON.parse(JSON.stringify(currInnings));
    const battingStats = innings.battingStats[strikerId];
    const bowlingStats = innings.bowlingStats[bowlerId];

    // Determine extra runs
    let extraRuns = 0;
    if (type === 'WIDE') {
      extraRuns = 1;
      innings.extras.wides += (runsScored + extraRuns);
      bowlingStats.wides += 1;
    } else if (type === 'NO_BALL') {
      extraRuns = 1;
      innings.extras.noBalls += 1;
      bowlingStats.noBalls += 1;
    }

    let runsAdded = runsScored + extraRuns;
    innings.totalRuns += runsAdded;

    // Batsman stats updates
    if (type === 'LEGAL') {
      battingStats.balls += 1;
      if (!isLegBye) {
        battingStats.runs += runsScored;
        if (runsScored === 4) battingStats.fours += 1;
        if (runsScored === 6) battingStats.sixes += 1;
      } else {
        innings.extras.legByes += runsScored;
      }
    } else if (type === 'NO_BALL') {
      battingStats.balls += 1;
      if (!isLegBye) {
        battingStats.runs += runsScored;
        if (runsScored === 4) battingStats.fours += 1;
        if (runsScored === 6) battingStats.sixes += 1;
      } else {
        innings.extras.legByes += runsScored;
      }
    }

    // Bowler stats updates
    if (type === 'LEGAL') {
      innings.legalBallsBowled += 1;
      bowlingStats.balls += 1;
      if (!isLegBye) {
        bowlingStats.runs += runsScored;
      }
    } else if (type === 'NO_BALL') {
      bowlingStats.runs += runsAdded;
    } else if (type === 'WIDE') {
      bowlingStats.runs += runsAdded;
    }

    // Add ball to current over list
    const newDelivery: Delivery = {
      runs: runsAdded,
      type,
      runsType: isLegBye ? 'LEG_BYES' : 'RUNS'
    };
    innings.ballsInCurrentOver.push(newDelivery);

    // Rotate strikers on odd runs
    if (runsScored % 2 === 1) {
      const temp = innings.currentStrikerId;
      innings.currentStrikerId = innings.currentNonStrikerId;
      innings.currentNonStrikerId = temp;
    }

    // Check Innings End conditions
    const overCompleted = type === 'LEGAL' && innings.legalBallsBowled > 0 && innings.legalBallsBowled % 6 === 0;
    const oversFinished = innings.legalBallsBowled >= state.agreedOvers * 6;
    
    // Check if target chased in Innings 2
    let innings2Finished = false;
    if (!isInn1 && state.innings1) {
      if (innings.totalRuns > state.innings1.totalRuns) {
        innings2Finished = true;
      }
    }

    let nextStage: CricketState['stage'] = 'PLAYING';
    if (innings2Finished || (oversFinished && !isInn1)) {
      nextStage = 'INNINGS_COMPLETE';
    } else if (oversFinished && isInn1) {
      nextStage = 'INNINGS_COMPLETE';
    } else if (overCompleted) {
      nextStage = 'OVER_COMPLETE';
    }

    // Build next state object
    const nextState: CricketState = {
      ...state,
      history: getHistoryWithSnapshot(state),
      stage: nextStage,
      innings1: isInn1 ? innings : state.innings1,
      innings2: !isInn1 ? innings : state.innings2
    };

    // Database event sync payload
    const batsmanName = getPlayerName(innings.battingTeamId, strikerId);
    const bowlerName = getPlayerName(innings.bowlingTeamId, bowlerId);
    let description = '';
    if (type === 'WIDE') {
      description = `Wide ball (${runsAdded} runs) bowled by ${bowlerName}`;
    } else if (type === 'NO_BALL') {
      description = `No ball (${runsAdded} runs) faced by ${batsmanName} off ${bowlerName}`;
    } else {
      description = `${batsmanName} scored ${runsScored} runs off ${bowlerName}`;
    }

    const eventPayload = {
      type: 'run',
      runs: runsAdded,
      teamId: innings.battingTeamId,
      description
    };

    await updateStateAndSync(nextState, eventPayload);
  };

  // Bowler selection for next over
  const handleConfirmNewBowler = async (nextBowlerId: string) => {
    const isInn1 = state.currentInningsNumber === 1;
    const currInnings = isInn1 ? state.innings1 : state.innings2;
    if (!currInnings) return;

    const innings: InningsData = JSON.parse(JSON.stringify(currInnings));
    innings.currentBowlerId = nextBowlerId;
    innings.currentOverNumber += 1;
    innings.ballsInCurrentOver = []; // Clear over timeline for new over
    if (!innings.bowlingOrder.includes(nextBowlerId)) {
      innings.bowlingOrder.push(nextBowlerId);
    }

    // At the end of over, batsman swap ends natively, so we rotate strikers as well
    const temp = innings.currentStrikerId;
    innings.currentStrikerId = innings.currentNonStrikerId;
    innings.currentNonStrikerId = temp;

    const nextState: CricketState = {
      ...state,
      history: getHistoryWithSnapshot(state),
      stage: 'PLAYING',
      innings1: isInn1 ? innings : state.innings1,
      innings2: !isInn1 ? innings : state.innings2
    };

    await updateStateAndSync(nextState, {
      type: 'bowler_changed',
      bowlerId: nextBowlerId,
      description: `New over started by ${getPlayerName(innings.bowlingTeamId, nextBowlerId)}`
    });
  };

  // Wicket flow trigger
  const handleOpenWicketFlow = (strikerOrNon: 'STRIKER' | 'NON_STRIKER') => {
    setState({
      ...state,
      stage: 'WICKET_FLOW',
      wicketSelector: {
        strikerOrNonStriker: strikerOrNon,
        dismissalType: 'BOWLED'
      }
    });
  };

  // Submit Wicket Action
  const handleLogWicket = async (nextBatsmanId: string) => {
    const isInn1 = state.currentInningsNumber === 1;
    const currInnings = isInn1 ? state.innings1 : state.innings2;
    const selector = state.wicketSelector;
    if (!currInnings || !selector) return;

    const outPlayerId = selector.strikerOrNonStriker === 'STRIKER' 
      ? currInnings.currentStrikerId 
      : currInnings.currentNonStrikerId;
    const bowlerId = currInnings.currentBowlerId;

    if (!outPlayerId || !bowlerId) return;

    const innings: InningsData = JSON.parse(JSON.stringify(currInnings));
    innings.totalWickets += 1;
    innings.legalBallsBowled += 1; // Wicket counts as a legal ball

    // Update batsman stats
    const battingStatsOut = innings.battingStats[outPlayerId];
    battingStatsOut.balls += 1;
    battingStatsOut.isOut = true;
    battingStatsOut.dismissal = `${selector.dismissalType}${selector.fielderId ? ` (c ${getPlayerName(innings.bowlingTeamId, selector.fielderId)})` : ''}`;

    // Update bowler stats
    const bowlingStats = innings.bowlingStats[bowlerId];
    bowlingStats.balls += 1;
    if (selector.dismissalType !== 'RUN_OUT') {
      bowlingStats.wickets += 1;
    }

    // Add ball to current over list
    const newDelivery: Delivery = {
      runs: 0,
      type: 'LEGAL',
      wicket: {
        playerOutId: outPlayerId,
        dismissalType: selector.dismissalType,
        fielderId: selector.fielderId
      }
    };
    innings.ballsInCurrentOver.push(newDelivery);

    // Check all out
    const totalSquadCount = getRoster(innings.battingTeamId).length;
    // Wickets reach 10, or wickets === squadCount - 1 (since you need 2 batsmen to play)
    const isAllOut = innings.totalWickets >= 10 || innings.totalWickets >= totalSquadCount - 1;
    
    // Check overs finished
    const oversFinished = innings.legalBallsBowled >= state.agreedOvers * 6;

    // Check target chased in Innings 2
    let innings2Finished = false;
    if (!isInn1 && state.innings1) {
      if (innings.totalRuns > state.innings1.totalRuns) {
        innings2Finished = true;
      }
    }

    let nextStage: CricketState['stage'] = 'PLAYING';
    if (isAllOut || innings2Finished || (oversFinished && !isInn1)) {
      nextStage = 'INNINGS_COMPLETE';
    } else if (oversFinished && isInn1) {
      nextStage = 'INNINGS_COMPLETE';
    } else if (innings.legalBallsBowled % 6 === 0) {
      nextStage = 'OVER_COMPLETE';
      // Substitute incoming batsman before over end transition
      if (selector.strikerOrNonStriker === 'STRIKER') {
        innings.currentStrikerId = nextBatsmanId;
      } else {
        innings.currentNonStrikerId = nextBatsmanId;
      }
      innings.battingStats[nextBatsmanId].hasBatted = true;
      innings.battingOrder.push(nextBatsmanId);
    } else {
      // Normal replacement
      if (selector.strikerOrNonStriker === 'STRIKER') {
        innings.currentStrikerId = nextBatsmanId;
      } else {
        innings.currentNonStrikerId = nextBatsmanId;
      }
      innings.battingStats[nextBatsmanId].hasBatted = true;
      innings.battingOrder.push(nextBatsmanId);
    }

    const nextState: CricketState = {
      ...state,
      history: getHistoryWithSnapshot(state),
      stage: nextStage,
      innings1: isInn1 ? innings : state.innings1,
      innings2: !isInn1 ? innings : state.innings2,
      wicketSelector: undefined
    };

    await updateStateAndSync(nextState, {
      type: 'wicket',
      teamId: innings.battingTeamId,
      description: `WICKET! ${getPlayerName(innings.battingTeamId, outPlayerId)} out (${selector.dismissalType})`
    });
  };

  // Complete and finalize the whole match
  const handleFinalizeMatch = async () => {
    if (!confirm('Are you sure you want to finalize the match scores? This will update standings.')) return;
    if (!state.innings1) return;

    setLoading(true);
    const runsA = state.innings1.totalRuns;
    const runsB = state.innings2 ? state.innings2.totalRuns : 0;
    const wicketsA = state.innings1.totalWickets;
    const wicketsB = state.innings2 ? state.innings2.totalWickets : 0;

    // Convert legal balls bowled into decimal overs for standing-calculator NRR
    const oversA = state.innings1.legalBallsBowled / 6;
    const oversB = state.innings2 ? state.innings2.legalBallsBowled / 6 : 0;

    const isWinnerA = runsA > runsB;
    const winnerId = isWinnerA ? match.teamAId : runsB > runsA ? match.teamBId : null;

    try {
      const res = await fetch(`/api/t-matches/${match.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          winnerId,
          resultSummary: {
            runsA,
            wicketsA,
            oversA,
            runsB,
            wicketsB,
            oversB,
            cricketState: state
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setErrorMsg(data.error || 'Failed to complete match');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error finalizing match');
    } finally {
      setLoading(false);
    }
  };

  // Forfeit matching flow submit
  const handleForfeitSubmit = async (forfeitedTeamId: string, reason: string) => {
    setLoading(true);
    const runsA = state.innings1 ? state.innings1.totalRuns : 0;
    const runsB = state.innings2 ? state.innings2.totalRuns : 0;
    const wicketsA = state.innings1 ? state.innings1.totalWickets : 0;
    const wicketsB = state.innings2 ? state.innings2.totalWickets : 0;
    const oversA = state.innings1 ? state.innings1.legalBallsBowled / 6 : 0;
    const oversB = state.innings2 ? state.innings2.legalBallsBowled / 6 : 0;

    const winnerId = forfeitedTeamId === match.teamAId ? match.teamBId : match.teamAId;

    try {
      const res = await fetch(`/api/t-matches/${match.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          winnerId,
          resultSummary: {
            runsA,
            wicketsA,
            oversA,
            runsB,
            wicketsB,
            oversB,
            cricketState: state,
            forfeited: true,
            forfeitedTeamId,
            forfeitReason: reason
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setErrorMsg(data.error || 'Failed to forfeit match');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error forfeiting match');
    } finally {
      setLoading(false);
    }
  };

  const getForfeitDetails = () => {
    const rs = match.resultSummary as any;
    if (rs && rs.forfeited) {
      const forfeitedTeamName = getTeamName(rs.forfeitedTeamId);
      const winnerTeamId = rs.forfeitedTeamId === match.teamAId ? match.teamBId : match.teamAId;
      const winnerTeamName = getTeamName(winnerTeamId);
      return {
        isForfeited: true,
        winnerTeamName,
        forfeitedTeamName,
        reason: rs.forfeitReason || 'No reason provided'
      };
    }
    return null;
  };

  // ─── Sub-setup Components ──────────────────────────────────────────────────
  
  // Toss setup screen
  const renderSetupView = () => {
    const teamA = match.teamAId;
    const teamB = match.teamBId;

    return (
      <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#00ff41] border-b border-white/5 pb-3">
          🏏 Match Toss Setup
        </h2>
        
        {/* Overs pickers */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Agreed Overs</label>
          <div className="flex items-center gap-3 bg-neutral-950 p-4 rounded-2xl border border-white/5">
            <button
              onClick={() => setState(s => ({ ...s, agreedOvers: Math.max(1, s.agreedOvers - 1) }))}
              className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 text-lg font-black text-white flex items-center justify-center"
            >
              −
            </button>
            <span className="flex-1 text-center text-2xl font-mono font-black text-white">{state.agreedOvers} Overs</span>
            <button
              onClick={() => setState(s => ({ ...s, agreedOvers: s.agreedOvers + 1 }))}
              className="w-10 h-10 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-lg font-black text-[#00ff41] flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Toss Winner Selector */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Toss Winner</label>
          <div className="grid grid-cols-2 gap-3">
            {[teamA, teamB].map((tid) => (
              <button
                key={tid}
                onClick={() => setState(s => ({ ...s, tossWinnerId: tid }))}
                className={`py-4 rounded-2xl font-black text-xs uppercase border transition-all text-center ${
                  state.tossWinnerId === tid 
                    ? 'bg-[#00ff41]/15 border-[#00ff41]/40 text-[#00ff41]' 
                    : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white'
                }`}
              >
                {getTeamName(tid)}
              </button>
            ))}
          </div>
        </div>

        {/* Toss Election Selector */}
        {state.tossWinnerId && (
          <div className="flex flex-col gap-3 animate-[slideUp_0.2s_ease-out_forwards]">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              {getTeamName(state.tossWinnerId)} Elected To:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['BAT', 'BOWL'] as const).map((choice) => (
                <button
                  key={choice}
                  onClick={() => setState(s => ({ ...s, tossElectedTo: choice }))}
                  className={`py-4 rounded-2xl font-black text-xs uppercase border transition-all text-center ${
                    state.tossElectedTo === choice 
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-500' 
                      : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {choice === 'BAT' ? '🏏 BAT' : '⚾ BOWL'}
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && <p className="text-red-400 text-xs font-bold text-center">{errorMsg}</p>}

        <button
          onClick={handleConfirmSetup}
          disabled={!state.tossWinnerId || !state.tossElectedTo || loading}
          className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-95 transition-all shadow-xl shadow-[#00ff41]/5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Setup & Openers'}
        </button>
      </div>
    );
  };

  // ─── Play Board Component ──────────────────────────────────────────────────
  const renderPlayBoard = () => {
    const isInn1 = state.currentInningsNumber === 1;
    const currInnings = isInn1 ? state.innings1 : state.innings2;
    if (!currInnings) return null;

    const striker = currInnings.battingStats[currInnings.currentStrikerId || ''];
    const nonStriker = currInnings.battingStats[currInnings.currentNonStrikerId || ''];
    const bowler = currInnings.bowlingStats[currInnings.currentBowlerId || ''];

    const oversStr = `${Math.floor(currInnings.legalBallsBowled / 6)}.${currInnings.legalBallsBowled % 6}`;

    // Target chasing banner details
    const isChasing = !isInn1 && state.innings1;
    const targetVal = isChasing && state.innings1 ? state.innings1.totalRuns + 1 : 0;
    const runsNeeded = isChasing ? targetVal - currInnings.totalRuns : 0;
    const ballsRemaining = isChasing ? (state.agreedOvers * 6) - currInnings.legalBallsBowled : 0;

    // Run Rates calculation
    const oversCount = currInnings.legalBallsBowled / 6;
    const crr = oversCount > 0 ? (currInnings.totalRuns / oversCount).toFixed(2) : '0.00';
    const rrr = isChasing && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';

    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        
        {/* Premium Digital Scoreboard */}
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-5 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-red-500 via-yellow-400 to-[#00ff41]" />
          
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">
            <span>Innings {state.currentInningsNumber}</span>
            <span className="text-[#00ff41] animate-pulse">● LIVE SCOREBOARD</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <h1 className="text-xl font-black text-white uppercase tracking-wider">
              {getTeamName(currInnings.battingTeamId)}
            </h1>
            <p className="text-5xl font-black text-[#00ff41] font-mono tracking-tighter mt-2 filter drop-shadow-[0_0_10px_rgba(0,255,65,0.25)]">
              {currInnings.totalRuns} <span className="text-2xl text-neutral-500 font-bold">/ {currInnings.totalWickets}</span>
            </p>
            <p className="text-xs text-neutral-400 font-black tracking-widest uppercase mt-1">
              Overs: {oversStr} <span className="text-[10px] text-neutral-600 font-bold">({state.agreedOvers} Max)</span>
            </p>
          </div>

          {/* CRR / RRR Target Banner */}
          <div className="mt-4 bg-black/40 border border-white/5 rounded-2xl p-3 flex justify-around items-center text-xs">
            <div className="text-center">
              <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">CRR</p>
              <p className="font-mono text-base font-black text-white mt-0.5">{crr}</p>
            </div>
            
            {isChasing && (
              <>
                <div className="w-px h-6 bg-white/5" />
                <div className="text-center">
                  <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Target</p>
                  <p className="font-mono text-base font-black text-amber-400 mt-0.5">{targetVal}</p>
                </div>
                <div className="w-px h-6 bg-white/5" />
                <div className="text-center">
                  <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">Need / Balls</p>
                  <p className="font-mono text-base font-black text-white mt-0.5">{runsNeeded} <span className="text-[10px] text-neutral-500">({ballsRemaining}b)</span></p>
                </div>
                <div className="w-px h-6 bg-white/5" />
                <div className="text-center">
                  <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">RRR</p>
                  <p className="font-mono text-base font-black text-red-400 mt-0.5">{rrr}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Current Batsmen Section */}
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">
            <span>🏏 Batsmen</span>
            <span>R (B) | 4s · 6s | SR</span>
          </div>

          {/* Striker Row */}
          {currInnings.currentStrikerId && striker && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full shrink-0 animate-pulse" />
                <span className="font-black text-white truncate max-w-[140px]">
                  {getPlayerName(currInnings.battingTeamId, currInnings.currentStrikerId)}
                </span>
              </div>
              <div className="font-mono flex items-center gap-2">
                <span className="font-black text-white">{striker.runs}</span>
                <span className="text-neutral-500">({striker.balls})</span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-400">{striker.fours} · {striker.sixes}</span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-400 font-bold">
                  {striker.runs > 0 && striker.balls > 0 ? ((striker.runs / striker.balls) * 100).toFixed(0) : '0'}%
                </span>
              </div>
            </div>
          )}

          {/* Non-Striker Row */}
          {currInnings.currentNonStrikerId && nonStriker && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full shrink-0" />
                <span className="font-bold text-neutral-400 truncate max-w-[140px]">
                  {getPlayerName(currInnings.battingTeamId, currInnings.currentNonStrikerId)}
                </span>
              </div>
              <div className="font-mono flex items-center gap-2">
                <span className="font-bold text-neutral-400">{nonStriker.runs}</span>
                <span className="text-neutral-600">({nonStriker.balls})</span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-600">{nonStriker.fours} · {nonStriker.sixes}</span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-600">
                  {nonStriker.runs > 0 && nonStriker.balls > 0 ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(0) : '0'}%
                </span>
              </div>
            </div>
          )}

          {/* Manual Switch button */}
          <button
            onClick={async () => {
              const temp = currInnings.currentStrikerId;
              const nextState: CricketState = {
                ...state,
                history: getHistoryWithSnapshot(state),
                innings1: isInn1 ? {
                  ...currInnings,
                  currentStrikerId: currInnings.currentNonStrikerId,
                  currentNonStrikerId: temp
                } : state.innings1,
                innings2: !isInn1 ? {
                  ...currInnings,
                  currentStrikerId: currInnings.currentNonStrikerId,
                  currentNonStrikerId: temp
                } : state.innings2
              };
              await updateStateAndSync(nextState, {
                type: 'batsmen_swapped',
                description: 'Batsmen swapped ends'
              });
            }}
            className="w-full mt-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] uppercase tracking-widest font-black py-2 rounded-xl transition-all text-neutral-300"
          >
            🔄 Swap Striker End
          </button>
        </div>

        {/* Current Bowler and Over Timeline */}
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">
            <span>⚾ Active Bowler</span>
            <span>O · R · W | Econ</span>
          </div>

          {currInnings.currentBowlerId && bowler && (
            <div className="flex items-center justify-between text-xs py-1">
              <span className="font-black text-white">
                {getPlayerName(currInnings.bowlingTeamId, currInnings.currentBowlerId)}
              </span>
              <div className="font-mono flex items-center gap-2">
                <span className="font-black text-white">{Math.floor(bowler.balls / 6)}.{bowler.balls % 6}</span>
                <span className="text-neutral-500">ov</span>
                <span className="text-neutral-600">·</span>
                <span className="font-black text-white">{bowler.runs}</span>
                <span className="text-neutral-500">r</span>
                <span className="text-neutral-600">·</span>
                <span className="font-black text-red-400">{bowler.wickets}</span>
                <span className="text-neutral-500">w</span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-400 font-bold">
                  {bowler.balls > 0 ? ((bowler.runs / bowler.balls) * 6).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          )}

          {/* Current Over dots display */}
          <div className="bg-black/35 rounded-2xl p-3 border border-white/5 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mr-1">Over {currInnings.currentOverNumber}:</span>
            {currInnings.ballsInCurrentOver.map((d, idx) => {
              let dotLabel = String(d.runs);
              let dotColorCls = 'bg-neutral-800 text-neutral-400 border-transparent';
              
              if (d.wicket) {
                dotLabel = 'W';
                dotColorCls = 'bg-red-500/20 text-red-400 border-red-500/30';
              } else if (d.type === 'WIDE') {
                dotLabel = `Wd${d.runs > 1 ? d.runs : ''}`;
                dotColorCls = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
              } else if (d.type === 'NO_BALL') {
                dotLabel = `Nb${d.runs > 1 ? d.runs - 1 : ''}`;
                dotColorCls = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
              } else if (d.runs === 4) {
                dotColorCls = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
              } else if (d.runs === 6) {
                dotColorCls = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              } else if (d.runs === 0) {
                dotLabel = '•';
              }

              return (
                <div key={idx} className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-md ${dotColorCls}`}>
                  {dotLabel}
                </div>
              );
            })}
            {currInnings.ballsInCurrentOver.length === 0 && (
              <span className="text-[10px] text-neutral-600 italic">No balls in this over yet</span>
            )}
          </div>
        </div>

        {/* Live scoring controller buttons grid */}
        <div className="flex flex-col gap-3">
          {extraModifier !== 'NORMAL' && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3 text-center text-xs font-black text-purple-400 animate-pulse flex items-center justify-between gap-2">
              <span>⚠️ SELECT ADDITIONAL RUNS FOR THE {extraModifier === 'WIDE' ? 'WIDE' : 'NO BALL'} BELOW</span>
              <button 
                onClick={() => setExtraModifier('NORMAL')}
                className="text-[10px] bg-purple-500/20 px-2 py-1 rounded-lg border border-purple-500/30 hover:bg-purple-500/40 text-purple-200 uppercase font-black tracking-widest shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Record Ball</h3>
          
          {/* Main runs grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { runs: 0, label: '0 (Dot)', icon: '⚪' },
              { runs: 1, label: '+1 Run', icon: '🏏' },
              { runs: 2, label: '+2 Runs', icon: '🏃' },
              { runs: 3, label: '+3 Runs', icon: '⚡' },
              { runs: 4, label: '4 (Four)', icon: '🟦' },
              { runs: 6, label: '6 (Six)', icon: '🟨' }
            ].map(b => {
              let displayLabel = b.label;
              let btnClass = 'bg-neutral-900 border border-white/10 hover:border-[#00ff41]/50 text-white hover:bg-[#00ff41]/[0.02]';
              if (extraModifier === 'WIDE') {
                displayLabel = b.runs === 0 ? 'Wd' : `Wd + ${b.runs}`;
                btnClass = 'bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:bg-purple-500/[0.04]';
              } else if (extraModifier === 'NO_BALL') {
                displayLabel = b.runs === 0 ? 'Nb' : `Nb + ${b.runs}`;
                btnClass = 'bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:bg-purple-500/[0.04]';
              }

              return (
                <button
                  key={b.runs}
                  onClick={() => {
                    if (extraModifier === 'WIDE') {
                      handleScoreBall(b.runs, 'WIDE');
                      setExtraModifier('NORMAL');
                    } else if (extraModifier === 'NO_BALL') {
                      handleScoreBall(b.runs, 'NO_BALL');
                      setExtraModifier('NORMAL');
                    } else {
                      handleScoreBall(b.runs, 'LEGAL');
                    }
                  }}
                  className={`${btnClass} p-4 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md flex flex-col items-center gap-1.5`}
                >
                  <span className="text-lg">{b.icon}</span>
                  <span>{displayLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Wicket, Extras, and Undo Controls */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => {
                setExtraModifier('NORMAL');
                handleOpenWicketFlow('STRIKER');
              }}
              className="bg-neutral-900 border border-white/10 hover:border-red-500/50 p-4.5 rounded-2xl font-black text-xs uppercase tracking-wider text-red-400 hover:bg-red-500/[0.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              🔴 Wicket (Out)
            </button>
            <button
              onClick={() => setExtraModifier(prev => prev === 'WIDE' ? 'NORMAL' : 'WIDE')}
              className={`p-4.5 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 border ${
                extraModifier === 'WIDE'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/20'
                  : 'bg-neutral-900 border-white/10 hover:border-purple-500/50 text-purple-400 hover:bg-purple-500/[0.02]'
              }`}
            >
              ⚾ Wide (+1 Ex)
            </button>
            <button
              onClick={() => setExtraModifier(prev => prev === 'NO_BALL' ? 'NORMAL' : 'NO_BALL')}
              className={`p-4.5 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 border ${
                extraModifier === 'NO_BALL'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/20'
                  : 'bg-neutral-900 border-white/10 hover:border-purple-500/50 text-purple-400 hover:bg-purple-500/[0.02]'
              }`}
            >
              ✨ No Ball (+1 Ex)
            </button>
            <button
              onClick={() => {
                setExtraModifier('NORMAL');
                const rStr = prompt("Enter leg-bye runs (e.g. 1, 2, 4):");
                if (rStr && !isNaN(Number(rStr))) {
                  handleScoreBall(Number(rStr), 'LEGAL', true);
                }
              }}
              className="bg-neutral-900 border border-white/10 hover:border-blue-500/50 p-4.5 rounded-2xl font-black text-xs uppercase tracking-wider text-blue-400 hover:bg-blue-500/[0.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              🏃 Leg Byes / Byes
            </button>
          </div>

          {/* Undo Action bar */}
          {state.history && state.history.length > 0 && (
            <button
              onClick={handleUndo}
              className="w-full mt-2 bg-neutral-950/80 border border-white/5 hover:bg-red-500/5 hover:border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={13} /> Undo Last Ball
            </button>
          )}

          {/* Forfeit Match button */}
          <button
            onClick={() => setState(s => ({ ...s, stage: 'FORFEIT_FLOW' as any }))}
            className="w-full mt-2 bg-neutral-950/80 border border-white/5 hover:bg-amber-500/5 hover:border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5"
          >
            🏳️ Forfeit Match
          </button>
        </div>
      </div>
    );
  };

  // Innings Complete view
  const renderInningsCompleteView = () => {
    const isInn1 = state.currentInningsNumber === 1;
    const currInnings = isInn1 ? state.innings1 : state.innings2;
    if (!currInnings) return null;

    const isMatchDraw = !isInn1 && state.innings1 && state.innings1.totalRuns === state.innings2?.totalRuns;

    return (
      <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
          <Trophy size={32} />
        </div>
        
        <div>
          <h2 className="text-xl font-black text-white">Innings {state.currentInningsNumber} Complete</h2>
          <p className="text-3xl font-black text-[#00ff41] mt-3 font-mono tracking-tighter">
            {currInnings.totalRuns} <span className="text-lg text-neutral-500">/ {currInnings.totalWickets}</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-black">
            Overs bowled: {Math.floor(currInnings.legalBallsBowled / 6)}.{currInnings.legalBallsBowled % 6}
          </p>
        </div>

        {isInn1 ? (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-xs text-neutral-400">
              <span className="font-black text-white uppercase tracking-wider block mb-1">Target for Chasing team</span>
              <p className="text-2xl font-black text-amber-400 font-mono">{currInnings.totalRuns + 1} Runs</p>
              <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">
                Required Run Rate: {(((currInnings.totalRuns + 1) / state.agreedOvers)).toFixed(2)} RPO
              </p>
            </div>
            
            <button
              onClick={() => setState(s => ({ ...s, stage: 'INNINGS2_SETUP', currentInningsNumber: 2 }))}
              className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-95 transition-all text-sm"
            >
              ⚾ Setup Innings 2 (Chase)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-xs">
              <p className="font-black text-white text-lg">
                {isMatchDraw 
                  ? '🤝 Match Ended in a Draw!' 
                  : runsScoredWinTeam()
                }
              </p>
            </div>
            
            <button
              onClick={() => setState(s => ({ ...s, stage: 'MATCH_COMPLETE' }))}
              className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-95 transition-all text-sm"
            >
              🏆 View Scorecard &amp; Finalize
            </button>
          </div>
        )}
      </div>
    );
  };

  const runsScoredWinTeam = () => {
    if (!state.innings1 || !state.innings2) return '';
    const runs1 = state.innings1.totalRuns;
    const runs2 = state.innings2.totalRuns;

    if (runs1 > runs2) {
      return `🏆 ${getTeamName(match.teamAId)} won by ${runs1 - runs2} runs!`;
    } else {
      const wicketsLeft = 10 - state.innings2.totalWickets;
      return `🏆 ${getTeamName(match.teamBId)} won by ${wicketsLeft} wickets!`;
    }
  };

  // Match complete scorecard view
  const renderMatchCompleteView = () => {
    if (!state.innings1) return null;

    return (
      <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative">
        <h2 className="text-sm font-black uppercase tracking-widest text-[#00ff41] border-b border-white/5 pb-3 text-center">
          🏆 Match Completed Scorecard
        </h2>

        {/* Innings 1 scorecard summary */}
        <div className="bg-black/35 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
            Innings 1: {getTeamName(state.innings1.battingTeamId)}
          </p>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-white">
              {state.innings1.totalRuns} <span className="text-sm text-neutral-500">/ {state.innings1.totalWickets}</span>
            </span>
            <span className="text-xs text-neutral-400 font-bold">
              ({Math.floor(state.innings1.legalBallsBowled / 6)}.{state.innings1.legalBallsBowled % 6} ov)
            </span>
          </div>
        </div>

        {/* Innings 2 scorecard summary */}
        {state.innings2 && (
          <div className="bg-black/35 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
              Innings 2: {getTeamName(state.innings2.battingTeamId)}
            </p>
            <div className="flex justify-between items-baseline">
              <span className="text-xl font-black text-white">
                {state.innings2.totalRuns} <span className="text-sm text-neutral-500">/ {state.innings2.totalWickets}</span>
              </span>
              <span className="text-xs text-neutral-400 font-bold">
                ({Math.floor(state.innings2.legalBallsBowled / 6)}.{state.innings2.legalBallsBowled % 6} ov)
              </span>
            </div>
          </div>
        )}

        {getForfeitDetails() ? (
          (() => {
            const forfeit = getForfeitDetails()!;
            return (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center text-xs font-bold text-amber-500 animate-[fadeIn_0.3s_ease-out]">
                🏳️ Match Forfeited by {forfeit.forfeitedTeamName}
                <p className="text-[10px] text-neutral-400 mt-1 uppercase font-black">Winner: {forfeit.winnerTeamName}</p>
                <p className="text-[10px] text-neutral-500 italic mt-1 font-semibold">Reason: "{forfeit.reason}"</p>
              </div>
            );
          })()
        ) : (
          <div className="p-4 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-2xl text-center text-xs font-bold text-[#00ff41]">
            🎉 Result: {runsScoredWinTeam()}
          </div>
        )}

        {errorMsg && <p className="text-red-400 text-xs font-bold text-center">{errorMsg}</p>}

        <button
          onClick={handleFinalizeMatch}
          disabled={loading}
          className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-95 transition-all shadow-xl shadow-[#00ff41]/5 text-sm flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Complete &amp; Save Standings'}
        </button>
      </div>
    );
  };

  // ─── Main Render Router ─────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col gap-6">
      {state.stage === 'SETUP' && renderSetupView()}
      {state.stage === 'INNINGS1_SETUP' && (
        <InningsSetupView
          inningsNumber={1}
          tossWinnerId={state.tossWinnerId}
          tossElectedTo={state.tossElectedTo}
          teamAId={match.teamAId}
          teamBId={match.teamBId}
          getRoster={getRoster}
          getTeamName={getTeamName}
          handleStartInnings1={handleStartInnings1}
          handleStartInnings2={handleStartInnings2}
          loading={loading}
        />
      )}
      {state.stage === 'PLAYING' && renderPlayBoard()}
      {state.stage === ('FORFEIT_FLOW' as any) && (
        <ForfeitFlowView
          teamAId={match.teamAId}
          teamBId={match.teamBId}
          getTeamName={getTeamName}
          innings1={state.innings1}
          innings2={state.innings2}
          onCancel={() => setState(s => ({ ...s, stage: 'PLAYING' }))}
          onConfirm={handleForfeitSubmit}
          loading={loading}
        />
      )}
      {state.stage === 'WICKET_FLOW' && state.wicketSelector && (
        <WicketFlowView
          currentInningsNumber={state.currentInningsNumber}
          innings1={state.innings1}
          innings2={state.innings2}
          wicketSelector={state.wicketSelector}
          getRoster={getRoster}
          getPlayerName={getPlayerName}
          handleLogWicket={handleLogWicket}
          setState={setState}
          loading={loading}
        />
      )}
      {state.stage === 'OVER_COMPLETE' && (
        <OverCompleteView
          currentInningsNumber={state.currentInningsNumber}
          innings1={state.innings1}
          innings2={state.innings2}
          getRoster={getRoster}
          handleConfirmNewBowler={handleConfirmNewBowler}
          loading={loading}
        />
      )}
      {state.stage === 'INNINGS_COMPLETE' && renderInningsCompleteView()}
      {state.stage === 'INNINGS2_SETUP' && (
        <InningsSetupView
          inningsNumber={2}
          tossWinnerId={state.tossWinnerId}
          tossElectedTo={state.tossElectedTo}
          teamAId={match.teamAId}
          teamBId={match.teamBId}
          getRoster={getRoster}
          getTeamName={getTeamName}
          handleStartInnings1={handleStartInnings1}
          handleStartInnings2={handleStartInnings2}
          loading={loading}
        />
      )}
      {state.stage === 'MATCH_COMPLETE' && renderMatchCompleteView()}
    </div>
  );
}

// ─── Standalone React Sub-components (Fixes Rules of Hooks) ────────────────

interface InningsSetupViewProps {
  inningsNumber: 1 | 2;
  tossWinnerId: string | null;
  tossElectedTo: 'BAT' | 'BOWL' | null;
  teamAId: string;
  teamBId: string;
  getRoster: (teamId: string) => any[];
  getTeamName: (teamId: string) => string;
  handleStartInnings1: (strikerId: string, nonStrikerId: string, bowlerId: string) => Promise<void>;
  handleStartInnings2: (strikerId: string, nonStrikerId: string, bowlerId: string) => Promise<void>;
  loading: boolean;
}

function InningsSetupView({
  inningsNumber,
  tossWinnerId,
  tossElectedTo,
  teamAId,
  teamBId,
  getRoster,
  getTeamName,
  handleStartInnings1,
  handleStartInnings2,
  loading
}: InningsSetupViewProps) {
  const isBat1A = tossWinnerId === teamAId 
    ? tossElectedTo === 'BAT' 
    : tossElectedTo === 'BOWL';
  
  let battingTeamId = isBat1A ? teamAId : teamBId;
  let bowlingTeamId = isBat1A ? teamBId : teamAId;

  if (inningsNumber === 2) {
    battingTeamId = isBat1A ? teamBId : teamAId;
    bowlingTeamId = isBat1A ? teamAId : teamBId;
  }

  const bSquad = getRoster(battingTeamId);
  const bowlSquad = getRoster(bowlingTeamId);

  // Striker, Non-Striker and Bowler state hooks
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirmSetup = async () => {
    if (!striker || !nonStriker || !bowler) {
      setErrorMsg('Please select Striker, Non-Striker, and Bowler');
      return;
    }
    if (striker === nonStriker) {
      setErrorMsg('Striker and Non-Striker must be different players');
      return;
    }
    
    setErrorMsg('');
    if (inningsNumber === 1) {
      await handleStartInnings1(striker, nonStriker, bowler);
    } else {
      await handleStartInnings2(striker, nonStriker, bowler);
    }
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative">
      <h2 className="text-sm font-black uppercase tracking-widest text-[#00ff41] border-b border-white/5 pb-3">
        🏏 Setup Innings {inningsNumber} Openers
      </h2>

      {/* Batting Team setup */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-black uppercase text-neutral-400">
          Batting: {getTeamName(battingTeamId)}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Striker Select */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-500">Striker (Pos 1)</label>
            <select
              value={striker}
              onChange={e => setStriker(e.target.value)}
              className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
            >
              <option value="">Select Striker</option>
              {bSquad.map((p: any) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>

          {/* Non-Striker Select */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-500">Non-Striker (Pos 2)</label>
            <select
              value={nonStriker}
              onChange={e => setNonStriker(e.target.value)}
              className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
            >
              <option value="">Select Non-Striker</option>
              {bSquad.map((p: any) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bowling Team setup */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-black uppercase text-neutral-400">
          Bowling: {getTeamName(bowlingTeamId)}
        </h3>
        
        <label className="text-[10px] font-black uppercase text-neutral-500">Opening Bowler</label>
        <select
          value={bowler}
          onChange={e => setBowler(e.target.value)}
          className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
        >
          <option value="">Select Bowler</option>
          {bowlSquad.map((p: any) => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
        </select>
      </div>

      {errorMsg && <p className="text-red-400 text-xs font-bold text-center">{errorMsg}</p>}

      <button
        onClick={handleConfirmSetup}
        disabled={!striker || !nonStriker || !bowler || loading}
        className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-95 transition-all shadow-xl shadow-[#00ff41]/5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : '🏏 Start Innings'}
      </button>
    </div>
  );
}

interface WicketFlowViewProps {
  currentInningsNumber: 1 | 2;
  innings1: InningsData | null;
  innings2: InningsData | null;
  wicketSelector: {
    strikerOrNonStriker: 'STRIKER' | 'NON_STRIKER';
    dismissalType: string;
    fielderId?: string;
  };
  getRoster: (teamId: string) => any[];
  getPlayerName: (teamId: string, playerId: string) => string;
  handleLogWicket: (nextBatsmanId: string) => Promise<void>;
  setState: React.Dispatch<React.SetStateAction<CricketState>>;
  loading: boolean;
}

function WicketFlowView({
  currentInningsNumber,
  innings1,
  innings2,
  wicketSelector,
  getRoster,
  getPlayerName,
  handleLogWicket,
  setState,
  loading
}: WicketFlowViewProps) {
  const isInn1 = currentInningsNumber === 1;
  const currInnings = isInn1 ? innings1 : innings2;
  if (!currInnings) return null;

  const bSquad = getRoster(currInnings.battingTeamId);
  const bowlSquad = getRoster(currInnings.bowlingTeamId);

  // List remaining batsmen who haven't batted yet
  const remainingBatsmen = bSquad.filter(
    (p: any) => p.id !== currInnings.currentStrikerId && 
         p.id !== currInnings.currentNonStrikerId &&
         !currInnings.battingStats[p.id]?.hasBatted
  );

  const [nextBatsmanId, setNextBatsmanId] = useState('');
  const [dType, setDType] = useState(wicketSelector.dismissalType);
  const [fielderId, setFielderId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const outPlayerName = getPlayerName(
    currInnings.battingTeamId,
    wicketSelector.strikerOrNonStriker === 'STRIKER' ? currInnings.currentStrikerId! : currInnings.currentNonStrikerId!
  );

  const totalSquadCount = bSquad.length;
  // We check if this is the final wicket (all out)
  const isLastWicket = currInnings.totalWickets >= 10 || currInnings.totalWickets >= totalSquadCount - 2;

  const handleSubmitWicket = () => {
    if (!isLastWicket && !nextBatsmanId) {
      setErrorMsg('Please select the next incoming batsman');
      return;
    }
    
    setErrorMsg('');
    // Save details back to main state trigger
    setState(s => ({
      ...s,
      wicketSelector: {
        ...s.wicketSelector!,
        dismissalType: dType,
        fielderId: fielderId || undefined
      }
    }));

    // Invoke main action logging
    handleLogWicket(nextBatsmanId);
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-red-500">
          🔴 Wicket Out: {outPlayerName}
        </h2>
        <button
          onClick={() => setState(s => ({ ...s, stage: 'PLAYING', wicketSelector: undefined }))}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400"
        >
          <X size={15} />
        </button>
      </div>

      {/* Striker vs Non Striker toggle out */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Who is Out?</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: 'STRIKER', name: getPlayerName(currInnings.battingTeamId, currInnings.currentStrikerId!) },
            { type: 'NON_STRIKER', name: getPlayerName(currInnings.battingTeamId, currInnings.currentNonStrikerId!) }
          ].map(opt => (
            <button
              key={opt.type}
              onClick={() => setState(s => ({
                ...s,
                wicketSelector: { ...s.wicketSelector!, strikerOrNonStriker: opt.type as any }
              }))}
              className={`py-3.5 rounded-xl font-black text-xs uppercase border transition-all text-center ${
                wicketSelector.strikerOrNonStriker === opt.type 
                  ? 'bg-red-500/15 border-red-500/40 text-red-400' 
                  : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dismissal type selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Dismissal Type</label>
        <select
          value={dType}
          onChange={e => setDType(e.target.value)}
          className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
        >
          {['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Fielder select (for catches/run outs) */}
      {['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(dType) && (
        <div className="flex flex-col gap-2 animate-[slideUp_0.15s_ease-out_forwards]">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Fielder Involved</label>
          <select
            value={fielderId}
            onChange={e => setFielderId(e.target.value)}
            className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
          >
            <option value="">Select Fielder (Optional)</option>
            {bowlSquad.map((p: any) => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Next batsman select (if not last wicket) */}
      {!isLastWicket ? (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Next incoming batsman</label>
          {remainingBatsmen.length === 0 ? (
            <p className="text-xs text-red-400 font-bold italic">No other batsmen registered in squad!</p>
          ) : (
            <select
              value={nextBatsmanId}
              onChange={e => setNextBatsmanId(e.target.value)}
              className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
            >
              <option value="">Select Next Batsman</option>
              {remainingBatsmen.map((p: any) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-xs font-bold text-red-400">
          ⚠️ LAST WICKET! Batting team will be all-out upon submission.
        </div>
      )}

      {errorMsg && <p className="text-red-400 text-xs font-bold text-center">{errorMsg}</p>}

      <button
        onClick={handleSubmitWicket}
        disabled={(!isLastWicket && !nextBatsmanId) || loading}
        className="w-full bg-red-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-red-600 active:scale-95 transition-all shadow-xl shadow-red-500/5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Wicket'}
      </button>
    </div>
  );
}

interface OverCompleteViewProps {
  currentInningsNumber: 1 | 2;
  innings1: InningsData | null;
  innings2: InningsData | null;
  getRoster: (teamId: string) => any[];
  handleConfirmNewBowler: (nextBowlerId: string) => Promise<void>;
  loading: boolean;
}

function OverCompleteView({
  currentInningsNumber,
  innings1,
  innings2,
  getRoster,
  handleConfirmNewBowler,
  loading
}: OverCompleteViewProps) {
  const isInn1 = currentInningsNumber === 1;
  const currInnings = isInn1 ? innings1 : innings2;
  if (!currInnings) return null;

  const bowlSquad = getRoster(currInnings.bowlingTeamId);
  const otherBowlers = bowlSquad.filter((p: any) => p.id !== currInnings.currentBowlerId);
  
  const [nextBowlerId, setNextBowlerId] = useState('');

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative text-center">
      <div className="w-16 h-16 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center text-[#00ff41] mx-auto">
        <Award size={32} />
      </div>
      
      <div>
        <h2 className="text-lg font-black text-white">Over {currInnings.currentOverNumber} Complete</h2>
        <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-black">
          Current Innings total: {currInnings.totalRuns}/{currInnings.totalWickets}
        </p>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Select Bowler for Next Over</label>
        <select
          value={nextBowlerId}
          onChange={e => setNextBowlerId(e.target.value)}
          className="bg-neutral-950 border border-white/5 rounded-xl px-3 py-3.5 text-xs text-white outline-none font-bold"
        >
          <option value="">Select Next Bowler</option>
          {otherBowlers.map((p: any) => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
          {/* Fallback to full list if team size is tiny */}
          {otherBowlers.length === 0 && bowlSquad.map((p: any) => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => handleConfirmNewBowler(nextBowlerId)}
        disabled={!nextBowlerId || loading}
        className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-95 transition-all shadow-xl shadow-[#00ff41]/5 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        Confirm Bowler &amp; Start Over
      </button>
    </div>
  );
}

interface ForfeitFlowViewProps {
  teamAId: string;
  teamBId: string;
  getTeamName: (teamId: string) => string;
  innings1: InningsData | null;
  innings2: InningsData | null;
  onCancel: () => void;
  onConfirm: (forfeitedTeamId: string, reason: string) => Promise<void>;
  loading: boolean;
}

function ForfeitFlowView({
  teamAId,
  teamBId,
  getTeamName,
  innings1,
  innings2,
  onCancel,
  onConfirm,
  loading
}: ForfeitFlowViewProps) {
  const [forfeitingTeamId, setForfeitingTeamId] = useState('');
  const [presetReason, setPresetReason] = useState('Injuries / Short of players');
  const [customReason, setCustomReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const reasons = [
    'Injuries / Short of players',
    'Left the ground',
    'Unsportsmanlike conduct',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!forfeitingTeamId) {
      setErrorMsg('Please select the forfeiting team');
      return;
    }
    const finalReason = presetReason === 'Other' ? customReason.trim() : presetReason;
    if (!finalReason) {
      setErrorMsg('Please provide a forfeit reason');
      return;
    }
    setErrorMsg('');
    await onConfirm(forfeitingTeamId, finalReason);
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
          🏳️ Forfeit Match
        </h2>
        <button
          onClick={onCancel}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400"
        >
          <X size={15} />
        </button>
      </div>

      {/* Current Score Progress */}
      <div className="bg-black/35 rounded-2xl p-4 border border-white/5 flex flex-col gap-2.5">
        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Current Score Summary</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-neutral-400 truncate">{getTeamName(teamAId)}</span>
            {innings1 ? (
              <span className="text-lg font-black text-white font-mono">
                {innings1.battingTeamId === teamAId ? innings1.totalRuns : (innings2?.totalRuns ?? 0)}
                <span className="text-xs text-neutral-500 font-normal"> / {innings1.battingTeamId === teamAId ? innings1.totalWickets : (innings2?.totalWickets ?? 0)}</span>
              </span>
            ) : (
              <span className="text-xs text-neutral-500 font-bold italic">Yet to bat</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-neutral-400 truncate">{getTeamName(teamBId)}</span>
            {innings1 ? (
              <span className="text-lg font-black text-white font-mono">
                {innings1.battingTeamId === teamBId ? innings1.totalRuns : (innings2?.totalRuns ?? 0)}
                <span className="text-xs text-neutral-500 font-normal"> / {innings1.battingTeamId === teamBId ? innings1.totalWickets : (innings2?.totalWickets ?? 0)}</span>
              </span>
            ) : (
              <span className="text-xs text-neutral-500 font-bold italic">Yet to bat</span>
            )}
          </div>
        </div>
      </div>

      {/* Team Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Who is Forfeiting?</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: teamAId, name: getTeamName(teamAId) },
            { id: teamBId, name: getTeamName(teamBId) }
          ].map(team => (
            <button
              key={team.id}
              onClick={() => {
                setForfeitingTeamId(team.id);
                setErrorMsg('');
              }}
              className={`py-3.5 px-3 rounded-xl font-black text-xs uppercase border transition-all text-center truncate ${
                forfeitingTeamId === team.id 
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-md shadow-amber-500/5' 
                  : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {/* Reason Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Reason for Forfeit</label>
        <div className="flex flex-col gap-2">
          {reasons.map(reasonOption => (
            <button
              key={reasonOption}
              onClick={() => {
                setPresetReason(reasonOption);
                setErrorMsg('');
              }}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all text-left border ${
                presetReason === reasonOption 
                  ? 'bg-amber-500/10 border-amber-500/30 text-white' 
                  : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              {reasonOption}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Reason Input */}
      {presetReason === 'Other' && (
        <div className="flex flex-col gap-2 animate-[slideUp_0.15s_ease-out_forwards]">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Custom Reason</label>
          <input
            type="text"
            placeholder="Type reason here..."
            value={customReason}
            onChange={e => {
              setCustomReason(e.target.value);
              setErrorMsg('');
            }}
            className="bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-600 outline-none font-bold focus:border-amber-500/50 transition-all"
          />
        </div>
      )}

      {errorMsg && <p className="text-red-400 text-xs font-bold text-center">{errorMsg}</p>}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full py-3.5 rounded-xl border border-white/10 text-neutral-400 font-bold uppercase tracking-wider hover:bg-white/5 active:scale-95 transition-all text-xs"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-amber-500 text-black font-black uppercase tracking-wider py-3.5 rounded-xl hover:bg-amber-600 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Forfeit'}
        </button>
      </div>
    </div>
  );
}

