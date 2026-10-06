import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useAppearance } from "../../context/AppearanceContext";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement,
);
export default function ActivityChart({ days }) {
  const { accent } = useAppearance();
  return (
    <div className="activity-chart">
      <Bar
        data={{
          labels: days.map((d) =>
            new Date(`${d.date}T12:00:00+08:00`).toLocaleDateString("en", {
              weekday: "short",
              timeZone: "Asia/Manila",
            }),
          ),
          datasets: [
            {
              label: "Check-ins",
              data: days.map((d) => d.checkins),
              backgroundColor: accent,
              borderRadius: 4,
              maxBarThickness: 18,
            },
            {
              label: "Dispatches",
              data: days.map((d) => d.dispatches),
              backgroundColor: "#e4c78f",
              borderRadius: 4,
              maxBarThickness: 18,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "rectRounded",
                boxWidth: 9,
                font: { size: 11 },
                padding: 22,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              border: { display: false },
              grid: { color: "#f0f1ec" },
              ticks: { precision: 0, font: { size: 11 } },
            },
          },
        }}
      />
    </div>
  );
}
export function CategoryChart({ categories }) {
  return (
    <div className="category-chart">
      <Doughnut
        data={{
          labels: categories.map((c) => c.name),
          datasets: [
            {
              data: categories.map((c) => c.count),
              backgroundColor: categories.map((c) => c.color),
              borderWidth: 4,
              borderColor: "#fff",
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "76%",
          plugins: { legend: { display: false } },
        }}
      />
    </div>
  );
}
