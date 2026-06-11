import {
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  History,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

export const getActivityIcon = activity => {
  if (activity.entityType === 'dataset') return Database;
  if (activity.entityType === 'experiment') return FlaskConical;
  if (activity.entityType === 'report') return FileText;
  if (activity.entityType === 'artifact') return GitBranch;
  if (activity.action === 'created') return Plus;
  if (activity.action === 'updated') return Pencil;
  if (activity.action === 'deleted') return Trash2;
  return History;
};

export const getActivityColor = activity => {
  if (activity.action === 'deleted') return 'var(--accent-red)';
  if (activity.action === 'created') return 'var(--accent-green)';
  if (activity.action === 'generated') return 'var(--accent-purple)';
  if (activity.entityType === 'dataset') return 'var(--accent-cyan)';
  if (activity.entityType === 'experiment') return 'var(--accent-blue)';
  return 'var(--text-muted)';
};

export const formatActivityTime = value => {
  if (!value) return 'Unknown time';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
