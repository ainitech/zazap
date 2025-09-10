import React from 'react';

const Button = React.forwardRef(({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700',
    secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600',
    ghost: 'text-slate-200 hover:bg-slate-700',
    link: 'text-blue-400 underline-offset-4 hover:underline'
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button };
