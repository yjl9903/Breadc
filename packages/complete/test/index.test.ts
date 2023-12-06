import { describe, expect, it } from 'vitest';

import { breadc } from 'breadc';
import { options } from '@breadc/color';

import complete from '../src';

options.enabled = false;

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
      Register-ArgumentCompleter -Native -CommandName 'cli' -ScriptBlock {
          param($wordToComplete, $commandAst, $cursorPosition)
          $commandElements = $commandAst.CommandElements
          $command = @(
              'cli'
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
              'cli' {
                  [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
                  [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
                  [CompletionResult]::new('--complete', 'complete', [CompletionResultType]::ParameterName, 'Export shell complete script')
                  break
              }
          })
          $completions.Where{ $_.CompletionText -like "$wordToComplete*" } |
              Sort-Object -Property ListItemText
      }"
    `);
  });

  it('should export command complete', async () => {
    const cli = breadc('cli', {
      plugins: [complete()]
    });

    cli
      .command('build', 'Build static sites')
      .option('--root', 'Root directory');

    expect(await cli.run(['--complete'])).toMatchInlineSnapshot(`
      "using namespace System.Management.Automation
      using namespace System.Management.Automation.Language
      Register-ArgumentCompleter -Native -CommandName 'cli' -ScriptBlock {
          param($wordToComplete, $commandAst, $cursorPosition)
          $commandElements = $commandAst.CommandElements
          $command = @(
              'cli'
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
              'cli' {
                  [CompletionResult]::new('build', 'build', [CompletionResultType]::ParameterValue, 'Build static sites')
                  [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
                  [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
                  [CompletionResult]::new('--complete', 'complete', [CompletionResultType]::ParameterName, 'Export shell complete script')
                  break
              }
              
              'cli;build' {
                  [CompletionResult]::new('--root', 'root', [CompletionResultType]::ParameterName, 'Root directory')
                  [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
                  [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
                  [CompletionResult]::new('--complete', 'complete', [CompletionResultType]::ParameterName, 'Export shell complete script')
                  break
              }
          })
          $completions.Where{ $_.CompletionText -like "$wordToComplete*" } |
              Sort-Object -Property ListItemText
      }"
    `);
  });
});
