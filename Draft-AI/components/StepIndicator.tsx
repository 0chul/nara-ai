
import React from 'react';
import { Check } from 'lucide-react';
import { AppStep } from '../types';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.UPLOAD, label: "RFP 분석" },
  { id: AppStep.ANALYSIS, label: "요구사항 확인" },
  { id: AppStep.RESEARCH, label: "시장 분석" },
  { id: AppStep.STRATEGY, label: "전략 수립" },
  { id: AppStep.CURRICULUM, label: "과정/강사 매칭" },
  { id: AppStep.PREVIEW, label: "제안서 검토" },
  { id: AppStep.COMPLETE, label: "완료" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="w-full py-6 px-4 mb-8">
      {/* 
        Scrollbar hiding logic:
        - [&::-webkit-scrollbar]:hidden -> Chrome, Safari, Opera
        - [-ms-overflow-style:none] -> IE and Edge
        - [scrollbar-width:none] -> Firefox
        
        Using static flow (no absolute) allows the container to grow in height to fit text.
      */}
      <div className="flex items-start justify-center w-full overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          
          return (
            <div key={step.id} className="flex items-start">
              <div className="flex flex-col items-center group px-2 min-w-[80px]">
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 z-10 
                    ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 
                      isCurrent ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-100' : 
                      'bg-white border-gray-300 text-gray-300'}`}
                >
                  {isCompleted ? <Check size={20} strokeWidth={3} /> : <span className="font-bold text-sm">{step.id}</span>}
                </div>
                
                {/* Static positioning (mt-2) ensures the container grows to fit this text */}
                <div className={`mt-2 text-xs font-semibold whitespace-nowrap ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                  {step.label}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                // Line alignment: Circle is 40px (h-10). Line is 4px (h-1). 
                // Center is approx 18px down (20px - 2px).
                <div className={`w-8 sm:w-16 md:w-20 h-1 mx-1 mt-[18px] transition-all duration-300 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
