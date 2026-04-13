import { useState, useEffect } from "react";
import { formatCountdown } from "../../lib/utils";

interface RoundCountdownProps {
  startTime: number;
  roundPeriod: number;
  currentRound: number;
}

export function RoundCountdown({ startTime, roundPeriod, currentRound }: RoundCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    function calculate() {
      const roundEnd = startTime + roundPeriod * (currentRound + 1);
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(Math.max(0, roundEnd - now));
    }
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime, roundPeriod, currentRound]);

  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm">Round ends in</p>
      <p className="text-3xl font-bold font-mono">{formatCountdown(secondsLeft)}</p>
    </div>
  );
}
