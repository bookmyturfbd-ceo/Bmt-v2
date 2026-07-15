import prisma from './prisma';
import { NOTIFICATION_EVENTS } from './notificationCopy';

interface NotifyParams {
  userIds: string[];
  type: string;
  url: string;
  actorId?: string; // actor/sender user ID to prevent self-notifications
  params?: Record<string, string>; // parameters for copying (e.g. playerName, teamName, turfName, dateTime)
  data?: Record<string, any>;
}

export async function notify({ userIds, type, url, actorId, params = {}, data = {} }: NotifyParams) {
  // 1. Filter out the actor (self-notification protection)
  const targets = userIds.filter(id => id && id !== actorId);
  if (targets.length === 0) return;

  // 2. Retrieve notification copy from central copy map
  const getCopy = NOTIFICATION_EVENTS[type];
  if (!getCopy) {
    console.error(`Notification: Unknown event type "${type}"`);
    return;
  }
  const copy = getCopy(params);
  
  // Determine priority: normal for 'social' categories, high (10) for others
  const isSocial = type === 'interaction_message' || type === 'friend_message';
  const priority = isSocial ? 5 : 10; // OneSignal priority: 10 = high, 5 = normal

  // Fire-and-forget execution to prevent blocking the main process
  (async () => {
    try {
      // Step A: Insert records in notifications table via Prisma
      const dbInserts = targets.map(targetId => 
        prisma.notification.create({
          data: {
            userId: targetId,
            type,
            title: JSON.stringify(copy.title),
            body: JSON.stringify(copy.body),
            url,
          }
        })
      );
      
      const dbResults = await Promise.all(dbInserts);
      console.log(`Notification: Inserted ${dbResults.length} in-app notifications`);

      // Step B: Send push notification via OneSignal API
      const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      const onesignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

      if (!onesignalAppId || !onesignalRestKey) {
        console.warn('Notification: OneSignal config missing (NEXT_PUBLIC_ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY). Skipping push.');
      } else {
        const res = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${onesignalRestKey}`
          },
          body: JSON.stringify({
            app_id: onesignalAppId,
            include_aliases: {
              external_id: targets
            },
            target_channel: 'push',
            headings: copy.title, // Object with { en, bn }
            contents: copy.body, // Object with { en, bn }
            url,
            chrome_web_icon: 'https://bookmyturfbd.com/bmt-logo.png',
            priority,
            data
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Notification: OneSignal Push API returned error HTTP ${res.status}:`, errText);
        } else {
          const resJson = await res.json();
          console.log('Notification: OneSignal push notification dispatched successfully:', resJson);
        }
      }

      // Step C: Trigger Supabase Realtime broadcast for instant in-app alerts
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const broadcastPromises = dbResults.map(async (notif: any) => {
          try {
            const topic = `notifications:${notif.userId}`;
            await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                messages: [{
                  topic,
                  event: 'new_notification',
                  payload: {
                    id: notif.id,
                    type: notif.type,
                    title: notif.title,
                    body: notif.body,
                    url: notif.url,
                    read: notif.read,
                    createdAt: notif.createdAt
                  }
                }],
              }),
            });
          } catch (e) {
            console.error(`Notification: Broadcast to user ${notif.userId} failed:`, e);
          }
        });
        await Promise.all(broadcastPromises);
      }

    } catch (err) {
      console.error('Notification: Pipeline failed asynchronously:', err);
    }
  })();
}
