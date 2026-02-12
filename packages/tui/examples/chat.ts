import { chat } from '../src/index.ts';

const tui = chat();

tui.log('hello');

const handler1 = tui.spinner('working...');
const handler2 = tui.spinner('sleeping...');
const handler3 = tui.progress('progress', {
  template: ['{message}', '{bar} | {percent}%']
});

setTimeout(() => {
  tui.log('some log ...');
}, 500);

setTimeout(() => {
  tui.log('before destroy ...');
  handler1.remove();
  tui.log('after destroy ...');
}, 1000);

setTimeout(() => {
  handler2.remove();
}, 2000);

let value = 0;
const ev = setInterval(() => {
  if (value === 100) {
    clearInterval(ev);
    handler3.remove();
  } else {
    handler3.setState({ value: ++value, total: 100 });
  }
}, 20);
