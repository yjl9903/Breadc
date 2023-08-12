import type { Reporter } from '../types';

export const FancyReporter = () => {
  return <Reporter>{
    print(obj) {
      console.log(obj.message);
    }
  };
};
