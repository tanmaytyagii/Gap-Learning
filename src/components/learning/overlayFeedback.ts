import type { ToastInput } from '../ui/feedback-context';
import { STATUS_LABEL } from '../../domain/status';
import type { Priority, TopicStatus } from '../../domain/types';

/** Toast for a manual status change, explaining how long the override lasts. */
export function statusToast(status: TopicStatus | null): ToastInput {
  return status === null
    ? { title: 'Status is automatic again', description: 'It now follows your answers.' }
    : { title: `Status set to ${STATUS_LABEL[status]}`, description: 'This holds until your next answer on the topic, then your results take over.' };
}

/** Toast for a priority change, stating its exact effect on the gap score. */
export function priorityToast(priority: Priority): ToastInput {
  const effect = { high: 'Adds 15 points to this topic\'s gap score.', normal: 'No effect on the gap score.', low: 'Subtracts 10 points from this topic\'s gap score.' }[priority];
  return { title: `Priority set to ${priority}`, description: effect };
}
