"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type BeHit = "Yes" | "No";

type ExitTrade = {
  id: string;
  date: string;
  beHit: BeHit;
  firstTpR: number;
  maxR: number;
  actualR: number;
  notes: string;
  createdAt?: number;
  updatedAt?: number;
};

type DraftTrade = Omit<ExitTrade, "id" | "createdAt" | "updatedAt">;

type StrategyResult = {
  firstTp: number;
  onePointFive: number;
  twoR: number;
  threeR: number;
};

const monthOptions = buildMonthOptions("2026-07", 18);
const initialMonth = monthOptions[0].key;

const sampleTrades: DraftTrade[] = [
  {
    date: "2026-07-06",
    beHit: "Yes",
    firstTpR: 1,
    maxR: 1.7,
    actualR: 0.8,
    notes: "Reached first target and 1.5R, then faded before 2R.",
  },
  {
    date: "2026-07-08",
    beHit: "No",
    firstTpR: 1,
    maxR: 0.4,
    actualR: -1,
    notes: "Never protected the trade; full stop.",
  },
  {
    date: "2026-07-10",
    beHit: "Yes",
    firstTpR: 1.1,
    maxR: 3.2,
    actualR: 2.1,
    notes: "Runner reached 3R. Good patience after first TP.",
  },
  {
    date: "2026-07-14",
    beHit: "Yes",
    firstTpR: 0.8,
    maxR: 1.1,
    actualR: 0,
    notes: "BE protected the trade, but target selection was too tight.",
  },
];

function buildMonthOptions(startMonth: string, count: number) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(startYear, startMonthNumber - 1 + index, 1));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;

    return {
      key,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
  });
}

function defaultDraft(monthKey = initialMonth): DraftTrade {
  return {
    date: `${monthKey}-01`,
    beHit: "Yes",
    firstTpR: 1,
    maxR: 1,
    actualR: 0,
    notes: "",
  };
}

function dayName(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function daysInMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function firstWeekday(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

function rValue(value: number) {
  return `${value >= 0 ? "" : "-"}${Math.abs(value).toFixed(2)}R`;
}

function percent(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(0)}%` : "--";
}

function toneClass(value: number) {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ratio(value: number) {
  if (value === Infinity) {
    return "--";
  }

  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function chartShape(values: number[], width = 340, height = 142) {
  const series = values.length ? values : [0];
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const points = series.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });
  const baseY = height - ((0 - min) / range) * height;
  const pointList = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area =
    points.length > 1
      ? `0,${baseY.toFixed(2)} ${pointList} ${width},${baseY.toFixed(2)}`
      : `0,${baseY.toFixed(2)} ${width / 2},${points[0].y.toFixed(2)} ${width},${baseY.toFixed(2)}`;

  return { area, baseY, pointList };
}

function radarPoint(index: number, total: number, value: number, radius = 66, center = 78) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const scaled = clamp(value, 0, 100) / 100;
  const x = center + Math.cos(angle) * radius * scaled;
  const y = center + Math.sin(angle) * radius * scaled;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function strategyResult(trade: Pick<ExitTrade, "beHit" | "firstTpR" | "maxR">): StrategyResult {
  if (trade.beHit === "No") {
    return {
      firstTp: -1,
      onePointFive: -1,
      twoR: -1,
      threeR: -1,
    };
  }

  return {
    firstTp: trade.maxR >= trade.firstTpR ? trade.firstTpR : 0,
    onePointFive: trade.maxR >= 1.5 ? 1.5 : 0,
    twoR: trade.maxR >= 2 ? 2 : 0,
    threeR: trade.maxR >= 3 ? 3 : 0,
  };
}

function toCsv(trades: ExitTrade[]) {
  const headers = [
    "date",
    "day",
    "beHit",
    "firstTpR",
    "maxR",
    "actualR",
    "firstTpResult",
    "onePointFiveResult",
    "twoRResult",
    "threeRResult",
    "notes",
  ];

  const escapeCell = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;

  const rows = trades.map((trade) => {
    const result = strategyResult(trade);
    return [
      trade.date,
      dayName(trade.date),
      trade.beHit,
      trade.firstTpR,
      trade.maxR,
      trade.actualR,
      result.firstTp,
      result.onePointFive,
      result.twoR,
      result.threeR,
      trade.notes,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(","))
    .join("\n");
}

function downloadFile(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeTrade(value: unknown): DraftTrade | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const trade = value as Partial<ExitTrade>;
  const firstTpR = Number(trade.firstTpR);
  const maxR = Number(trade.maxR);
  const actualR = Number(trade.actualR);

  if (
    typeof trade.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(trade.date) ||
    (trade.beHit !== "Yes" && trade.beHit !== "No") ||
    !Number.isFinite(firstTpR) ||
    firstTpR <= 0 ||
    !Number.isFinite(maxR) ||
    maxR < 0 ||
    !Number.isFinite(actualR)
  ) {
    return null;
  }

  return {
    date: trade.date,
    beHit: trade.beHit,
    firstTpR,
    maxR,
    actualR,
    notes: typeof trade.notes === "string" ? trade.notes : "",
  };
}

export default function Home() {
  const [trades, setTrades] = useState<ExitTrade[]>([]);
  const [draft, setDraft] = useState<DraftTrade>(() => defaultDraft());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadTrades() {
    setIsLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/trades", { cache: "no-store" });
      const data = (await response.json()) as { trades?: ExitTrade[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load trades");
      }
      setTrades(data.trades ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load trades");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTrades();
  }, []);

  const sortedTrades = useMemo(
    () =>
      [...trades].sort((a, b) => {
        const dateSort = b.date.localeCompare(a.date);
        return dateSort || (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }),
    [trades],
  );

  const monthlyTrades = useMemo(
    () => sortedTrades.filter((trade) => monthKey(trade.date) === selectedMonth),
    [selectedMonth, sortedTrades],
  );

  const strategyRows = useMemo(() => {
    const strategies = [
      {
        key: "actual",
        label: "Actual",
        values: trades.map((trade) => trade.actualR),
      },
      {
        key: "firstTp",
        label: "First TP",
        values: trades.map((trade) => strategyResult(trade).firstTp),
      },
      {
        key: "onePointFive",
        label: "1.5R",
        values: trades.map((trade) => strategyResult(trade).onePointFive),
      },
      {
        key: "twoR",
        label: "2R",
        values: trades.map((trade) => strategyResult(trade).twoR),
      },
      {
        key: "threeR",
        label: "3R",
        values: trades.map((trade) => strategyResult(trade).threeR),
      },
    ];

    return strategies.map((strategy) => {
      const total = strategy.values.reduce((sum, value) => sum + value, 0);
      const wins = strategy.values.filter((value) => value > 0).length;
      return {
        ...strategy,
        average: strategy.values.length ? total / strategy.values.length : 0,
        total,
        winRate: strategy.values.length ? (wins / strategy.values.length) * 100 : 0,
      };
    });
  }, [trades]);

  const stats = useMemo(() => {
    const totalActual = trades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = trades.reduce((sum, trade) => sum + trade.maxR, 0);
    const winners = trades.filter((trade) => trade.actualR > 0);
    const losers = trades.filter((trade) => trade.actualR < 0);
    const wins = winners.length;
    const beHits = trades.filter((trade) => trade.beHit === "Yes").length;
    const grossWin = winners.reduce((sum, trade) => sum + trade.actualR, 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.actualR, 0));
    const avgWin = winners.length ? grossWin / winners.length : 0;
    const avgLoss = losers.length ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;
    const avgWinLoss = avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0;
    const avgMax = trades.length
      ? trades.reduce((sum, trade) => sum + trade.maxR, 0) / trades.length
      : 0;
    const bestMethod = strategyRows.reduce(
      (best, row) => (row.total > best.total ? row : best),
      strategyRows[0] ?? { label: "Actual", total: 0 },
    );

    const winRate = trades.length ? (wins / trades.length) * 100 : 0;
    const captureRate = totalMax ? (totalActual / totalMax) * 100 : 0;
    const beRate = trades.length ? (beHits / trades.length) * 100 : 0;
    const score = clamp(
      winRate * 0.28 +
        clamp(captureRate, 0, 100) * 0.28 +
        clamp(profitFactor === Infinity ? 100 : profitFactor * 34, 0, 100) * 0.24 +
        beRate * 0.2,
      0,
      100,
    );

    return {
      avgActual: trades.length ? totalActual / trades.length : 0,
      avgMax,
      avgWinLoss,
      beRate,
      bestMethod,
      captureRate,
      grossLoss,
      grossWin,
      losses: losers.length,
      profitFactor,
      score,
      totalActual,
      trades: trades.length,
      winRate,
      wins,
    };
  }, [strategyRows, trades]);

  const monthlyStats = useMemo(() => {
    const totalActual = monthlyTrades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = monthlyTrades.reduce((sum, trade) => sum + trade.maxR, 0);
    const wins = monthlyTrades.filter((trade) => trade.actualR > 0).length;
    const methodTotals = monthlyTrades.reduce(
      (totals, trade) => {
        const result = strategyResult(trade);
        totals.firstTp += result.firstTp;
        totals.onePointFive += result.onePointFive;
        totals.twoR += result.twoR;
        totals.threeR += result.threeR;
        return totals;
      },
      { firstTp: 0, onePointFive: 0, twoR: 0, threeR: 0 },
    );
    const best = [
      { label: "Actual", value: totalActual },
      { label: "First TP", value: methodTotals.firstTp },
      { label: "1.5R", value: methodTotals.onePointFive },
      { label: "2R", value: methodTotals.twoR },
      { label: "3R", value: methodTotals.threeR },
    ].reduce((top, item) => (item.value > top.value ? item : top));

    return {
      best,
      captureRate: totalMax ? (totalActual / totalMax) * 100 : 0,
      totalActual,
      trades: monthlyTrades.length,
      winRate: monthlyTrades.length ? (wins / monthlyTrades.length) * 100 : 0,
    };
  }, [monthlyTrades]);

  const calendarCells = useMemo(() => {
    const lead = firstWeekday(selectedMonth);
    const days = daysInMonth(selectedMonth);
    const cells: Array<{ day: number | null; date: string; total: number; count: number }> = [];

    for (let index = 0; index < lead; index += 1) {
      cells.push({ day: null, date: "", total: 0, count: 0 });
    }

    for (let day = 1; day <= days; day += 1) {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const dayTrades = monthlyTrades.filter((trade) => trade.date === date);
      cells.push({
        day,
        date,
        total: dayTrades.reduce((sum, trade) => sum + trade.actualR, 0),
        count: dayTrades.length,
      });
    }

    while (cells.length < 42 || cells.length % 7 !== 0) {
      cells.push({ day: null, date: "", total: 0, count: 0 });
    }

    return cells;
  }, [monthlyTrades, selectedMonth]);

  const weeklyRows = useMemo(
    () =>
      Array.from({ length: calendarCells.length / 7 }, (_, week) => {
        const weekCells = calendarCells.slice(week * 7, week * 7 + 7);
        const activeDays = weekCells.filter((cell) => cell.count > 0);
        return {
          label: `Week ${week + 1}`,
          total: activeDays.reduce((sum, cell) => sum + cell.total, 0),
          tradeDays: activeDays.length,
        };
      }),
    [calendarCells],
  );

  const cumulativeSeries = useMemo(() => {
    let total = 0;
    const monthAscending = [...monthlyTrades].sort((a, b) => {
      const dateSort = a.date.localeCompare(b.date);
      return dateSort || (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    return [
      0,
      ...monthAscending.map((trade) => {
        total += trade.actualR;
        return total;
      }),
    ];
  }, [monthlyTrades]);

  const cumulativeChart = useMemo(() => chartShape(cumulativeSeries), [cumulativeSeries]);

  const radarScores = useMemo(
    () => [
      { label: "Win %", value: stats.winRate },
      { label: "Profit factor", value: clamp(stats.profitFactor === Infinity ? 100 : stats.profitFactor * 34, 0, 100) },
      { label: "Capture", value: clamp(stats.captureRate, 0, 100) },
      { label: "BE rate", value: stats.beRate },
      { label: "Consistency", value: clamp(100 - Math.abs(stats.avgActual - stats.avgMax) * 18, 0, 100) },
    ],
    [stats.avgActual, stats.avgMax, stats.beRate, stats.captureRate, stats.profitFactor, stats.winRate],
  );

  const radarPolygon = radarScores
    .map((item, index) => radarPoint(index, radarScores.length, item.value))
    .join(" ");
  const maxStrategyTotal = Math.max(1, ...strategyRows.map((item) => Math.abs(item.total)));

  function selectMonth(key: string) {
    setSelectedMonth(key);
    if (!editingId) {
      setDraft((current) => ({ ...current, date: `${key}-01` }));
    }
  }

  function updateDraft<K extends keyof DraftTrade>(field: K, value: DraftTrade[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetForm(month = selectedMonth) {
    setDraft(defaultDraft(month));
    setEditingId(null);
  }

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice("");

    try {
      const endpoint = editingId ? `/api/trades?id=${encodeURIComponent(editingId)}` : "/api/trades";
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as { trade?: ExitTrade; error?: string };
      if (!response.ok || !data.trade) {
        throw new Error(data.error ?? "Unable to save trade");
      }

      setTrades((current) =>
        editingId
          ? current.map((trade) => (trade.id === data.trade?.id ? data.trade : trade))
          : [data.trade as ExitTrade, ...current],
      );
      setSelectedMonth(monthKey(data.trade.date));
      resetForm(monthKey(data.trade.date));
      setNotice(editingId ? "Trade updated." : "Trade added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save trade");
    } finally {
      setIsSaving(false);
    }
  }

  function editTrade(trade: ExitTrade) {
    setEditingId(trade.id);
    setDraft({
      date: trade.date,
      beHit: trade.beHit,
      firstTpR: trade.firstTpR,
      maxR: trade.maxR,
      actualR: trade.actualR,
      notes: trade.notes,
    });
    setSelectedMonth(monthKey(trade.date));
  }

  async function deleteTrade(id: string) {
    setNotice("");
    try {
      const response = await fetch(`/api/trades?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete trade");
      }
      setTrades((current) => current.filter((trade) => trade.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setNotice("Trade deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete trade");
    }
  }

  async function addSampleTrades() {
    setIsSaving(true);
    setNotice("");
    try {
      const saved: ExitTrade[] = [];
      for (const trade of sampleTrades) {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(trade),
        });
        const data = (await response.json()) as { trade?: ExitTrade; error?: string };
        if (!response.ok || !data.trade) {
          throw new Error(data.error ?? "Unable to add sample trades");
        }
        saved.push(data.trade);
      }
      setTrades((current) => [...saved, ...current]);
      setSelectedMonth("2026-07");
      setNotice("Sample trades added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add sample trades");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setIsSaving(true);
      setNotice("");
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        const rawTrades = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === "object" && "trades" in parsed
            ? (parsed as { trades?: unknown[] }).trades ?? []
            : [];
        const normalized = rawTrades.map(normalizeTrade).filter((trade): trade is DraftTrade => !!trade);

        if (!normalized.length) {
          throw new Error("No valid trades found in that JSON file.");
        }

        for (const trade of normalized) {
          const response = await fetch("/api/trades", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(trade),
          });
          if (!response.ok) {
            const data = (await response.json()) as { error?: string };
            throw new Error(data.error ?? "Unable to import trades");
          }
        }

        await loadTrades();
        setNotice(`${normalized.length} trades imported.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to import trades");
      } finally {
        setIsSaving(false);
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  const formStrategy = strategyResult(draft);

  return (
    <main className="journal-shell">
      <header className="topbar" aria-label="Exit strategy journal header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Exit Strategy Journal</h1>
          <p className="subtle-line">BE first. Targets next. Compare the exit, not the memory.</p>
        </div>
        <div className="topbar-actions">
          <button
            className="utility-button"
            type="button"
            onClick={() =>
              downloadFile(
                "exit-strategy-journal.json",
                JSON.stringify({ trades: sortedTrades }, null, 2),
                "application/json",
              )
            }
          >
            Export JSON
          </button>
          <button
            className="utility-button"
            type="button"
            onClick={() => downloadFile("exit-strategy-journal.csv", toCsv(sortedTrades), "text/csv")}
          >
            Export CSV
          </button>
          <label className="utility-button file-button">
            Import
            <input accept="application/json,.json" type="file" onChange={handleImport} />
          </label>
          <button className="primary-button compact" type="button" onClick={() => resetForm()}>
            New Trade
          </button>
        </div>
      </header>

      <section className="metric-grid" aria-label="Journal statistics">
        <article className="metric-card primary-metric">
          <span>Net Actual R</span>
          <strong className={toneClass(stats.totalActual)}>{rValue(stats.totalActual)}</strong>
          <small>{stats.trades} logged trades</small>
        </article>
        <article className="metric-card visual-metric">
          <div>
            <span>Profit Factor</span>
            <strong>{ratio(stats.profitFactor)}</strong>
          </div>
          <div
            className="mini-ring"
            style={{
              background: `conic-gradient(var(--green) ${clamp(stats.profitFactor === Infinity ? 360 : stats.profitFactor * 90, 0, 360)}deg, var(--red) 0deg)`,
            }}
          >
            <span>{ratio(stats.profitFactor)}</span>
          </div>
        </article>
        <article className="metric-card visual-metric">
          <div>
            <span>Trade Win %</span>
            <strong>{percent(stats.winRate)}</strong>
          </div>
          <div
            className="mini-ring"
            style={{
              background: `conic-gradient(var(--green) ${stats.winRate * 3.6}deg, var(--red) 0deg)`,
            }}
          >
            <span>{stats.wins}/{stats.losses}</span>
          </div>
        </article>
        <article className="metric-card spread-metric">
          <span>Avg Win/Loss</span>
          <strong>{ratio(stats.avgWinLoss)}</strong>
          <div className="spread-bar">
            <span style={{ width: `${clamp(stats.avgWinLoss * 24, 8, 92)}%` }} />
          </div>
          <small>
            +{rValue(stats.grossWin)} / -{rValue(stats.grossLoss)}
          </small>
        </article>
        <article className="metric-card">
          <span>Capture Rate</span>
          <strong className={toneClass(stats.captureRate)}>{percent(stats.captureRate)}</strong>
          <small>Avg Max {rValue(stats.avgMax)}</small>
        </article>
        <article className="metric-card score-metric">
          <span>Exit Score</span>
          <strong>{stats.score.toFixed(1)}</strong>
          <small>{stats.bestMethod.label} leads</small>
        </article>
      </section>

      <nav className="month-tabs" aria-label="Month tabs">
        {monthOptions.map((month) => {
          const count = trades.filter((trade) => monthKey(trade.date) === month.key).length;
          return (
            <button
              className={selectedMonth === month.key ? "active" : ""}
              key={month.key}
              type="button"
              onClick={() => selectMonth(month.key)}
            >
              <span>{month.label}</span>
              <small>{count} trades</small>
            </button>
          );
        })}
      </nav>

      <section className="dashboard-grid" aria-label="Monthly dashboard">
        <article className="review-panel calendar-panel calendar-dominant">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Calendar</p>
              <h2>{monthOptions.find((month) => month.key === selectedMonth)?.label} Actual R</h2>
            </div>
            <div className="month-summary">
              <span>
                Actual <strong className={toneClass(monthlyStats.totalActual)}>{rValue(monthlyStats.totalActual)}</strong>
              </span>
              <span>
                Win <strong>{percent(monthlyStats.winRate)}</strong>
              </span>
              <span>
                Best <strong>{monthlyStats.best.label}</strong>
              </span>
            </div>
          </div>
          <div className="calendar-layout">
            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <strong className="calendar-head" key={day}>
                  {day}
                </strong>
              ))}
              {calendarCells.map((cell, index) => (
                <div
                  className={`calendar-cell ${cell.day ? toneClass(cell.total) : "blank"}`}
                  key={`${cell.date}-${index}`}
                >
                  {cell.day ? (
                    <>
                      <span>{cell.day}</span>
                      <strong>{cell.count ? rValue(cell.total) : ""}</strong>
                      <small>{cell.count ? `${cell.count} trades` : ""}</small>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="weekly-list">
              {weeklyRows.map((week) => (
                <div className="weekly-row" key={week.label}>
                  <span>{week.label}</span>
                  <strong className={toneClass(week.total)}>
                    {week.tradeDays ? rValue(week.total) : "--"}
                  </strong>
                  <small>{week.tradeDays ? `${week.tradeDays} trade days` : "No trades"}</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="analytics-rail">
          <article className="review-panel score-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Score</p>
                <h2>Exit Score</h2>
              </div>
              <span className="status-pill">{stats.score.toFixed(1)}</span>
            </div>
            <div className="radar-wrap">
              <svg aria-hidden="true" className="radar-chart" viewBox="0 0 156 156">
                <polygon className="radar-grid" points={radarScores.map((_, index) => radarPoint(index, radarScores.length, 100)).join(" ")} />
                <polygon className="radar-grid inner" points={radarScores.map((_, index) => radarPoint(index, radarScores.length, 66)).join(" ")} />
                <polygon className="radar-grid inner" points={radarScores.map((_, index) => radarPoint(index, radarScores.length, 33)).join(" ")} />
                <polygon className="radar-fill" points={radarPolygon} />
              </svg>
              <div className="score-details">
                {radarScores.map((item) => (
                  <span key={item.label}>
                    {item.label} <strong>{percent(item.value)}</strong>
                  </span>
                ))}
              </div>
            </div>
            <div className="score-bar">
              <span style={{ width: `${stats.score}%` }} />
            </div>
          </article>

          <article className="review-panel curve-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Curve</p>
                <h2>Daily Net Cumulative R</h2>
              </div>
            </div>
            <svg className="curve-chart" role="img" viewBox="0 0 340 142">
              <line className="curve-zero" x1="0" x2="340" y1={cumulativeChart.baseY} y2={cumulativeChart.baseY} />
              <polygon className="curve-area" points={cumulativeChart.area} />
              <polyline className="curve-line" points={cumulativeChart.pointList} />
            </svg>
          </article>

          <article className="review-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Comparison</p>
                <h2>Strategy Totals</h2>
              </div>
            </div>
            <div className="strategy-list compact-strategy">
              {strategyRows.map((row) => (
                <div className="strategy-row" key={row.key}>
                  <div>
                    <strong>{row.label}</strong>
                    <span>{percent(row.winRate)} win</span>
                  </div>
                  <div className="bar-track">
                    <span
                      className={row.total >= 0 ? "bar-positive" : "bar-negative"}
                      style={{ width: `${Math.max(5, (Math.abs(row.total) / maxStrategyTotal) * 100)}%` }}
                    />
                  </div>
                  <strong className={toneClass(row.total)}>{rValue(row.total)}</strong>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="operations-grid" aria-label="Trade operations">
        <section className="entry-panel" aria-labelledby="entry-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Entry</p>
              <h2 id="entry-heading">{editingId ? "Edit Trade" : "New Trade"}</h2>
            </div>
            <span className="status-pill">{selectedMonth}</span>
          </div>

          <form className="trade-form" onSubmit={saveTrade}>
            <div className="field-row">
              <label>
                Date
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => updateDraft("date", event.target.value)}
                />
              </label>
              <label>
                BE Hit?
                <select
                  value={draft.beHit}
                  onChange={(event) => updateDraft("beHit", event.target.value as BeHit)}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </label>
            </div>

            <div className="field-row">
              <label>
                First TP R
                <input
                  min="0.1"
                  step="0.1"
                  type="number"
                  value={draft.firstTpR}
                  onChange={(event) => updateDraft("firstTpR", Number(event.target.value))}
                />
              </label>
              <label>
                Max R
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={draft.maxR}
                  onChange={(event) => updateDraft("maxR", Number(event.target.value))}
                />
              </label>
              <label>
                Actual R
                <input
                  step="0.1"
                  type="number"
                  value={draft.actualR}
                  onChange={(event) => updateDraft("actualR", Number(event.target.value))}
                />
              </label>
            </div>

            <label>
              Notes
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
              />
            </label>

            <div className="formula-preview" aria-label="Strategy result preview">
              <span>First TP {rValue(formStrategy.firstTp)}</span>
              <span>1.5R {rValue(formStrategy.onePointFive)}</span>
              <span>2R {rValue(formStrategy.twoR)}</span>
              <span>3R {rValue(formStrategy.threeR)}</span>
            </div>

            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : editingId ? "Save Trade" : "Add Trade"}
            </button>
            {editingId ? (
              <button className="utility-button" type="button" onClick={() => resetForm()}>
                Cancel Edit
              </button>
            ) : null}
          </form>

          <div className="rule-note">
            <strong>BE gate:</strong> No means every planned strategy is -1R. Yes means
            Max R decides which targets were reached; missed targets count 0R.
          </div>

          {notice ? <p className="notice">{notice}</p> : null}
        </section>

        <section className="log-panel" aria-labelledby="log-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trade Log</p>
              <h2 id="log-heading">{monthOptions.find((month) => month.key === selectedMonth)?.label}</h2>
            </div>
            <div className="panel-actions">
              <button className="utility-button" type="button" onClick={() => void loadTrades()}>
                Refresh
              </button>
              <button
                className="utility-button"
                disabled={isSaving}
                type="button"
                onClick={() => void addSampleTrades()}
              >
                Add Sample
              </button>
            </div>
          </div>

          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>BE</th>
                  <th>First TP</th>
                  <th>Max</th>
                  <th>Actual</th>
                  <th>First TP</th>
                  <th>1.5R</th>
                  <th>2R</th>
                  <th>3R</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrades.map((trade) => {
                  const result = strategyResult(trade);
                  return (
                    <tr key={trade.id}>
                      <td>{trade.date}</td>
                      <td>{dayName(trade.date)}</td>
                      <td>
                        <span className={trade.beHit === "Yes" ? "be-pill yes" : "be-pill no"}>
                          {trade.beHit}
                        </span>
                      </td>
                      <td>{rValue(trade.firstTpR)}</td>
                      <td>{rValue(trade.maxR)}</td>
                      <td className={toneClass(trade.actualR)}>{rValue(trade.actualR)}</td>
                      <td className={toneClass(result.firstTp)}>{rValue(result.firstTp)}</td>
                      <td className={toneClass(result.onePointFive)}>
                        {rValue(result.onePointFive)}
                      </td>
                      <td className={toneClass(result.twoR)}>{rValue(result.twoR)}</td>
                      <td className={toneClass(result.threeR)}>{rValue(result.threeR)}</td>
                      <td className="notes-cell">{trade.notes || "No note"}</td>
                      <td>
                        <div className="table-actions">
                          <button className="table-action" type="button" onClick={() => editTrade(trade)}>
                            Edit
                          </button>
                          <button
                            className="table-action danger"
                            type="button"
                            onClick={() => void deleteTrade(trade.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!monthlyTrades.length ? (
                  <tr>
                    <td className="empty-row" colSpan={12}>
                      {isLoading ? "Loading trades..." : "No trades logged for this month yet."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
