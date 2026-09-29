import { createRenderer } from '../src/index.ts';

const tui = createRenderer({ viewportHeight: 2 });
let value = 0;

const timer = setInterval(() => {
  tui.render((frame) => {
    frame.write([
      { text: 'Building ', style: { bold: true } },
      { text: `${value}%`, style: { foreground: 'cyan' } }
    ]);
    frame.write('The live surface is redrawn through a cell diff.', { y: 1 });
  });

  value += 10;
  if (value > 100) {
    clearInterval(timer);
    tui.batch(() => {
      tui.commit([{ text: '\u2713 Build complete', style: { foreground: 'green' } }]);
      tui.clear();
    });
    tui.dispose();
  }
}, 80);
