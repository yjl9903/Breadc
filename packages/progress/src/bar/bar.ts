import EventEmitter from 'events';

import stringWidth from 'string-width';

import type { ProgressBarOption } from './types';

import { Terminal } from './terminal';
import { formatTime, formatBar, formatValue } from './format';

export class ProgressBar<P> extends EventEmitter {
  private readonly terminal: Terminal;

  private readonly options: ProgressBarOption;

  private readonly schedulingRate: number;

  private value = 0;

  private startValue = 0;

  private payload: P | undefined;

  private total = 100;

  private lastDrawnString: string | undefined = undefined;

  private lastRedraw = Date.now();

  private isActive = false;

  private timer: NodeJS.Timeout | undefined = undefined;

  constructor(options: ProgressBarOption = {}) {
    super();

    this.options = options;
    this.terminal = new Terminal(options.stream ?? process.stderr);
    this.schedulingRate = this.terminal.isTTY
      ? this.options.throttleTime ?? 100
      : this.options.notTTYSchedule ?? 2000;

    if (!options.align) {
      options.align = 'left';
    }
    if (!options.autopaddingChar) {
      options.autopaddingChar = ' ';
    }
  }

  // // start the progress bar
  // start(total, startValue, payload) {
  //   // progress updates are only visible in TTY mode!
  //   if (this.options.noTTYOutput === false && this.terminal.isTTY() === false) {
  //     return;
  //   }

  //   // add handler to restore cursor settings (stop the bar) on SIGINT/SIGTERM ?
  //   if (this.sigintCallback === null && this.options.gracefulExit) {
  //     this.sigintCallback = this.stop.bind(this);
  //     process.once('SIGINT', this.sigintCallback);
  //     process.once('SIGTERM', this.sigintCallback);
  //   }

  //   // save current cursor settings
  //   this.terminal.cursorSave();

  //   // hide the cursor ?
  //   if (this.options.hideCursor === true) {
  //     this.terminal.cursor(false);
  //   }

  //   // disable line wrapping ?
  //   if (this.options.linewrap === false) {
  //     this.terminal.lineWrapping(false);
  //   }

  //   // initialize bar
  //   super.start(total, startValue, payload);

  //   // redraw on start!
  //   this.render();
  // }

  // // stop the bar
  // stop() {
  //   // timer inactive ?
  //   if (!this.timer) {
  //     return;
  //   }

  //   // remove sigint listener
  //   if (this.sigintCallback) {
  //     process.removeListener('SIGINT', this.sigintCallback);
  //     process.removeListener('SIGTERM', this.sigintCallback);
  //     this.sigintCallback = null;
  //   }

  //   // trigger final rendering
  //   this.render();

  //   // restore state
  //   super.stop();

  //   // stop timer
  //   clearTimeout(this.timer);
  //   this.timer = null;

  //   // cursor hidden ?
  //   if (this.options.hideCursor === true) {
  //     this.terminal.cursor(true);
  //   }

  //   // re-enable line wrapping ?
  //   if (this.options.linewrap === false) {
  //     this.terminal.lineWrapping(true);
  //   }

  //   // restore cursor on complete (position + settings)
  //   this.terminal.cursorRestore();

  //   // clear line on complete ?
  //   if (this.options.clearOnComplete) {
  //     this.terminal.cursorTo(0, null);
  //     this.terminal.clearLine();
  //   } else {
  //     // new line on complete
  //     this.terminal.newline();
  //   }
  // }

  private format(
    params: any,
    payload: P | undefined,
    options: ProgressBarOption
  ) {
    const template = ` {bar} | {value}/{total}`;

    let s = template;

    // custom time format set ?
    // const formatTime = options.formatTime || _defaultFormatTime;

    // custom value format set ?
    // const formatValue = options.formatValue || _defaultFormatValue;

    // custom bar format set ?
    // const formatBar = options.formatBar || _defaultFormatBar;

    // calculate progress in percent
    const percentage = Math.floor(params.progress * 100);

    // bar stopped and stopTime set ?
    const stopTime = params.stopTime || Date.now();

    // calculate elapsed time
    const elapsedTime = Math.round((stopTime - params.startTime) / 1000);

    // merges data from payload and calculated
    const context = Object.assign({}, payload, {
      bar: formatBar(params.progress, options),

      percentage: formatValue(percentage, options, 'percentage'),
      total: formatValue(params.total, options, 'total'),
      value: formatValue(params.value, options, 'value'),

      // eta: formatValue(params.eta, options, 'eta'),
      // eta_formatted: formatTime(params.eta, options, 5),

      duration: formatValue(elapsedTime, options, 'duration'),
      duration_formatted: formatTime(elapsedTime, 1, options)
    });

    // assign placeholder tokens
    s = s.replace(/\{(\w+)\}/g, function (match, key) {
      // key exists within payload/context
      // @ts-ignore
      if (typeof context[key] !== 'undefined') {
        // @ts-ignore
        return context[key];
      }
      // no changes to unknown values
      return match;
    });

    // calculate available whitespace (2 characters margin of error)
    const fullMargin = Math.max(0, params.maxWidth - stringWidth(s) - 2);
    const halfMargin = Math.floor(fullMargin / 2);

    // distribute available whitespace according to position
    switch (options.align) {
      // fill start-of-line with whitespaces
      case 'right':
        s = fullMargin > 0 ? ' '.repeat(fullMargin) + s : s;
        break;

      // distribute whitespaces to left+right
      case 'center':
        s = halfMargin > 0 ? ' '.repeat(halfMargin) + s : s;
        break;

      // default: left align, no additional whitespaces
      case 'left':
      default:
        break;
    }

    return s;
  }

  render() {
    // stop timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.renderTerminal();

    // add new line in notty mode!
    if (this.options.noTTYOutput && this.terminal.isTTY === false) {
      this.terminal.newline();
    }

    // setup new timer
    this.timer = setTimeout(this.render.bind(this), this.schedulingRate);
  }

  private renderTerminal(forceRendering = false) {
    const params = {
      progress: this.getProgress(),
      // startTime: this.startTime,
      // stopTime: this.stopTime,
      total: this.total,
      value: this.value,
      maxWidth: this.terminal.getWidth()
    };

    // format string
    const text = this.format(params, this.payload, this.options);

    const forceRedraw =
      forceRendering ||
      this.options.forceRedraw ||
      // force redraw in notty-mode!
      (this.options.noTTYOutput && !this.terminal.isTTY);

    if (forceRedraw || this.lastDrawnString != text) {
      // trigger event
      this.emit('pre:redraw');

      // set cursor to start of line
      this.terminal.cursorTo(0, undefined);

      // write output
      this.terminal.write(text);

      // clear to the right from cursor
      this.terminal.clearRight();

      // store string
      this.lastDrawnString = text;

      // set last redraw time
      this.lastRedraw = Date.now();

      // trigger event
      this.emit('post:redraw');
    }
  }

  getProgress() {
    // calculate the normalized current progress
    let progress = this.value / this.total;

    // use relative progress calculation ? range between startValue and total is then used as 100%
    // startValue (offset) is ignored for calculations
    // if (this.options.progressCalculationRelative) {
    //   progress =
    //     (this.value - this.startValue) / (this.total - this.startValue);
    // }

    // // handle NaN Errors caused by total=0. Set to complete in this case
    // if (isNaN(progress)) {
    //   progress = this.options && this.options.emptyOnZero ? 0.0 : 1.0;
    // }

    // limiter
    progress = Math.min(Math.max(progress, 0.0), 1.0);

    return progress;
  }
}
