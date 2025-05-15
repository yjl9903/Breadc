import { onDeath } from '../src';

onDeath((sig) => {
  console.log('Handler 3');
  console.log(`Receive: ${sig}`);
  console.log('Process is being killed');
});

const cancel = onDeath(() => {
  console.log('This is removed');
});

onDeath(async () => {
  console.log('Handler 1');
  await sleep(1000 * 1000);
  console.log('Handler 2');
});

cancel();

console.log('Start sleep');

await sleep(1000 * 1000);

function sleep(timeout: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(() => res(), timeout);
  });
}
