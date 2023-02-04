import { describe, expect, it } from 'vitest';

import * as color from '../src';

color.options.enabled = true;
color.options.supportLevel = color.SupportLevel.ansi;

describe('color', () => {
  it('font', () => {
    expect(color.black('black')).toMatchInlineSnapshot('"[30mblack[39m"');
    expect(color.red('red')).toMatchInlineSnapshot('"[31mred[39m"');
    expect(color.green('green')).toMatchInlineSnapshot('"[32mgreen[39m"');
    expect(color.yellow('yellow')).toMatchInlineSnapshot('"[33myellow[39m"');
    expect(color.blue('blue')).toMatchInlineSnapshot('"[34mblue[39m"');
    expect(color.magenta('magenta')).toMatchInlineSnapshot('"[35mmagenta[39m"');
    expect(color.cyan('cyan')).toMatchInlineSnapshot('"[36mcyan[39m"');
    expect(color.white('white')).toMatchInlineSnapshot('"[97mwhite[39m"');
    expect(color.gray('gray')).toMatchInlineSnapshot('"[90mgray[39m"');

    expect(color.lightRed('lightRed')).toMatchInlineSnapshot('"[91mlightRed[39m"');
    expect(color.lightGreen('lightGreen')).toMatchInlineSnapshot(
      '"[92mlightGreen[39m"'
    );
    expect(color.lightYellow('lightYellow')).toMatchInlineSnapshot(
      '"[93mlightYellow[39m"'
    );
    expect(color.lightBlue('lightBlue')).toMatchInlineSnapshot('"[94mlightBlue[39m"');
    expect(color.lightMagenta('lightMagenta')).toMatchInlineSnapshot(
      '"[95mlightMagenta[39m"'
    );
    expect(color.lightCyan('lightCyan')).toMatchInlineSnapshot('"[96mlightCyan[39m"');
    expect(color.lightGray('lightGray')).toMatchInlineSnapshot('"[37mlightGray[39m"');
  });

  it('background', () => {
    expect(color.bgBlack('black')).toMatchInlineSnapshot('"[40mblack[49m"');
    expect(color.bgRed('red')).toMatchInlineSnapshot('"[41mred[49m"');
    expect(color.bgGreen('green')).toMatchInlineSnapshot('"[42mgreen[49m"');
    expect(color.bgYellow('yellow')).toMatchInlineSnapshot('"[43myellow[49m"');
    expect(color.bgBlue('blue')).toMatchInlineSnapshot('"[44mblue[49m"');
    expect(color.bgMagenta('magenta')).toMatchInlineSnapshot('"[45mmagenta[49m"');
    expect(color.bgCyan('cyan')).toMatchInlineSnapshot('"[46mcyan[49m"');
    expect(color.bgWhite('white')).toMatchInlineSnapshot('"[107mwhite[49m"');
    expect(color.bgGray('gray')).toMatchInlineSnapshot('"[100mgray[49m"');

    expect(color.bgLightRed('lightRed')).toMatchInlineSnapshot('"[101mlightRed[49m"');
    expect(color.bgLightGreen('lightGreen')).toMatchInlineSnapshot(
      '"[102mlightGreen[49m"'
    );
    expect(color.bgLightYellow('lightYellow')).toMatchInlineSnapshot(
      '"[103mlightYellow[49m"'
    );
    expect(color.bgLightBlue('lightBlue')).toMatchInlineSnapshot('"[104mlightBlue[49m"');
    expect(color.bgLightMagenta('lightMagenta')).toMatchInlineSnapshot(
      '"[105mlightMagenta[49m"'
    );
    expect(color.bgLightCyan('lightCyan')).toMatchInlineSnapshot('"[106mlightCyan[49m"');
    expect(color.bgLightGray('lightGray')).toMatchInlineSnapshot('"[47mlightGray[49m"');
  });
});

describe('preview', () => {
  it('font color', () => {
    console.log();
    console.log(
      color.red('red') +
        '      ' +
        color.lightRed('lightRed') +
        '      ' +
        color.bgRed('red') +
        '      ' +
        color.bgLightRed(color.black('lightRed'))
    );
    console.log(
      color.green('green') +
        '    ' +
        color.lightGreen('lightGreen') +
        '    ' +
        color.bgGreen('green') +
        '    ' +
        color.bgLightGreen(color.black('lightGreen'))
    );
    console.log(
      color.yellow('yellow') +
        '   ' +
        color.lightYellow('lightYellow') +
        '   ' +
        color.bgYellow('yellow') +
        '   ' +
        color.bgLightYellow(color.black('lightYellow'))
    );
    console.log(
      color.blue('blue') +
        '     ' +
        color.lightBlue('lightBlue') +
        '     ' +
        color.bgBlue('blue') +
        '     ' +
        color.bgLightBlue(color.black('lightBlue'))
    );
    console.log(
      color.magenta('magenta') +
        '  ' +
        color.lightMagenta('lightMagenta') +
        '  ' +
        color.bgMagenta('magenta') +
        '  ' +
        color.bgLightMagenta(color.black('lightMagenta'))
    );
    console.log(
      color.cyan('cyan') +
        '     ' +
        color.lightCyan('lightCyan') +
        '     ' +
        color.bgCyan('cyan') +
        '     ' +
        color.bgLightCyan(color.black('lightCyan'))
    );
    console.log(
      color.gray('gray') +
        '     ' +
        color.lightGray('lightGray') +
        '     ' +
        color.bgGray('gray') +
        '     ' +
        color.bgLightGray(color.black('lightGray'))
    );
    console.log(
      color.white('white') + '                  ' + color.bgWhite('white')
    );
    console.log(color.black('black') + '' + '');
  });
});
