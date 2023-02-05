import { describe, expect, it } from 'vitest';

import { breadc } from 'breadc';
import { complete } from '../src';

describe('Complete', () => {
  it('should print help', async () => {
    const cli = breadc('cli', {
      plugins: [complete()]
    });
    expect(await cli.run(['--help'])).toMatchInlineSnapshot(`
      "cli/unknown

      Usage: cli [OPTIONS]

      Options:
        -c, --complete <shell>  Export shell complete script
        -h, --help              Print help
        -v, --version           Print version
      "
    `);
  });

  it('should export empty complete', async () => {
    const cli = breadc('cli', {
      plugins: [complete()]
    });
    expect(await cli.run(['--complete'])).toMatchInlineSnapshot(`
      "using namespace System.Management.Automation
      using namespace System.Management.Automation.Language
      Register-ArgumentCompleter -Native -CommandName 'undefined' -ScriptBlock {
          param($wordToComplete, $commandAst, $cursorPosition)
          $commandElements = $commandAst.CommandElements
          $command = @(
              'undefined'
              for ($i = 1; $i -lt $commandElements.Count; $i++) {
                  $element = $commandElements[$i]
                  if ($element -isnot [StringConstantExpressionAst] -or
                      $element.StringConstantType -ne [StringConstantType]::BareWord -or
                      $element.Value.StartsWith('-') -or
                      $element.Value -eq $wordToComplete) {
                  break
              }
              $element.Value
          }) -join ';'
          $completions = @(switch ($command) {
          })
          $completions.Where{ $_.CompletionText -like \\"$wordToComplete*\\" } |
              Sort-Object -Property ListItemText
      }"
    `);
  });
});
