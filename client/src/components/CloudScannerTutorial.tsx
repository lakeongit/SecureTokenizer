import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function CloudScannerTutorial() {
  const [step, setStep] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  // Check localStorage on component mount
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenCloudScannerTutorial');
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, []);

  const totalSteps = 4;

  const tutorialContent = {
    1: {
      title: "Welcome to Cloud Scanner",
      description: "Cloud Scanner helps you automatically detect and protect sensitive data in your Google Cloud Storage buckets. Let's get started with a quick tour.",
    },
    2: {
      title: "Configuration",
      description: "First, configure your scanner by setting your Google Cloud Project ID, defining bucket patterns to scan, and setting the scan interval. You can do this by clicking the 'Edit' button in the Scanner Configuration card.",
    },
    3: {
      title: "Starting the Scanner",
      description: "Once configured, you can start the scanner using the 'Start Scanner' button at the top of the page. The scanner will automatically scan your buckets based on the configured interval.",
    },
    4: {
      title: "Monitoring and Results",
      description: "Monitor scan progress and results through the dashboard cards. View detailed findings in the audit logs section. The scanner will automatically tokenize any sensitive data it finds.",
    },
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeTutorial();
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = () => {
    localStorage.setItem('hasSeenCloudScannerTutorial', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tutorialContent[step as keyof typeof tutorialContent].title}</DialogTitle>
          <DialogDescription className="text-base">
            {tutorialContent[step as keyof typeof tutorialContent].description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleSkip}>
            Skip Tutorial
          </Button>
          <Button onClick={handleNext}>
            {step === totalSteps ? "Finish" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}