import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { useEffect, useMemo, useRef, useState } from "react";

// ✅ Register only what Radar needs
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type RadarAttributes = {
  attributes: any[];
  averages: any[];
};
export default function RadarAttributes({ attributes, averages }) {
  console.log({ attributes, averages });
  const chartRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Delay rendering until on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const options = {
    scales: {
      r: {
        min: 1,
        max: 10,
        ticks: {
          stepSize: 1,
          color: "white",
          callback: function (value) {
            return value >= 1 && value <= 10 ? value : "";
          },
        },
        pointLabels: {
          color: "white",
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const data = useMemo(() => ({
    labels: attributes.map(({ reportAttributes }) => reportAttributes.name),
    datasets: [
      {
        label: "Player Score",
        data: attributes.map((a) => a.score),
        fill: false,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgb(54, 162, 235)",
        pointBackgroundColor: "rgb(54, 162, 235)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgb(54, 162, 235)",
      },
      {
        label: "Team average",
        data: attributes.map(
          (a) =>
            averages.find((av) => av.attributeId === a.attributeId).avgScore
        ),
        fill: true,
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(32, 245, 231, 1)",
        pointBackgroundColor: "rgba(32, 245, 231, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(32, 245, 231, 1)",
      },
    ],
  }));

  if (!isMounted) return null;

  return <Radar id="player" ref={chartRef} data={data} options={options} />;
}
