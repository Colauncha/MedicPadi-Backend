import axios from 'axios';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { start } from 'repl';

@Injectable()
export class ZoomService {
  constructor(@Inject() private readonly configService: ConfigService) {}

  private async getToken() {
    const AUTH_URL = this.configService.get<string>('zoomConfig.zoomAuthUrl');

    const ACCT_ID = this.configService.get<string>('zoomConfig.acctId');
    const CLIENT_ID = this.configService.get<string>('zoomConfig.clientId');
    const CLIENT_SECRET = this.configService.get<string>(
      'zoomConfig.clientSecret',
    );

    const response = await axios.post(
      `${AUTH_URL}?grant_type=account_credentials&account_id=${ACCT_ID}`,
      {},
      {
        auth: {
          username: CLIENT_ID || '',
          password: CLIENT_SECRET || '',
        },
      },
    );
    return response.data.access_token;
  }

  async createMeeting(topic: string, startTime: string) {
    const API_URL = this.configService.get<string>('zoomConfig.zoomApiUrl');
    const token = await this.getToken();

    try {
      const response = await axios.post(
        `${API_URL}/users/me/meetings`,
        {
          topic,
          type: 2,
          start_time: startTime,
          duration: 60,
          timezone: 'UTC+1',
          setting: {
            waiting_room: true,
            join_before_host: false,
            email_notification: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 201) {
        return {
          join_url: response.data.join_url,
          meeting_id: response.data.id,
          start_time: response.data.start_time,
          start_url: response.data.start_url,
        };
      }
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
    }
  }

  async updateMeeting(meetingId: string, topic: string, startTime: string) {}

  async deleteMeeting(meetingId: string) {}
}
