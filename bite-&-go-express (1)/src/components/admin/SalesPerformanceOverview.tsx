import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Order } from '../../types';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Calendar,
  Sparkles,
  BarChart2,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface SalesPerformanceOverviewProps {
  orders: Order[];
}

interface DayData {
  date: Date;
  dateKey: string;
  dayLabel: string;
  fullDateLabel: string;
  orderCount: number;
  revenue: number;
  foodRevenue: number;
  deliveryFees: number;
  completedCount: number;
  cancelledCount: number;
}

export const SalesPerformanceOverview: React.FC<SalesPerformanceOverviewProps> = ({ orders }) => {
  const [metric, setMetric] = useState<'volume' | 'revenue'>('volume');
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate 7-day data (from 6 days ago up to today)
  const last7DaysData: DayData[] = useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayOrders = orders.filter((o) => {
        const orderTime = new Date(o.createdAt).getTime();
        return orderTime >= d.getTime() && orderTime < nextD.getTime();
      });

      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateKey = d.toISOString().split('T')[0];

      const orderCount = dayOrders.length;
      const validDayOrders = dayOrders.filter((o) => o.status !== 'cancelled');
      const revenue = validDayOrders.reduce((sum, o) => sum + o.total, 0);
      const deliveryFees = validDayOrders
        .filter((o) => o.orderType === 'delivery' || (o.orderType as string) === 'pos_delivery' || Boolean(o.deliveryAddress))
        .reduce((sum, o) => sum + (o.deliveryFee || 150), 0);
      const foodRevenue = Math.max(0, revenue - deliveryFees);
      const completedCount = dayOrders.filter((o) => o.status === 'delivered').length;
      const cancelledCount = dayOrders.filter((o) => o.status === 'cancelled').length;

      days.push({
        date: d,
        dateKey,
        dayLabel: i === 0 ? 'Today' : dayLabel,
        fullDateLabel,
        orderCount,
        revenue,
        foodRevenue,
        deliveryFees,
        completedCount,
        cancelledCount,
      });
    }

    return days;
  }, [orders]);

  // Key performance summaries
  const total7DayOrders = useMemo(
    () => last7DaysData.reduce((sum, d) => sum + d.orderCount, 0),
    [last7DaysData]
  );
  const total7DayRevenue = useMemo(
    () => last7DaysData.reduce((sum, d) => sum + d.revenue, 0),
    [last7DaysData]
  );
  const total7DayFoodRevenue = useMemo(
    () => last7DaysData.reduce((sum, d) => sum + d.foodRevenue, 0),
    [last7DaysData]
  );
  const total7DayDeliveryFees = useMemo(
    () => last7DaysData.reduce((sum, d) => sum + d.deliveryFees, 0),
    [last7DaysData]
  );
  const total7DayItemsCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return orders
      .filter((o) => new Date(o.createdAt).getTime() >= sevenDaysAgo && o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.items || []).reduce((iSum, it) => iSum + (it.quantity || 1), 0), 0);
  }, [orders]);
  const avgDailyOrders = Math.round((total7DayOrders / 7) * 10) / 10;
  const peakDay = useMemo(() => {
    return [...last7DaysData].sort((a, b) => b.orderCount - a.orderCount)[0];
  }, [last7DaysData]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 600;
    const width = Math.max(340, containerWidth);
    const height = 240;
    const margin = { top: 25, right: 25, bottom: 35, left: metric === 'volume' ? 35 : 55 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Defs: Linear gradient for modern neon/ambient glow
    const defs = svg.append('defs');

    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-sales-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    const isVol = metric === 'volume';
    const mainColor = isVol ? '#f59e0b' : '#10b981'; // Amber for volume, Emerald for revenue

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', mainColor)
      .attr('stop-opacity', 0.4);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', mainColor)
      .attr('stop-opacity', 0.0);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scalePoint<string>()
      .domain(last7DaysData.map((d) => d.dateKey))
      .range([0, innerWidth])
      .padding(0.2);

    const maxValue = d3.max(last7DaysData, (d) => (isVol ? d.orderCount : d.revenue)) || 1;
    const yMax = Math.max(isVol ? 5 : 5000, Math.ceil(maxValue * 1.25));

    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

    // Horizontal Grid Lines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#262626')
      .attr('stroke-dasharray', '3,3');

    g.select('.domain').remove();

    // Area Generator
    const areaGenerator = d3
      .area<DayData>()
      .x((d) => xScale(d.dateKey) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(isVol ? d.orderCount : d.revenue))
      .curve(d3.curveMonotoneX);

    // Line Generator
    const lineGenerator = d3
      .line<DayData>()
      .x((d) => xScale(d.dateKey) || 0)
      .y((d) => yScale(isVol ? d.orderCount : d.revenue))
      .curve(d3.curveMonotoneX);

    // Draw Area
    g.append('path')
      .datum(last7DaysData)
      .attr('fill', 'url(#d3-sales-area-gradient)')
      .attr('d', areaGenerator);

    // Draw Line
    g.append('path')
      .datum(last7DaysData)
      .attr('fill', 'none')
      .attr('stroke', mainColor)
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator);

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => {
        const item = last7DaysData.find((x) => x.dateKey === d);
        return item ? item.dayLabel : '';
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((ax) => ax.select('.domain').attr('stroke', '#3f3f46'))
      .selectAll('text')
      .attr('fill', '#a1a1aa')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('dy', '1em');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => {
        const val = d.valueOf();
        if (isVol) return `${val}`;
        if (val >= 1000) return `${Math.round(val / 1000)}k`;
        return `${val}`;
      });

    g.append('g')
      .call(yAxis)
      .call((ax) => ax.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Interactive Points & Overlay
    last7DaysData.forEach((d) => {
      const cx = xScale(d.dateKey) || 0;
      const cy = yScale(isVol ? d.orderCount : d.revenue);

      // Outer glow pulse
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 5)
        .attr('fill', mainColor)
        .attr('opacity', 0.3);

      // Core point
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 3.5)
        .attr('fill', '#09090b')
        .attr('stroke', mainColor)
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer');

      // Value label on peak or latest point
      if (d === peakDay || d === last7DaysData[last7DaysData.length - 1]) {
        g.append('text')
          .attr('x', cx)
          .attr('y', cy - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', mainColor)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .text(isVol ? `${d.orderCount}` : `Rs.${(d.revenue / 1000).toFixed(1)}k`);
      }

      // Invisible touch/hover target rect for each column
      g.append('rect')
        .attr('x', cx - (innerWidth / 7) / 2)
        .attr('y', 0)
        .attr('width', innerWidth / 7)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseenter', () => setHoveredDay(d))
        .on('mouseleave', () => setHoveredDay(null));
    });
  }, [last7DaysData, metric]);

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Sales Performance Overview</span>
              </h3>
              <span className="text-[10px] bg-neutral-800 text-amber-400 border border-neutral-700 px-2 py-0.5 rounded font-mono font-bold">
                D3.js ENGINE
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Interactive 7-day order volume &amp; revenue trend visualization
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('volume')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              metric === 'volume'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Order Volume</span>
          </button>
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              metric === 'revenue'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Gross Revenue</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-amber-400" />
            <span>7-Day Volume</span>
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
            {total7DayOrders} <span className="text-xs font-normal text-neutral-400">orders</span>
          </p>
          <p className="text-[10px] text-amber-400/90 mt-0.5 font-mono font-medium">
            {total7DayItemsCount} dish units sold
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span>7-Day Revenue</span>
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            Rs. {total7DayRevenue.toLocaleString()}
          </p>
          <div className="text-[10px] text-neutral-400 mt-0.5 space-y-0.5">
            <span className="block text-amber-300 font-mono">🍔 Food: Rs. {total7DayFoodRevenue.toLocaleString()}</span>
            <span className="block text-cyan-300 font-mono">🛵 Riders: Rs. {total7DayDeliveryFees.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span>Daily Average</span>
          </span>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1 tabular-nums">
            {avgDailyOrders} <span className="text-xs font-normal text-neutral-400">orders/day</span>
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
            ~Rs. {Math.round(total7DayRevenue / 7).toLocaleString()}/day
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Peak Day</span>
          </span>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {peakDay ? peakDay.orderCount : 0} <span className="text-xs font-normal text-neutral-400">orders</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {peakDay ? `${peakDay.dayLabel} (${peakDay.fullDateLabel})` : 'N/A'}
          </p>
        </div>
      </div>

      {/* D3 SVG Chart Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg ref={svgRef} className="w-full h-60 overflow-visible" />

        {/* Hover Tooltip Overlay */}
        {hoveredDay && (
          <div className="absolute top-2 right-2 p-3 rounded-xl bg-neutral-950/95 border border-neutral-800 backdrop-blur-md shadow-2xl text-xs space-y-1 pointer-events-none animate-in fade-in">
            <div className="flex items-center justify-between gap-4 font-bold text-white border-b border-neutral-800 pb-1">
              <span>{hoveredDay.dayLabel} ({hoveredDay.fullDateLabel})</span>
              <span className="font-mono text-amber-400">{hoveredDay.orderCount} Orders</span>
            </div>
            <div className="text-neutral-300 flex justify-between gap-3 text-[11px]">
              <span className="text-neutral-400">Gross Total:</span>
              <span className="font-mono font-bold text-emerald-400">
                Rs. {hoveredDay.revenue.toLocaleString()}
              </span>
            </div>
            <div className="text-neutral-300 flex justify-between gap-3 text-[10.5px]">
              <span className="text-amber-400">🍔 Food Sales:</span>
              <span className="font-mono text-amber-300">
                Rs. {hoveredDay.foodRevenue.toLocaleString()}
              </span>
            </div>
            <div className="text-neutral-300 flex justify-between gap-3 text-[10.5px]">
              <span className="text-cyan-400">🛵 Rider Fees:</span>
              <span className="font-mono text-cyan-300">
                Rs. {hoveredDay.deliveryFees.toLocaleString()}
              </span>
            </div>
            <div className="text-neutral-300 flex justify-between gap-3 text-[11px] pt-0.5 border-t border-neutral-800/80">
              <span className="text-neutral-400">Delivered / Finished:</span>
              <span className="font-mono text-white">{hoveredDay.completedCount}</span>
            </div>
            {hoveredDay.cancelledCount > 0 && (
              <div className="text-red-400 flex justify-between gap-3 text-[11px]">
                <span>Cancelled / Declined:</span>
                <span className="font-mono">{hoveredDay.cancelledCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Notes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-850 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>Interactive D3 trend chart. Hover over any day column to view detailed metrics.</span>
        </span>
        <span className="font-mono text-neutral-500 text-[11px]">
          Data refreshed live with incoming orders
        </span>
      </div>
    </div>
  );
};
