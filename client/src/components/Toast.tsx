import { useEffect } from "react";
import "./Toast.css";

interface ToastProps {
  readonly message: string;
  readonly onClose: () => void;
  // Allows custom duration; default is 10000ms (10 seconds).
  readonly duration?: number;
}

export default function Toast({ message, onClose, duration = 10000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // Clear the timer when the component unmounts to prevent memory leaks
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="toast-container" role="alert">
      <div className="toast-content">
        <span>{message}</span>
        <button 
          className="toast-close" 
          onClick={onClose} 
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}