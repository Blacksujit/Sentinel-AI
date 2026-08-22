from typing import Dict, Callable, Any, List
from dataclasses import dataclass


@dataclass
class SignalDetector:
    """Represents a signal detector function with metadata."""
    name: str
    function: Callable
    signal_type: str


class SignalRegistry:
    """Registry for managing signal detector functions."""
    
    def __init__(self):
        self._detectors: Dict[str, SignalDetector] = {}
    
    def register(self, name: str, function: Callable, signal_type: str) -> None:
        """Register a signal detector.
        
        Args:
            name: Unique name for the detector
            function: Detector function to call
            signal_type: Type of signal (e.g., "prompt", "output")
        """
        detector = SignalDetector(name=name, function=function, signal_type=signal_type)
        self._detectors[name] = detector
    
    def run_detectors(self, signal_type: str, **kwargs) -> Dict[str, Any]:
        """Run all detectors of a given type.
        
        Args:
            signal_type: Type of detectors to run
            **kwargs: Arguments to pass to detector functions
            
        Returns:
            Dictionary of signal results with detector names as keys
        """
        results = {}
        
        for name, detector in self._detectors.items():
            if detector.signal_type == signal_type:
                try:
                    result = detector.function(**kwargs)
                    results[name] = result
                except Exception as e:
                    results[name] = {"error": str(e)}
        
        return results
    
    def get_detectors_by_type(self, signal_type: str) -> List[SignalDetector]:
        """Get all detectors of a specific type.
        
        Args:
            signal_type: Type of detectors to retrieve
            
        Returns:
            List of detectors matching the specified type
        """
        return [
            detector for detector in self._detectors.values()
            if detector.signal_type == signal_type
        ]
    
    def list_all_detectors(self) -> Dict[str, str]:
        """List all registered detectors with their types.
        
        Returns:
            Dictionary mapping detector names to their signal types
        """
        return {
            name: detector.signal_type 
            for name, detector in self._detectors.items()
        }


# Global registry instance
signal_registry = SignalRegistry()


def build_default_registry() -> SignalRegistry:
    """Build the production detector registry (prompt + output detectors).

    Single source of truth for the detector set both /analyze and the
    red team executor use, so the executor can never drift from production.
    """
    from app.monitors.prompt_anomaly import detect_prompt_anomaly
    from app.monitors.jailbreak_rag import detect_jailbreak_rag
    from app.scoring.output_risk import score_output_risk

    registry = SignalRegistry()
    registry.register("prompt_anomaly", detect_prompt_anomaly, "prompt")
    registry.register("jailbreak_rag", detect_jailbreak_rag, "prompt")
    registry.register("output_risk", score_output_risk, "output")
    return registry