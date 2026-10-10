import type { Role } from '../demo/model';

export type Mailbox = 'inbox' | 'sent' | 'archive';

export interface MessagePerson {
  id: number;
  fullName: string;
  role: { code: Role; name: string };
  province: { id: number; name: string; region: string } | null;
  branch: { id: number; name: string } | null;
}

export interface ApiMessage {
  id: number;
  subject: string;
  body: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  direction: 'sent' | 'received';
  sender: MessagePerson;
  receiver: MessagePerson;
}

export interface MessageCounts {
  inbox: number;
  unread: number;
  archived: number;
  sent: number;
}

export interface MessageListResponse {
  messages: ApiMessage[];
  counts: MessageCounts;
}
