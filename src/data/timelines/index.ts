import { xuanwuGateTimeline, xuanwuGateTransitions } from './xuanwuGate';

export const timelines = [xuanwuGateTimeline];
export const transitions = xuanwuGateTransitions;

export const defaultTimeline = xuanwuGateTimeline;

export function getTimelineById(id: string) {
  return timelines.find((t) => t.id === id);
}
