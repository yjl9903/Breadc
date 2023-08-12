import type { Reporter } from '../types';

export const BasicReporter = () => {
  return <Reporter>{
    print(obj) {
      console.log(obj.message);
    }
  };
};
