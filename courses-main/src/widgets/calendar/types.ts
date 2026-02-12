export interface Task {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
}

export interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  initialTask?: Task;
}
