require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
if (process.env.NODE_ENV !== 'production') {
  if (!global.__telegramPrisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    global.__telegramPrisma = new PrismaClient({ adapter });
  }
  prisma = global.__telegramPrisma;
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

const TOPICS = {
  new:        process.env.TELEGRAM_TOPIC_NEW_ORDERS,
  ready:      process.env.TELEGRAM_TOPIC_READY_HOCCHE,
  on_the_way:  process.env.TELEGRAM_TOPIC_ON_THE_WAY,
  delivered:   process.env.TELEGRAM_TOPIC_DELIVERED,
  canceled:    process.env.TELEGRAM_TOPIC_CANCELED,
  exchange:    process.env.TELEGRAM_TOPIC_EXCHANGE,
  returned:    process.env.TELEGRAM_TOPIC_RETURNED,
};

const getStatusLabel = (status) => {
  const labels = {
    new: 'NEW 🛍️',
    ready: 'READY TO SHIP 📦',
    on_the_way: 'ON THE WAY 🚚',
    delivered: 'DELIVERED ✅',
    canceled: 'CANCELED ❌',
    exchange: 'EXCHANGE REQUESTED 🔄',
    returned: 'RETURNED ↩️',
  };
  return labels[status] || status.toUpperCase();
};

function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString().replace(/[*_`]/g, '\\$&');
}

const formatMessage = (order) => {
  const statusLabel = getStatusLabel(order.status);
  
  const itemsText = order.items && order.items.length > 0
    ? order.items.map(item => {
        const productName = item.product?.name || 'Product';
        return `📦 *${escapeMarkdown(productName)}* (${escapeMarkdown(item.sizeLabel)}) × ${item.quantity}`;
      }).join('\n')
    : 'No items';

  let message = `*${statusLabel}*\n\n` +
    `*Order ID:* #${escapeMarkdown(order.id.slice(0, 8).toUpperCase())}\n` +
    `👤 *Customer:* ${escapeMarkdown(order.customerName)}\n` +
    `📞 *Phone:* ${escapeMarkdown(order.customerPhone)}\n` +
    `💰 *Total:* ৳${order.total.toLocaleString()}\n` +
    `📍 *Address:* ${escapeMarkdown(order.address)}, ${escapeMarkdown(order.district)}`;

  if (order.notes) {
    message += `\n📝 *Notes:* ${escapeMarkdown(order.notes)}`;
  }

  message += `\n\n*Items:*\n${itemsText}`;
  return message;
};

const getButtons = (status, orderId) => {
  if (status === 'new') {
    return [
      [
        { text: 'Start Preparing 👨‍🍳', callback_data: `move:ready:${orderId}` },
        { text: 'Cancel ❌', callback_data: `move:canceled:${orderId}` }
      ]
    ];
  }
  if (status === 'ready') {
    return [
      [
        { text: 'Dispatch 🚚', callback_data: `move:on_the_way:${orderId}` },
        { text: 'Cancel ❌', callback_data: `move:canceled:${orderId}` }
      ]
    ];
  }
  if (status === 'on_the_way') {
    return [
      [
        { text: 'Mark Delivered ✅', callback_data: `move:delivered:${orderId}` },
        { text: 'Cancel ❌', callback_data: `move:canceled:${orderId}` }
      ]
    ];
  }
  if (status === 'delivered') {
    return [
      [
        { text: 'Exchange Requested 🔄', callback_data: `move:exchange:${orderId}` },
        { text: 'Returned ↩️', callback_data: `move:returned:${orderId}` }
      ]
    ];
  }
  return null; // Terminal state
};

async function sendOrder(newOrder) {
  try {
    const order = await prisma.shopOrder.findUnique({
      where: { id: newOrder.id },
      include: {
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!order) return;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const groupId = process.env.TELEGRAM_GROUP_ID;
    const topicId = TOPICS.new;

    if (!token || !groupId || !topicId) {
      console.warn('Telegram sendOrder skipped: missing env configurations.');
      return;
    }

    const messageText = formatMessage(order);
    const buttons = getButtons('new', order.id);

    const sentMessage = await bot.sendMessage(groupId, messageText, {
      message_thread_id: parseInt(topicId, 10),
      parse_mode: 'Markdown',
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined
    });

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { telegramMessageId: BigInt(sentMessage.message_id) }
    });
  } catch (err) {
    console.error('Error sending order to Telegram:', err);
  }
}

async function moveOrder(orderId, newStatus, actorId) {
  try {
    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!order) return null;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const groupId = process.env.TELEGRAM_GROUP_ID;
    const newTopicId = TOPICS[newStatus];

    if (!token || !groupId) return null;

    // Delete the old message
    if (order.telegramMessageId) {
      try {
        await bot.deleteMessage(groupId, order.telegramMessageId.toString());
      } catch (delErr) {
        console.warn('Could not delete old Telegram message:', delErr.message);
      }
    }

    // Send new message to the new topic
    let newTelegramMessageId = null;
    if (newTopicId) {
      const updatedOrder = { ...order, status: newStatus };
      const messageText = formatMessage(updatedOrder);
      const buttons = getButtons(newStatus, order.id);

      try {
        const sentMessage = await bot.sendMessage(groupId, messageText, {
          message_thread_id: parseInt(newTopicId, 10),
          parse_mode: 'Markdown',
          reply_markup: buttons ? { inline_keyboard: buttons } : undefined
        });
        newTelegramMessageId = BigInt(sentMessage.message_id);
      } catch (sendErr) {
        console.error('Error sending message to new topic:', sendErr);
      }
    }

    // Adjust stock levels if transitioning to/from canceled
    const oldIsCanceled = order.status === 'canceled' || order.status === 'cancelled';
    const newIsCanceled = newStatus === 'canceled' || newStatus === 'cancelled';

    if (newIsCanceled && !oldIsCanceled) {
      // Revert stock (cancel)
      await Promise.all(order.items.map(async (item) => {
        const dbSizes = await prisma.shopProductSize.findMany({
          where: { productId: item.productId, label: item.sizeLabel }
        });
        if (dbSizes.length > 0) {
          await prisma.shopProductSize.update({
            where: { id: dbSizes[0].id },
            data: { quantity: dbSizes[0].quantity + item.quantity }
          });
        }
      }));
    } else if (oldIsCanceled && !newIsCanceled) {
      // Re-deduct stock (uncancel)
      await Promise.all(order.items.map(async (item) => {
        const dbSizes = await prisma.shopProductSize.findMany({
          where: { productId: item.productId, label: item.sizeLabel }
        });
        if (dbSizes.length > 0) {
          await prisma.shopProductSize.update({
            where: { id: dbSizes[0].id },
            data: { quantity: Math.max(0, dbSizes[0].quantity - item.quantity) }
          });
        }
      }));
    }

    // Update DB
    const finalOrder = await prisma.shopOrder.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        telegramMessageId: newTelegramMessageId,
        lastActorTelegramId: actorId ? BigInt(actorId) : null,
        updatedAt: new Date()
      }
    });

    return finalOrder;
  } catch (err) {
    console.error('Error moving order in Telegram:', err);
    return null;
  }
}

async function alertOwner(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!token || !ownerChatId) return;
  try {
    await bot.sendMessage(ownerChatId, text);
  } catch (err) {
    console.error('Error alerting owner:', err);
  }
}

async function handleCallbackQuery(query) {
  const data = query.data;
  if (!data || !data.startsWith('move:')) return;

  const parts = data.split(':');
  const newStatus = parts[1];
  const orderId = parts[2];
  const actorId = query.from.id;

  try {
    const updated = await moveOrder(orderId, newStatus, actorId);
    if (updated) {
      const statusLabel = getStatusLabel(newStatus);
      await bot.answerCallbackQuery(query.id, {
        text: `Order moved to ${statusLabel}`
      });
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: 'Failed to move order.'
      });
    }
  } catch (err) {
    console.error('Error handling callback query:', err);
    await bot.answerCallbackQuery(query.id, {
      text: 'Error occurred.'
    });
  }
}

let bot;
function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('<paste')) {
    console.warn('TELEGRAM_BOT_TOKEN not found or not configured yet, Telegram Bot is disabled.');
    return {
      sendMessage: async () => ({ message_id: 0 }),
      deleteMessage: async () => {},
      answerCallbackQuery: async () => {},
      on: () => {},
      deleteWebHook: async () => {}
    };
  }

  const botInstance = new TelegramBot(token, { polling: true });

  botInstance.deleteWebHook()
    .then(() => {
      botInstance.on('callback_query', handleCallbackQuery);
    })
    .catch(err => {
      console.error('Error setting up Telegram bot polling:', err);
    });

  return botInstance;
}

if (process.env.NODE_ENV !== 'production') {
  if (!global.__telegramBot) {
    global.__telegramBot = initBot();
  }
  bot = global.__telegramBot;
} else {
  bot = initBot();
}

module.exports = {
  sendOrder,
  moveOrder,
  alertOwner,
  bot
};
