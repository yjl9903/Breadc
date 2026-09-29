import { chat } from '../src/index.ts';

const tui = chat();

tui.log('hello');

const working = tui.spinner('working...');
const sleeping = tui.spinner('sleeping...');
const progress = tui.progress('progress', {
  template: ['{message}', '{bar} | {percent}%']
});

setTimeout(() => {
  tui.log('some log ...');
}, 500);

setTimeout(() => {
  working.remove();
}, 1000);

setTimeout(() => {
  sleeping.remove();
}, 2000);

let value = 0;
const total = 1000;
const timer = setInterval(() => {
  if (value === total) {
    clearInterval(timer);
    progress.remove();
    tui.dispose();
  } else {
    progress.setState({ value: ++value, total });
  }
}, 10);
