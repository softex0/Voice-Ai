import React from 'react';
import { Scenario } from '../types';

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onSelect: (scenario: Scenario) => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isSelected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(scenario)}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300 border
        hover:shadow-lg hover:border-blue-500/50 hover:bg-slate-800/50
        ${isSelected 
          ? 'bg-slate-800 border-blue-500 shadow-blue-900/20 shadow-xl scale-[1.02]' 
          : 'bg-slate-900/50 border-slate-800 text-slate-400'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-3xl">{scenario.icon}</div>
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
        )}
      </div>
      <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
        {scenario.name}
      </h3>
      <p className="text-sm text-slate-400 line-clamp-3">
        {scenario.description}
      </p>
    </div>
  );
};
