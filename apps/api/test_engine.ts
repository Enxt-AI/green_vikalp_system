import { processInteractionEvent } from './lib/workflow-engine'; 

processInteractionEvent('473df08c-b0de-40b8-9b43-432cbb858848')
  .then(() => console.log('Done'))
  .catch(console.error);
