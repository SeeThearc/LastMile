import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

interface SlideToConfirmProps {
  onConfirm: () => void;
  isConfirming?: boolean;
}

export default function SlideToConfirm({ onConfirm, isConfirming = false }: SlideToConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const fillWidth = useTransform(x, (val) => `calc(${val}px + 48px)`);

  useEffect(() => {
    if (isConfirming) {
      setConfirmed(true);
      controls.start({ x: '100%', transition: { duration: 0.3 } });
    }
  }, [isConfirming, controls]);

  const handleDragEnd = async (_event: any, info: any) => {
    if (!containerRef.current || confirmed || isConfirming) return;

    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.7;

    if (info.offset.x >= threshold) {
      setConfirmed(true);
      await controls.start({ x: containerWidth - 52 });
      onConfirm();
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-14 rounded-full overflow-hidden flex items-center shadow-inner transition-colors duration-500 ${
        confirmed ? 'bg-orange-500' : 'bg-slate-200'
      }`}
    >
      {!confirmed && (
        <motion.div 
          style={{ width: fillWidth }}
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
        />
      )}

      <div className="absolute w-full text-center text-sm font-semibold pointer-events-none transition-opacity duration-300 z-10">
        <span className={confirmed ? 'opacity-0' : 'text-slate-600 mix-blend-overlay'}>
          Slide to confirm order
        </span>
        <span className={`absolute left-0 w-full text-center text-white drop-shadow-md ${confirmed ? 'opacity-100' : 'opacity-0'}`}>
          {isConfirming ? 'Creating Order...' : 'Confirmed!'}
        </span>
      </div>

      <motion.div
        drag={confirmed || isConfirming ? false : 'x'}
        dragConstraints={containerRef}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="absolute left-1 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {confirmed || isConfirming ? (
          <Check className="w-5 h-5 text-orange-500" />
        ) : (
          <ArrowRight className="w-5 h-5 text-orange-500" />
        )}
      </motion.div>
    </div>
  );
}
