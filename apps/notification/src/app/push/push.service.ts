import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import * as webpush from 'web-push';
import { PushPlatform } from '@medicpadi-backend/contracts';
import { NOTIFICATION_QUEUE, NotificationJobNames } from '../dispatch/dispatch.constants';
import { DeviceService } from './device.service';
import { DeviceToken } from './entities/device-token.entity';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushPreferences {
  mobile: boolean;
  web: boolean;
}

export interface PushReceiptsJobData {
  // Expo receipt id -> push token it was sent to (receipts don't carry the token)
  tickets: Record<string, string>;
}

// Expo recommends waiting ~15 minutes before fetching receipts
const RECEIPT_CHECK_DELAY_MS = 15 * 60 * 1000;

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;
  private readonly webPushEnabled: boolean;

  constructor(
    private readonly deviceService: DeviceService,
    private readonly configService: ConfigService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {
    this.expo = new Expo({
      accessToken: this.configService.get<string>('pushConfig.expoAccessToken') || undefined,
    });

    const publicKey = this.configService.get<string>('pushConfig.vapidPublicKey');
    const privateKey = this.configService.get<string>('pushConfig.vapidPrivateKey');
    this.webPushEnabled = !!(publicKey && privateKey);
    if (this.webPushEnabled) {
      webpush.setVapidDetails(
        this.configService.get<string>('pushConfig.vapidSubject')!,
        publicKey!,
        privateKey!,
      );
    } else {
      this.logger.warn('VAPID keys not configured — web push is disabled');
    }
  }

  /**
   * Sends a push to every registered device of the user. Never throws: a push failure
   * must not fail the surrounding job, or BullMQ would retry and duplicate emails/in-app rows.
   */
  async sendToUser(userId: string, payload: PushPayload, prefs: PushPreferences): Promise<void> {
    try {
      if (!prefs.mobile && !prefs.web) return;

      const devices = await this.deviceService.findAllForUser(userId);
      const mobile = prefs.mobile ? devices.filter((d) => d.platform !== PushPlatform.WEB) : [];
      const web = prefs.web ? devices.filter((d) => d.platform === PushPlatform.WEB) : [];

      await Promise.all([this.sendExpo(mobile, payload), this.sendWeb(web, payload)]);
    } catch (error) {
      this.logger.error(`Push to user ${userId} failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  private async sendExpo(devices: DeviceToken[], payload: PushPayload) {
    const invalid: string[] = [];
    const messages: ExpoPushMessage[] = [];

    for (const device of devices) {
      if (!Expo.isExpoPushToken(device.token)) {
        invalid.push(device.token);
        continue;
      }
      messages.push({
        to: device.token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      });
    }

    const pendingReceipts: Record<string, string> = {};

    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          const token = chunk[i].to as string;
          if (ticket.status === 'ok') {
            pendingReceipts[ticket.id] = token;
          } else {
            this.logger.warn(`Expo push to ${token} rejected: ${ticket.message}`);
            if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(token);
          }
        });
      } catch (error) {
        this.logger.error(`Expo push chunk failed: ${(error as Error).message}`);
      }
    }

    await this.deviceService.removeByTokens(invalid);

    if (Object.keys(pendingReceipts).length) {
      await this.queue.add(
        NotificationJobNames.PUSH_RECEIPTS,
        { tickets: pendingReceipts } as PushReceiptsJobData,
        { delay: RECEIPT_CHECK_DELAY_MS, removeOnComplete: { age: 86400 }, removeOnFail: { age: 604800 } },
      );
    }
  }

  private async sendWeb(devices: DeviceToken[], payload: PushPayload) {
    if (!devices.length || !this.webPushEnabled) return;

    const body = JSON.stringify(payload);
    const expired: string[] = [];

    await Promise.all(
      devices.map(async (device) => {
        if (!device.web_push_keys) {
          expired.push(device.token);
          return;
        }
        try {
          await webpush.sendNotification({ endpoint: device.token, keys: device.web_push_keys }, body);
        } catch (error) {
          const statusCode = (error as webpush.WebPushError).statusCode;
          // 404/410: subscription has expired or been revoked by the browser
          if (statusCode === 404 || statusCode === 410) {
            expired.push(device.token);
          } else {
            this.logger.error(`Web push to ${device.token} failed: ${(error as Error).message}`);
          }
        }
      }),
    );

    await this.deviceService.removeByTokens(expired);
  }

  /** Checks delayed Expo receipts and prunes tokens the push services report as unregistered. */
  async checkReceipts(data: PushReceiptsJobData): Promise<void> {
    const invalid: string[] = [];

    for (const ids of this.expo.chunkPushNotificationReceiptIds(Object.keys(data.tickets))) {
      const receipts = await this.expo.getPushNotificationReceiptsAsync(ids);
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status !== 'error') continue;
        this.logger.warn(`Expo receipt ${id} error: ${receipt.message}`);
        if (receipt.details?.error === 'DeviceNotRegistered') invalid.push(data.tickets[id]);
      }
    }

    await this.deviceService.removeByTokens(invalid);
  }
}
