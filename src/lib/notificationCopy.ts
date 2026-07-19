export interface NotificationCopy {
  title: { en: string; bn: string };
  body: { en: string; bn: string };
}

export const NOTIFICATION_EVENTS: Record<string, (params: Record<string, string>) => NotificationCopy> = {
  team_invite_received: (p) => ({
    title: { en: 'Squad Invitation', bn: 'স্কোয়াড আমন্ত্রণ' },
    body: {
      en: `🟢 ${p.teamName} invited you to join their squad`,
      bn: `🟢 ${p.teamName} আপনাকে তাদের স্কোয়াডে যোগদানের জন্য আমন্ত্রণ জানিয়েছে`
    }
  }),
  team_join_request: (p) => ({
    title: { en: 'Join Request', bn: 'যোগদানের অনুরোধ' },
    body: {
      en: `👤 ${p.playerName} wants to join ${p.teamName}`,
      bn: `👤 ${p.playerName} ${p.teamName} স্কোয়াডে যোগ দিতে চায়`
    }
  }),
  team_member_joined: (p) => ({
    title: { en: 'New Member Joined', bn: 'নতুন সদস্য যোগ দিয়েছেন' },
    body: {
      en: `✅ ${p.playerName} joined your squad`,
      bn: `✅ ${p.playerName} আপনার স্কোয়াডে যোগ দিয়েছেন`
    }
  }),
  challenge_received: (p) => ({
    title: { en: 'New Challenge ⚔️', bn: 'নতুন চ্যালেঞ্জ ⚔️' },
    body: {
      en: `⚔️ ${p.teamName} challenged you!`,
      bn: `⚔️ ${p.teamName} আপনাকে চ্যালেঞ্জ করেছে!`
    }
  }),
  challenge_accepted: (p) => ({
    title: { en: 'Challenge Accepted!', bn: 'চ্যালেঞ্জ গৃহীত!' },
    body: {
      en: `✅ ${p.teamName} accepted your challenge!`,
      bn: `✅ ${p.teamName} আপনার চ্যালেঞ্জ গ্রহণ করেছে!`
    }
  }),
  open_challenge_accepted: (p) => ({
    title: { en: 'Open Challenge Accepted', bn: 'ওপেন চ্যালেঞ্জ গৃহীত' },
    body: {
      en: `⚔️ ${p.teamName} picked up your open challenge!`,
      bn: `⚔️ ${p.teamName} আপনার ওপেন চ্যালেঞ্জটি গ্রহণ করেছে!`
    }
  }),
  match_started_confirmation: (p) => ({
    title: { en: 'Confirm Match Kickoff 🎮', bn: 'ম্যাচ কিকঅফ নিশ্চিত করুন 🎮' },
    body: {
      en: `🎮 ${p.teamName} started the match — confirm to begin scoring`,
      bn: `🎮 ${p.teamName} ম্যাচটি শুরু করেছে — স্কোরিং শুরু করতে নিশ্চিত করুন`
    }
  }),
  match_result_confirmation: (p) => ({
    title: { en: 'Confirm Final Score 📊', bn: 'চূড়ান্ত স্কোর নিশ্চিত করুন 📊' },
    body: {
      en: '📊 Confirm the final score',
      bn: '📊 চূড়ান্ত স্কোরটি নিশ্চিত করুন'
    }
  }),
  booking_confirmed: (p) => ({
    title: { en: 'Booking Confirmed 🏟️', bn: 'বুকিং নিশ্চিত 🏟️' },
    body: {
      en: `🏟️ Booking confirmed: ${p.turfName}, ${p.dateTime}`,
      bn: `🏟️ বুকিং নিশ্চিত হয়েছে: ${p.turfName}, ${p.dateTime}`
    }
  }),
  booking_received: (p) => ({
    title: { en: 'New Booking Received 📅', bn: 'নতুন বুকিং প্রাপ্তি 📅' },
    body: {
      en: `📅 New booking at ${p.turfName}: ${p.dateTime}`,
      bn: `📅 ${p.turfName}-এ নতুন বুকিং: ${p.dateTime}`
    }
  }),
  booking_cancelled: (p) => ({
    title: { en: 'Booking Cancelled', bn: 'বুকিং বাতিল' },
    body: {
      en: `❌ Booking cancelled: ${p.turfName}, ${p.dateTime}`,
      bn: `❌ বুকিং বাতিল হয়েছে: ${p.turfName}, ${p.dateTime}`
    }
  }),
  coach_request_received: (p) => ({
    title: { en: 'New Session Request 📩', bn: 'নতুন সেশন অনুরোধ 📩' },
    body: {
      en: `📩 New session request from ${p.playerName}`,
      bn: `📩 ${p.playerName}-এর কাছ থেকে নতুন সেশন অনুরোধ`
    }
  }),
  coach_request_answered: (p) => ({
    title: { en: 'Session Request Answered', bn: 'সেশন অনুরোধের উত্তর' },
    body: {
      en: `${p.status === 'accepted' ? '✅' : '❌'} ${p.coachName} ${p.status === 'accepted' ? 'accepted' : 'declined'} your request`,
      bn: `${p.status === 'accepted' ? '✅' : '❌'} ${p.coachName} আপনার অনুরোধ ${p.status === 'accepted' ? 'গৃহীত' : 'প্রত্যাখ্যান'} করেছে`
    }
  }),
  interaction_message: () => ({
    title: { en: 'New Message', bn: 'নতুন বার্তা' },
    body: {
      en: '💬 New message on Interaction Board',
      bn: '💬 ইন্টারঅ্যাকশন বোর্ডে নতুন বার্তা'
    }
  }),
  friend_message: (p) => ({
    title: { en: 'New Message', bn: 'নতুন বার্তা' },
    body: {
      en: `💬 ${p.friendName} sent you a message`,
      bn: `💬 ${p.friendName} আপনাকে একটি বার্তা পাঠিয়েছেন`
    }
  }),
  challenge_reminder: (p) => ({
    title: { en: 'Match Setup Reminder ⏰', bn: 'ম্যাচ সেটআপ রিমাইন্ডার ⏰' },
    body: {
      en: `⏰ ${p.teamName} is waiting for you to set up the match`,
      bn: `⏰ ${p.teamName} আপনার জন্য ম্যাচটি সেটআপ করার অপেক্ষা করছে`
    }
  }),
  match_confirmed: (p) => ({
    title: { en: 'Match Confirmed ⚔️', bn: 'ম্যাচ নিশ্চিত হয়েছে ⚔️' },
    body: {
      en: `⚔️ Match set: ${p.teamAName} vs ${p.teamBName} · ${p.dateTime} · ${p.turfName}`,
      bn: `⚔️ ম্যাচ নির্ধারিত হয়েছে: ${p.teamAName} বনাম ${p.teamBName} · ${p.dateTime} · ${p.turfName}`
    }
  }),
  match_updated: (p) => ({
    title: { en: 'Match Details Updated 📝', bn: 'ম্যাচ বিবরণ আপডেট করা হয়েছে 📝' },
    body: {
      en: `📝 Match details updated: ${p.teamAName} vs ${p.teamBName} · ${p.dateTime} · ${p.turfName}`,
      bn: `📝 ম্যাচের বিবরণ আপডেট করা হয়েছে: ${p.teamAName} বনাম ${p.teamBName} · ${p.dateTime} · ${p.turfName}`
    }
  }),
  scoring_mode_proposed: (p) => ({
    title: { en: 'Scoring Mode Proposal ⚡', bn: 'স্কোরিং মোড প্রস্তাব ⚡' },
    body: {
      en: `⚡ ${p.teamName} proposed ${p.modeName} for your match`,
      bn: `⚡ ${p.teamName} আপনার ম্যাচের জন্য ${p.modeName} প্রস্তাব করেছে`
    }
  }),
  scoring_mode_agreed: (p) => ({
    title: { en: 'Scoring Mode Agreed ✅', bn: 'স্কোরিং মোড নির্ধারিত ✅' },
    body: {
      en: `✅ Scoring mode set: ${p.modeName}. Match ready!`,
      bn: `✅ স্কোরিং মোড নির্ধারণ করা হয়েছে: ${p.modeName}। ম্যাচ প্রস্তুত!`
    }
  }),
  match_opponent_joined: (p) => ({
    title: { en: 'Opponent Joined 🟢', bn: 'প্রতিপক্ষ যোগ দিয়েছে 🟢' },
    body: {
      en: `🟢 ${p.teamName} joined the match screen — let's go!`,
      bn: `🟢 ${p.teamName} ম্যাচ স্ক্রিনে যোগ দিয়েছে — চলুন শুরু করা যাক!`
    }
  }),
};
