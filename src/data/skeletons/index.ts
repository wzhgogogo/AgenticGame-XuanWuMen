import type { EventSkeleton } from '../../types/world';
import { banquetCrisis } from './banquetCrisis';
import { politicalConfrontation } from './politicalConfrontation';
import { assassinationCrisis } from './assassinationCrisis';
import { subordinateUltimatum } from './subordinateUltimatum';
import { imperialSummons } from './imperialSummons';
import { intelligenceEvent } from './intelligenceEvent';
import { allyWavering } from './allyWavering';
import { militaryConflict } from './militaryConflict';

export const ALL_SKELETONS: EventSkeleton[] = [
  banquetCrisis,
  politicalConfrontation,
  assassinationCrisis,
  subordinateUltimatum,
  imperialSummons,
  intelligenceEvent,
  allyWavering,
  militaryConflict,
];

export {
  banquetCrisis,
  politicalConfrontation,
  assassinationCrisis,
  subordinateUltimatum,
  imperialSummons,
  intelligenceEvent,
  allyWavering,
  militaryConflict,
};
