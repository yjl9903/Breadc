import type { CompletionGenerator } from './types';

export const generatePowershell: CompletionGenerator = (
  breadc,
  commands,
  globalOptions
) => {
  const bin = breadc.name;
  const subcommands = '';

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
