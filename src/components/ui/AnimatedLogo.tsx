import React from 'react';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 120, className = '' }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Outer rotating ring with gradient */}
      <div 
        className="absolute inset-0 rounded-full animate-spin-slow"
        style={{
          background: 'conic-gradient(from 0deg, #0F9D58, #FDB462, #0F9D58)',
          padding: '3px',
        }}
      >
        <div className="w-full h-full rounded-full bg-white" />
      </div>
      
      {/* Inner circle with logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative w-full h-full rounded-full bg-white shadow-lg flex flex-col items-center justify-center transform transition-transform duration-300 hover:scale-105"
          style={{ 
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            border: '2px solid #0F9D58'
          }}
        >
          {/* 3MG Text with pulse animation */}
          <div className="text-center animate-pulse-subtle">
            <span 
              className="text-4xl font-bold leading-none"
              style={{ 
                color: '#0F9D58',
                fontSize: `${size * 0.3}px`,
                letterSpacing: '-0.02em'
              }}
            >
              3
              <span 
                className="text-3xl"
                style={{ fontSize: `${size * 0.25}px` }}
              >
                MG
              </span>
            </span>
          </div>
          
          {/* Roofing & Solar text */}
          <div 
            className="text-center mt-1"
            style={{ fontSize: `${size * 0.08}px` }}
          >
            <div className="font-semibold text-gray-700 leading-tight">
              ROOFING
            </div>
            <div className="font-semibold text-gray-700 leading-tight">
              & SOLAR
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-float-1 absolute top-0 left-1/4 w-2 h-2 bg-green-400 rounded-full opacity-60" />
        <div className="animate-float-2 absolute bottom-0 right-1/4 w-3 h-3 bg-orange-400 rounded-full opacity-60" />
        <div className="animate-float-3 absolute top-1/2 right-0 w-2 h-2 bg-green-500 rounded-full opacity-60" />
      </div>
    </div>
  );
}; 