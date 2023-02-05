import type { Breadc, Command, Option } from 'breadc';

import type { CompletionGenerator } from './types';

export const generatePowershell: CompletionGenerator = (
  breadc,
  commands,
  globalOptions
) => {
  const bin = breadc.name;
  const subcommands = generateSubcommands(breadc, commands, globalOptions);

  const template = `using namespace System.Management.Automation
using namespace System.Management.Automation.Language
Register-ArgumentCompleter -Native -CommandName '${bin}' -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $commandElements = $commandAst.CommandElements
    $command = @(
        '${bin}'
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
    $completions = @(switch ($command) {${subcommands}
    })
    $completions.Where{ $_.CompletionText -like "$wordToComplete*" } |
        Sort-Object -Property ListItemText
}`;

  return template;
};

function generateSubcommands(
  breadc: Breadc,
  commands: Command[],
  globalOptions: Option[]
) {
  const cases: string[] = [];

  cases.push(
    [
      '',
      `'${breadc.name}' {`,
      ...commands.map(
        (c) =>
          `    [CompletionResult]::new('${c._arguments[0].name}', '${c._arguments[0].name}', [CompletionResultType]::ParameterValue, '${c.description}')`
      ),
      ...globalOptions.map(
        (o) =>
          `    [CompletionResult]::new('--${o.name}', '${o.name}', [CompletionResultType]::ParameterName, '${o.description}')`
      ),
      `    break`,
      `}`
    ]
      .map((t) => '        ' + t)
      .join('\n')
  );

  for (const command of commands) {
    const args = command._arguments
      .filter((a) => a.type === 'const')
      .map((a) => a.name)
      .join(';');

    cases.push(
      [
        '',
        `'${breadc.name};${args}' {`,
        ...command._options.map(
          (o) =>
            `    [CompletionResult]::new('--${o.name}', '${o.name}', [CompletionResultType]::ParameterName, '${o.description}')`
        ),
        ...globalOptions.map(
          (o) =>
            `    [CompletionResult]::new('--${o.name}', '${o.name}', [CompletionResultType]::ParameterName, '${o.description}')`
        ),
        `    break`,
        `}`
      ]
        .map((t) => '        ' + t)
        .join('\n')
    );
  }

  return cases.join('\n');
}
