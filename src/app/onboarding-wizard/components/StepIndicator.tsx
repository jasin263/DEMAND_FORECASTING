import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;

        return (
          <React.Fragment key={`step-${step.id}`}>
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                  isCompleted
                    ? 'gradient-primary text-white'
                    : isActive
                    ? 'border-2 border-primary text-primary bg-primary/10' :'border-2 border-border text-muted-foreground bg-muted'
                }`}
              >
                {isCompleted ? <Check size={16} /> : step.id}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p className={`text-xs font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-3 mt-[-18px] sm:mt-[-22px] transition-all duration-300 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}