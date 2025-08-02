import { Doughnut } from "react-chartjs-2";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// ✅ Register only what Radar needs
ChartJS.register(ArcElement, Tooltip, Legend);

type Score = {
  score: number;
  attribute: string;
};
export const Score: React.FC<Score> = ({ score, attribute }) => {
  const getScoreColor = () => {
    if (score <= 5) {
      return "rgb(255, 0, 0)";
    }
    if (score > 5 && score < 7) {
      return "rgb(255, 230, 0)";
    }

    return "rgb(0, 122, 8)";
  };

  const left = 10 - score;

  return (
    <Doughnut
      className="w-6 h-6"
      data={{
        datasets: [
          {
            label: attribute,
            data: left > 0 ? [left, score] : [score],
            backgroundColor:
              left > 0
                ? ["rgb(201, 201, 201)", getScoreColor()]
                : [getScoreColor()],
            hoverOffset: 4,
          },
        ],
      }}
    />
  );
};
