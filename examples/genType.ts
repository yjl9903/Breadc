import Breadc from '../src/';

const cli = Breadc('genType');

cli
  .command('<maxDep>')
  .option('--commandDep [number]', {
    default: '3',
    construct(t) {
      return +t!;
    }
  })
  .action((_maxDep, { commandDep }) => {
    const maxDep = +_maxDep;
    const ans: string[][] = [];

    for (let dep = maxDep; dep >= 1; dep--) {
      const q = [
        [`[...\${infer P${dep}}]`],
        [`[\${infer P${dep}}]`],
        [`<\${infer P${dep}}>`],
        [`\${infer P${dep}}`]
      ];

      for (let i = dep - 1; i >= 1; i--) {
        const nQ: string[][] = [];
        for (const args of q) {
          const pre = args[0][0];
          if (pre === '$') {
            nQ.push([`\${infer P${i}}`, ...args]);
          } else if (pre === '<') {
            nQ.push([`<\${infer P${i}}>`, ...args]);
            nQ.push([`\${infer P${i}}`, ...args]);
          } else if (pre === '[') {
            nQ.push([`<\${infer P${i}}>`, ...args]);
            nQ.push([`\${infer P${i}}`, ...args]);
          }
        }
        q.splice(0);
        q.push(
          ...nQ.filter((args) => {
            if (commandDep < args.length && args[commandDep][0] === '$')
              return false;
            else return true;
          })
        );
      }

      q.sort((lhs, rhs) => {
        for (let i = 0; i < lhs.length; i++) {
          const a = lhs[i][0] + lhs[i][1];
          const b = rhs[i][0] + rhs[i][1];
          if (a !== b) {
            const gid = (c: string) => {
              if (c === '${') return 3;
              if (c === '<$') return 2;
              if (c === '[$') return 1;
              if (c === '[.') return 0;
              return -1;
            };
            return gid(a) - gid(b);
          }
        }
        throw new Error('unreachable');
      });

      for (const args of q) {
        ans.push(args);
      }
    }

    ans.push([]);

    console.log(
      ans
        .map((args, i) => {
          function getReturnType(args: string[]) {
            const id = args.findIndex((a) => a[0] !== '$');
            if (id === -1) return '[]';
            const types: string[] = args.slice(id).map((a) => {
              if (a[0] === '[') {
                if (a[1] === '.') return 'string[]';
                else return 'string | undefined';
              } else if (a[0] === '<') {
                return 'string';
              } else {
                throw new Error('unreachable');
              }
            });
            return `[${types.join(', ')}]`;
          }
          const returnType = getReturnType(args);
          const body = `T extends \`${args.join(' ')}\` ? ${returnType} :`;
          return i + 1 === ans.length ? body + ' never' : body;
        })
        .join('\n')
    );
  });

cli.run(process.argv.slice(2));
