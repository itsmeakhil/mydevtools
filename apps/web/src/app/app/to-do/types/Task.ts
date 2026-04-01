import { FieldValue, Timestamp } from "firebase/firestore";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "not-started" | "ongoing" | "completed";

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  text: string;
  description?: string;
  status: TaskStatus;
  statusOrder: number;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: TaskTag[];
  subTasks?: SubTask[];
  createdAt: string;
  completedAt?: string;
  created_by: string;
  archived?: boolean;
  timeEstimate?: number; // in minutes
  timeLogged?: number; // in minutes
  isTimerRunning?: boolean;
  timerStartedAt?: string;
  projectId?: string;
}

export interface NewTask {
  text: string;
  description?: string;
  status: TaskStatus;
  statusOrder: number;
  priority?: TaskPriority;
  dueDate?: FieldValue | Timestamp | string;
  tags?: TaskTag[];
  subTasks?: SubTask[];
  createdAt: FieldValue | Timestamp;
  completedAt?: FieldValue | Timestamp;
  created_by: string;
  archived?: boolean;
  timeEstimate?: number;
  timeLogged?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: FieldValue | Timestamp | string;
  projectId?: string;
}
