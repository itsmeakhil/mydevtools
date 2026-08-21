export type TaskPriority = "low" | "medium" | "high";
// Built-in trio plus user-defined custom status ids (see utils/statusSettings.ts).
export type TaskStatus = string;

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
  assigneeUid?: string | null; // workspace member uid; null/undefined = unassigned
}
