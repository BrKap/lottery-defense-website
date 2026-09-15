import React, { createContext, useContext } from 'react';

const CalculatorConfigContext = createContext(null);

export function CalculatorConfigProvider({ value, children }) {
  return (
    <CalculatorConfigContext.Provider value={value}>
      {children}
    </CalculatorConfigContext.Provider>
  );
}

export function useCalculatorConfig() {
  const config = useContext(CalculatorConfigContext);

  if (!config) {
    throw new Error('Calculator components must be rendered inside CalculatorConfigProvider.');
  }

  return config;
}
