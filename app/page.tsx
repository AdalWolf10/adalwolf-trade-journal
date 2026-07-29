"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Trade = {
  id: string;
  date: string;
  symbol: string;
  direction: "Long" | "Short";
  setup: string;
  session: string;
  risk: number;
  pnl: number;
  entry: number;
  exit: number;
  grade: "A" | "B" | "C";
  notes: string;
  tags: string[];
};

type TradeForm = Omit<Trade, "id" | "tags"> & {
  tags: string;
};

const storageKey = "trade-journal.entries.v1";

const sampleTrades: Trade[] = [
  {
    id: "sample-1",
    date: "2026-07-28",
    symbol: "ES",
    direction: "Long",
    setup: "Opening range reclaim",
    session: "New York AM",
    risk: 250,
    pnl: 560,
    entry: 6374.25,
    exit: 6380.75,
    grade: "A",
    notes: "Waited for the second hold above VWAP and scaled at target two.",
    tags: ["patience", "vwap", "scale-out"],
  },
  {
    id: "sample-2",
    date: "2026-07-25",
    symbol: "NQ",
    direction: "Short",
    setup: "Failed breakout",
    session: "New York AM",
    risk: 300,
    pnl: -210,
    entry: 23184.5,
    exit: 23202,
    grade: "B",
    notes: "Good read, early add was unnecessary after the first rejection.",
    tags: ["breakout", "early-add"],
  },
  {
    id: "sample-3",
    date: "2026-07-24",
    symbol: "AAPL",
    direction: "Long",
    setup: "Daily flag continuation",
    session: "Swing",
    risk: 180,
    pnl: 310,
    entry: 213.4,
    exit: 216.8,
    grade: "A",
    notes: "Clean structure, small size, no urge to micromanage.",
    tags: ["daily", "continuation"],
  },
  {
    id: "sample-4",
    date: "2026-07-23",
    symbol: "TSLA",
    direction: "Short",
    setup: "Liquidity sweep",
    session: "New York PM",
    risk: 220,
    pnl: -220,
    entry: 319.2,
    exit: 321.05,
    grade: "C",
    notes: "Entered before confirmation and ignored the slower tape.",
    tags: ["impulse", "confirmation"],
  },
  {
    id: "sample-5",
    date: "2026-07-22",
    symbol: "MES",
    direction: "Long",
    setup: "Pullback to prior high",
    session: "New York AM",
    risk: 120,
    pnl: 195,
    entry: 6342.25,
    exit: 6346.75,
    grade: "B",
    notes: "Managed well after entry, but stop could have been tighter.",
    tags: ["pullback", "prior-high"],
  },
];

const emptyForm: TradeForm = {
  date: new Date().toISOString().slice(0, 10),
  symbol: "",
  direction: "Long",
  setup: "",
  session: "New York AM",
  risk: 100,
  pnl: 0,
  entry: 0,
  exit: 0,
  grade: "B",
  notes: "",
  tags: "",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function decimal(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `trade-${Date.now()}`;
}

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

function toCsv(trades: Trade[]) {
  const headers = [
    "date",
    "symbol",
    "direction",
    "setup",
    "session",
    "risk",
    "pnl",
    "rMultiple",
    "entry",
    "exit",
    "grade",
    "tags",
    "notes",
  ];

  const escapeCell = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;

  const rows = trades.map((trade) => [
    trade.date,
    trade.symbol,
    trade.direction,
    trade.setup,
    trade.session,
    trade.risk,
    trade.pnl,
    decimal(trade.pnl / trade.risk),
    trade.entry,
    trade.exit,
    trade.grade,
    trade.tags.join(" | "),
    trade.notes,
  ]);

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

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>(sampleTrades);
  const [form, setForm] = useState<TradeForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<"All" | "Wins" | "Losses">(
    "All",
  );
  const [activeTag, setActiveTag] = useState("All");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Trade[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrades(parsed);
        }
      }
    } catch {
      setTrades(sampleTrades);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(storageKey, JSON.stringify(trades));
    }
  }, [hydrated, trades]);

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => b.date.localeCompare(a.date)),
    [trades],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    trades.forEach((trade) => trade.tags.forEach((tag) => tags.add(tag)));
    return ["All", ...Array.from(tags).sort()];
  }, [trades]);

  const filteredTrades = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedTrades.filter((trade) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          trade.symbol,
          trade.setup,
          trade.session,
          trade.notes,
          trade.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesResult =
        resultFilter === "All" ||
        (resultFilter === "Wins" && trade.pnl > 0) ||
        (resultFilter === "Losses" && trade.pnl < 0);
      const matchesTag = activeTag === "All" || trade.tags.includes(activeTag);

      return matchesQuery && matchesResult && matchesTag;
    });
  }, [activeTag, query, resultFilter, sortedTrades]);

  const stats = useMemo(() => {
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const wins = trades.filter((trade) => trade.pnl > 0);
    const losses = trades.filter((trade) => trade.pnl < 0);
    const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
    const totalR = trades.reduce((sum, trade) => sum + trade.pnl / trade.risk, 0);
    const avgR = trades.length ? totalR / trades.length : 0;
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const expectancy = trades.length ? totalPnl / trades.length : 0;
    const bestTrade = trades.reduce(
      (best, trade) => (trade.pnl > best.pnl ? trade : best),
      trades[0] ?? sampleTrades[0],
    );

    let streak = 0;
    let streakType = "No streak";
    for (const trade of sortedTrades) {
      if (trade.pnl === 0) {
        break;
      }

      const currentType = trade.pnl > 0 ? "Win" : "Loss";
      if (streak === 0) {
        streakType = currentType;
        streak = 1;
        continue;
      }

      if (streakType !== currentType) {
        break;
      }

      streak += 1;
    }

    return {
      avgR,
      bestTrade,
      expectancy,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
      streak,
      streakType,
      totalPnl,
      trades: trades.length,
      winRate,
    };
  }, [sortedTrades, trades]);

  const setupBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; pnl: number }>();
    trades.forEach((trade) => {
      const current = map.get(trade.setup) ?? { count: 0, pnl: 0 };
      map.set(trade.setup, {
        count: current.count + 1,
        pnl: current.pnl + trade.pnl,
      });
    });

    return Array.from(map.entries())
      .map(([setup, value]) => ({ setup, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [trades]);

  const maxSetupCount = Math.max(1, ...setupBreakdown.map((item) => item.count));

  function updateField<K extends keyof TradeForm>(field: K, value: TradeForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTrade: Trade = {
      ...form,
      id: makeId(),
      symbol: form.symbol.trim().toUpperCase(),
      setup: form.setup.trim(),
      session: form.session.trim(),
      notes: form.notes.trim(),
      risk: Math.max(1, Number(form.risk)),
      pnl: Number(form.pnl),
      entry: Number(form.entry),
      exit: Number(form.exit),
      tags: normalizeTags(form.tags),
    };

    if (!nextTrade.symbol || !nextTrade.setup) {
      return;
    }

    setTrades((current) => [nextTrade, ...current]);
    setForm({
      ...emptyForm,
      date: nextTrade.date,
      session: nextTrade.session,
      risk: nextTrade.risk,
    });
  }

  function deleteTrade(id: string) {
    setTrades((current) => current.filter((trade) => trade.id !== id));
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Trade[];
        if (Array.isArray(parsed)) {
          setTrades(parsed);
          setActiveTag("All");
          setResultFilter("All");
          setQuery("");
        }
      } catch {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="journal-shell">
      <header className="topbar" aria-label="Trade journal header">
        <div>
          <p className="eyebrow">Personal trading workspace</p>
          <h1>Trade Journal</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="utility-button"
            type="button"
            onClick={() =>
              downloadFile(
                "trade-journal.json",
                JSON.stringify(trades, null, 2),
                "application/json",
              )
            }
          >
            Export JSON
          </button>
          <button
            className="utility-button"
            type="button"
            onClick={() => downloadFile("trade-journal.csv", toCsv(trades), "text/csv")}
          >
            Export CSV
          </button>
          <label className="utility-button file-button">
            Import
            <input accept="application/json,.json" type="file" onChange={handleImport} />
          </label>
        </div>
      </header>

      <section className="metric-grid" aria-label="Trading statistics">
        <article className="metric-card">
          <span>Total P/L</span>
          <strong className={stats.totalPnl >= 0 ? "positive" : "negative"}>
            {money(stats.totalPnl)}
          </strong>
        </article>
        <article className="metric-card">
          <span>Win Rate</span>
          <strong>{decimal(stats.winRate, 0)}%</strong>
        </article>
        <article className="metric-card">
          <span>Average R</span>
          <strong className={stats.avgR >= 0 ? "positive" : "negative"}>
            {decimal(stats.avgR)}
          </strong>
        </article>
        <article className="metric-card">
          <span>Expectancy</span>
          <strong className={stats.expectancy >= 0 ? "positive" : "negative"}>
            {money(stats.expectancy)}
          </strong>
        </article>
        <article className="metric-card">
          <span>Profit Factor</span>
          <strong>{stats.profitFactor === Infinity ? "--" : decimal(stats.profitFactor)}</strong>
        </article>
        <article className="metric-card">
          <span>Current Streak</span>
          <strong>
            {stats.streak ? `${stats.streak} ${stats.streakType}` : "Flat"}
          </strong>
        </article>
      </section>

      <div className="workspace-grid">
        <section className="entry-panel" aria-labelledby="new-trade-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Execution</p>
              <h2 id="new-trade-heading">New Trade</h2>
            </div>
            <span className="status-pill">{stats.trades} logged</span>
          </div>

          <form className="trade-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                />
              </label>
              <label>
                Symbol
                <input
                  placeholder="ES"
                  value={form.symbol}
                  onChange={(event) => updateField("symbol", event.target.value)}
                />
              </label>
            </div>

            <div className="field-row">
              <label>
                Direction
                <select
                  value={form.direction}
                  onChange={(event) =>
                    updateField("direction", event.target.value as TradeForm["direction"])
                  }
                >
                  <option>Long</option>
                  <option>Short</option>
                </select>
              </label>
              <label>
                Grade
                <select
                  value={form.grade}
                  onChange={(event) =>
                    updateField("grade", event.target.value as TradeForm["grade"])
                  }
                >
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                </select>
              </label>
            </div>

            <label>
              Setup
              <input
                placeholder="Opening range reclaim"
                value={form.setup}
                onChange={(event) => updateField("setup", event.target.value)}
              />
            </label>

            <label>
              Session
              <input
                placeholder="New York AM"
                value={form.session}
                onChange={(event) => updateField("session", event.target.value)}
              />
            </label>

            <div className="field-row">
              <label>
                Risk
                <input
                  min="1"
                  step="1"
                  type="number"
                  value={form.risk}
                  onChange={(event) => updateField("risk", Number(event.target.value))}
                />
              </label>
              <label>
                P/L
                <input
                  step="1"
                  type="number"
                  value={form.pnl}
                  onChange={(event) => updateField("pnl", Number(event.target.value))}
                />
              </label>
            </div>

            <div className="field-row">
              <label>
                Entry
                <input
                  step="0.01"
                  type="number"
                  value={form.entry}
                  onChange={(event) => updateField("entry", Number(event.target.value))}
                />
              </label>
              <label>
                Exit
                <input
                  step="0.01"
                  type="number"
                  value={form.exit}
                  onChange={(event) => updateField("exit", Number(event.target.value))}
                />
              </label>
            </div>

            <label>
              Tags
              <input
                placeholder="patience, vwap"
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
              />
            </label>

            <label>
              Notes
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>

            <button className="primary-button" type="submit">
              Add Trade
            </button>
          </form>
        </section>

        <section className="log-panel" aria-labelledby="trade-log-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Review</p>
              <h2 id="trade-log-heading">Trade Log</h2>
            </div>
            <button className="utility-button" type="button" onClick={() => setTrades(sampleTrades)}>
              Reset Sample
            </button>
          </div>

          <div className="filters">
            <label className="search-field">
              Search
              <input
                placeholder="Symbol, setup, tag"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="segmented-control" aria-label="Result filter">
              {(["All", "Wins", "Losses"] as const).map((filter) => (
                <button
                  className={resultFilter === filter ? "active" : ""}
                  key={filter}
                  type="button"
                  onClick={() => setResultFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="tag-strip" aria-label="Tag filter">
            {allTags.map((tag) => (
              <button
                className={activeTag === tag ? "active" : ""}
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="trade-table-wrap">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Setup</th>
                  <th>R</th>
                  <th>P/L</th>
                  <th>Grade</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => {
                  const rMultiple = trade.pnl / trade.risk;
                  return (
                    <tr key={trade.id}>
                      <td>{trade.date}</td>
                      <td>
                        <strong>{trade.symbol}</strong>
                        <span>{trade.direction}</span>
                      </td>
                      <td>
                        <strong>{trade.setup}</strong>
                        <span>{trade.session}</span>
                      </td>
                      <td className={rMultiple >= 0 ? "positive" : "negative"}>
                        {decimal(rMultiple)}
                      </td>
                      <td className={trade.pnl >= 0 ? "positive" : "negative"}>
                        {money(trade.pnl)}
                      </td>
                      <td>
                        <span className={`grade grade-${trade.grade.toLowerCase()}`}>
                          {trade.grade}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => deleteTrade(trade.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="review-grid" aria-label="Review summary">
        <article className="review-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Patterns</p>
              <h2>Setup Mix</h2>
            </div>
          </div>
          <div className="setup-bars">
            {setupBreakdown.map((item) => (
              <div className="setup-bar" key={item.setup}>
                <div className="setup-label">
                  <strong>{item.setup}</strong>
                  <span>{item.count} trades</span>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${(item.count / maxSetupCount) * 100}%` }} />
                </div>
                <span className={item.pnl >= 0 ? "positive" : "negative"}>
                  {money(item.pnl)}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="review-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Reflection</p>
              <h2>Recent Notes</h2>
            </div>
            <span className="status-pill">
              Best: {stats.bestTrade?.symbol ?? "--"}
            </span>
          </div>
          <div className="note-list">
            {sortedTrades.slice(0, 4).map((trade) => (
              <div className="note-item" key={trade.id}>
                <div>
                  <strong>
                    {trade.symbol} / {trade.grade}
                  </strong>
                  <span>{trade.setup}</span>
                </div>
                <p>{trade.notes || "No note added."}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
