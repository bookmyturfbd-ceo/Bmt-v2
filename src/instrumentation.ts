export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically load the telegram-bot module to activate polling and callback query listeners on startup
    await import('../telegram-bot');
    console.log('Telegram Bot initialized at server startup.');
  }
}
