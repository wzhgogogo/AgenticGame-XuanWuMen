import type { EventSkeleton } from '../../types/world';
import { banquetCrisis } from './banquetCrisis';
import { politicalConfrontation } from './politicalConfrontation';
import { assassinationCrisis } from './assassinationCrisis';
import { subordinateUltimatum } from './subordinateUltimatum';
import { imperialSummons } from './imperialSummons';
import { intelligenceEvent } from './intelligenceEvent';
import { allyWavering } from './allyWavering';
import { militaryConflict } from './militaryConflict';
import { courtImpeachment } from './courtImpeachment';
import { courtCounterstrike } from './courtCounterstrike';
import { seizeMilitaryCommand } from './seizeMilitaryCommand';

export const ALL_SKELETONS: EventSkeleton[] = [
  banquetCrisis,
  politicalConfrontation,
  assassinationCrisis,
  subordinateUltimatum,
  imperialSummons,
  intelligenceEvent,
  allyWavering,
  militaryConflict,
  courtImpeachment,
  courtCounterstrike,
  seizeMilitaryCommand,
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
  courtImpeachment,
  courtCounterstrike,
  seizeMilitaryCommand,
};
