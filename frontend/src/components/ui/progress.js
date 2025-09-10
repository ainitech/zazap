import React from 'react';

const Progress = React.forwardRef(({ className = '', value = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative h-4 w-full overflow-hidden rounded-full bg-slate-700 ${className}`}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-blue-500 transition-all"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`
      }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
