import axios from 'axios';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function toZoomError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error) && error.response) {
    const { status, data } = error.response;
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    return new Error(`${fallback}: Zoom responded ${status} ${detail}`);
  }
  return error instanceof Error ? error : new Error(fallback);
}

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

    try {
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
    } catch (error) {
      throw toZoomError(error, 'Error fetching Zoom access token');
    }
  }

  async createMeeting(topic: string, startTime: string, sessionLength: number) {
    const API_URL = this.configService.get<string>('zoomConfig.zoomApiUrl');
    const token = await this.getToken();

    try {
      const response = await axios.post(
        `${API_URL}/users/me/meetings`,
        {
          topic,
          type: 2,
          start_time: startTime,
          duration: sessionLength,
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
          meeting_password: response.data.password,
        };
      }
    } catch (error) {
      throw toZoomError(error, 'Error creating Zoom meeting');
    }
  }

  async updateMeeting(
    meetingId: number,
    topic: string | undefined,
    startTime: string | undefined,
  ) {
    const API_URL = this.configService.get<string>('zoomConfig.zoomApiUrl');
    const token = await this.getToken();

    if (!topic && !startTime) {
      throw new Error('At least one of topic or startTime must be provided');
    }
    if (
      (startTime && isNaN(Date.parse(startTime))) ||
      (startTime && new Date(startTime) < new Date())
    ) {
      throw new Error('Invalid start time provided');
    }

    let data = {};

    if (topic) {
      data = { ...data, topic };
    }

    if (startTime) {
      data = { ...data, start_time: startTime };
    }

    try {
      const response = await axios.patch(
        `${API_URL}/meetings/${meetingId}`,
        {
          ...data,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        return {
          join_url: response.data.join_url,
          meeting_id: response.data.id,
          start_time: response.data.start_time,
          start_url: response.data.start_url,
        };
      }
    } catch (error) {
      throw toZoomError(error, 'Error updating Zoom meeting');
    }
  }

  async deleteMeeting(meetingId: number) {
    const API_URL = this.configService.get<string>('zoomConfig.zoomApiUrl');
    const token = await this.getToken();

    try {
      const response = await axios.delete(`${API_URL}/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        return { message: 'Meeting deleted successfully' };
      }
    } catch (error) {
      throw toZoomError(error, 'Error deleting Zoom meeting');
    }
  }

  async getZak() {
    const API_URL = this.configService.get<string>('zoomConfig.zoomApiUrl');
    const token = await this.getToken();

    try {
      const response = await axios.get(`${API_URL}/users/me/token`, {
        params: { type: 'zak' },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.token as string;
    } catch (error) {
      throw toZoomError(error, 'Error fetching Zoom ZAK token');
    }
  }
}
