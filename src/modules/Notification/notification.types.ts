import { Timestamp } from 'firebase/firestore';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp;
}