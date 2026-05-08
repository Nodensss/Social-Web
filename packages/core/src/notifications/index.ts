export type NotificationEvent = 
  | { type: 'NEW_COMMENT'; postId: string; authorToyId: string; text: string }
  | { type: 'NEW_REACTION'; postId: string; toyId: string; reactionType: string };

async function webNotifier(toyId: string, event: NotificationEvent) {
  console.log(`[webNotifier] Notification for Toy ${toyId}:`, event);
}

// Will be expanded with actual bot logic later if needed or injected
async function telegramNotifier(toyId: string, event: NotificationEvent) {
  // In a real scenario, we'd fetch the user's telegramId from DB via toyId -> child -> family -> user
  // and send a message via grammY's Bot instance. For now, it logs.
  console.log(`[telegramNotifier] Sending notification for Toy ${toyId}:`, event);
}

export async function notifyToyOwner(toyId: string, event: NotificationEvent) {
  const useTelegram = process.env.USE_TELEGRAM_NOTIFICATIONS === 'true';
  
  if (useTelegram) {
    await telegramNotifier(toyId, event);
  } else {
    await webNotifier(toyId, event);
  }
}
