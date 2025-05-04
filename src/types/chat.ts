import { User } from './user';

export interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  replyTo?: string; // ID of message being replied to
  edited?: boolean;
  attachments?: Attachment[];
  reactions?: Reaction[];
  deleted?: boolean;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface Reaction {
  emoji: string;
  users: string[]; // User IDs who reacted with this emoji
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[]; // User IDs
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  typing?: {
    roomId: string;
    timestamp: Date;
  };
}