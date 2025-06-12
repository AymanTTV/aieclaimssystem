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
  readBy?: string[]; // Add readBy array to store user IDs who read the message
  mentions?: string[]; // Added: Array of user IDs who were mentioned in the message
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
    roomId: string; // Assuming a single chat room for now, but good to have
    timestamp: Date;
  };
}
