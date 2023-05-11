import { onDeath } from '../src';

function sleep(timeout: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(() => res(), timeout);
  });
}

onDeath((sig) => {
  console.log(`Receive: ${sig}`);
  console.log('Process is being killed');
});

console.log('Start sleep');

await sleep(1000 * 1000);
