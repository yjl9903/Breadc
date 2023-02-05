import type { ProgressBarOption } from './types';

export function formatTime(
  t: number,
  roundToMultipleOf: number,
  options: ProgressBarOption
) {
  function round(value: number) {
    if (roundToMultipleOf) {
      return roundToMultipleOf * Math.round(value / roundToMultipleOf);
    } else {
      return value;
    }
  }

  // leading zero padding
  function autopadding(v: number) {
    return ('   ' + v).slice(-2);
  }

  // > 1h ?
  if (t > 3600) {
    return (
      autopadding(Math.floor(t / 3600)) +
      'h' +
      autopadding(round((t % 3600) / 60)) +
      'm'
    );

    // > 60s ?
  } else if (t > 60) {
    return (
      autopadding(Math.floor(t / 60)) + 'm' + autopadding(round(t % 60)) + 's'
    );

    // > 10s ?
  } else if (t > 10) {
    return autopadding(round(t)) + 's';

    // default: don't apply round to multiple
  } else {
    return autopadding(t) + 's';
  }
}

export function formatValue(
  v: number,
  options: ProgressBarOption,
  type: string
) {
  return v + '';
  // // no autopadding ? passthrough
  // if (options.autopadding !== true) {
  //   return v;
  // }

  // // padding
  // function autopadding(value, length) {
  //   return (options.autopaddingChar + value).slice(-length);
  // }

  // switch (type) {
  //   case 'percentage':
  //     return autopadding(v, 3);

  //   default:
  //     return v;
  // }
}

export function formatBar(progress: number, options: ProgressBarOption) {
  options.barsize = 40;
  options.barCompleteString = '=';
  options.barGlue = '';
  options.barIncompleteString = '-';

  // calculate barsize
  const completeSize = Math.round(progress * options.barsize);
  const incompleteSize = options.barsize - completeSize;

  // generate bar string by stripping the pre-rendered strings
  return (
    options.barCompleteString.substr(0, completeSize) +
    options.barGlue +
    options.barIncompleteString.substr(0, incompleteSize)
  );
}
