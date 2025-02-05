import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface TutorialStep {
  title: string;
  description: string;
  element?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to the Tokenization Platform",
    description: "This tutorial will guide you through the main features of our platform. Click 'Next' to begin.",
  },
  {
    title: "Create Your First Token",
    description: "Click the 'Create Token' button to start tokenizing your sensitive data.",
    element: "#create-token-btn",
    position: "bottom",
  },
  {
    title: "Bulk Processing",
    description: "For large datasets, use our CSV upload feature to process multiple records at once.",
    element: "#bulk-upload-btn",
    position: "right",
  },
  {
    title: "Monitor Your Tokens",
    description: "View and manage all your tokens in the token list. You can search, filter, and examine token details.",
    element: "#token-list",
    position: "top",
  },
  {
    title: "Audit Logging",
    description: "Track all tokenization activities in the audit log section.",
    element: "#audit-log",
    position: "left",
  },
];

export function Tutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const { toast } = useToast();

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  useEffect(() => {
    // Check if this is the user's first visit
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    const step = tutorialSteps[currentStep];
    if (step.element) {
      const element = document.querySelector(step.element) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        element.style.position = 'relative';
        element.style.zIndex = '1000';
        element.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.5)';
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.position = '';
        highlightedElement.style.zIndex = '';
        highlightedElement.style.boxShadow = '';
      }
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setIsOpen(false);
    toast({
      title: "Tutorial Completed!",
      description: "You can always restart the tutorial from the help menu.",
    });
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setIsOpen(false);
    toast({
      title: "Tutorial Skipped",
      description: "You can always start the tutorial from the help menu.",
    });
  };

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentTutorialStep.title}</DialogTitle>
            <DialogDescription>
              {currentTutorialStep.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Progress value={progress} className="mb-4" />
            
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>
              
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleSkip}>
                  Skip Tutorial
                </Button>
                <Button onClick={handleNext}>
                  {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tutorial trigger button in help menu */}
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
      >
        Restart Tutorial
      </Button>
    </>
  );
}

export default Tutorial;
