import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Camera, RentalContract } from '../types';
import { BarChart3, Info, TrendingUp } from 'lucide-react';

interface ChartDataPoint {
  id: string;
  name: string;
  fullName: string;
  category: Camera['category'];
  frequency: number;
}

interface RentalFrequencyChartProps {
  cameras: Camera[];
  contracts: RentalContract[];
  systemDate: string;
}

export default function RentalFrequencyChart({
  cameras,
  contracts,
  systemDate,
}: RentalFrequencyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
    data?: ChartDataPoint;
  }>({ x: 0, y: 0, visible: false });

  // 1. Process data for the last 30 days relative to systemDate
  const d3Data = useMemo<ChartDataPoint[]>(() => {
    const sys = new Date(systemDate);
    const thirtyDaysAgo = new Date(sys.getTime() - 30 * 24 * 60 * 60 * 1000);

    const counts: Record<string, number> = {};
    contracts.forEach((c) => {
      if (c.status === 'Cancelled') return;
      const start = new Date(c.startDate);
      // Within last month (30 days) of systemDate
      if (start >= thirtyDaysAgo && start <= sys) {
        c.items.forEach((item) => {
          counts[item.cameraId] = (counts[item.cameraId] || 0) + item.quantity;
        });
      }
    });

    return cameras
      .map((cam) => ({
        id: cam.id,
        name: cam.shortName,
        fullName: cam.name,
        category: cam.category,
        frequency: counts[cam.id] || 0,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }, [cameras, contracts, systemDate]);

  // Compute Vietnamese Date Range label
  const dateRangeLabel = useMemo(() => {
    const sys = new Date(systemDate);
    const thirtyDaysAgo = new Date(sys.getTime() - 30 * 24 * 60 * 60 * 1000);

    const format = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    return `${format(thirtyDaysAgo)} - ${format(sys)}`;
  }, [systemDate]);

  // Total hires helper
  const totalHires = useMemo(() => {
    return d3Data.reduce((acc, curr) => acc + curr.frequency, 0);
  }, [d3Data]);

  // 2. Responsive container observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Set width, minimum 350px, height fixed at 320px
      setDimensions({
        width: Math.max(width, 350),
        height: 320,
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 3. Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || d3Data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous rendering

    const { width, height } = dimensions;
    const margin = { top: 30, right: 20, bottom: 50, left: 45 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scale domains
    const x = d3
      .scaleBand()
      .domain(d3Data.map((d) => d.name))
      .range([0, chartWidth])
      .padding(0.35);

    const maxVal = Math.max(...d3Data.map((d) => d.frequency), 0) || 1;
    // ensure at least 5 for scale if values are very low
    const yMaxLimit = Math.max(maxVal + 1, 5);

    const y = d3
      .scaleLinear()
      .domain([0, yMaxLimit])
      .nice()
      .range([chartHeight, 0]);

    // Grid lines
    chartGroup
      .append('g')
      .attr('class', 'grid-lines text-gray-100')
      .style('stroke-dasharray', '3,3')
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(yMaxLimit, 10))
          .tickSize(-chartWidth)
          .tickFormat(() => '')
      )
      .call((g) => g.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', '#f3f4f6');

    // Gradient helper for bars
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'orange-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ea580c'); // orange-600

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f97316'); // orange-500

    // X Axis
    const xAxisGroup = chartGroup
      .append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(x));

    xAxisGroup
      .selectAll('text')
      .attr('class', 'text-xs font-semibold text-gray-650')
      .style('text-anchor', d3Data.length > 7 ? 'end' : 'middle')
      .attr('dx', d3Data.length > 7 ? '-.6em' : '0')
      .attr('dy', d3Data.length > 7 ? '.15em' : '.75em')
      .attr('transform', d3Data.length > 7 ? 'rotate(-30)' : 'rotate(0)');

    xAxisGroup.select('.domain').attr('stroke', '#e5e7eb');
    xAxisGroup.selectAll('line').attr('stroke', '#e5e7eb');

    // Y Axis
    const yAxisGroup = chartGroup
      .append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(yMaxLimit, 5))
          .tickFormat(d3.format('d'))
      );

    yAxisGroup.selectAll('text').attr('class', 'text-xs font-mono font-medium text-gray-500');
    yAxisGroup.select('.domain').remove(); // remove left axis border for a cleaner layout
    yAxisGroup.selectAll('line').attr('stroke', '#e5e7eb');

    // Render Bars
    const bars = chartGroup
      .selectAll('.bar-group')
      .data(d3Data)
      .enter()
      .append('g')
      .attr('class', 'bar-group');

    bars
      .append('rect')
      .attr('class', 'bar transition-all duration-350 cursor-pointer')
      .attr('x', (d: ChartDataPoint) => x(d.name) || 0)
      .attr('y', chartHeight) // Animation start position
      .attr('width', x.bandwidth())
      .attr('height', 0) // Animation start height
      .attr('rx', 5) // Rounded ears
      .attr('fill', 'url(#orange-gradient)')
      .on('mouseover', function (event: any, d: ChartDataPoint) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', '#c2410c') // orange-700 on hover
          .attr('filter', 'drop-shadow(0px 4px 6px rgba(234, 88, 12, 0.25))');

        // Show Tooltip
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip({
          x: mx,
          y: my - 10,
          visible: true,
          data: d,
        });
      })
      .on('mousemove', function (event: any) {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip((prev) => ({
          ...prev,
          x: mx,
          y: my - 10,
        }));
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', 'url(#orange-gradient)')
          .attr('filter', 'none');

        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y', (d: ChartDataPoint) => y(d.frequency))
      .attr('height', (d: ChartDataPoint) => chartHeight - y(d.frequency));

    // Optional: Add value labels on top of bars
    bars
      .append('text')
      .attr('class', 'bar-value text-[10px] font-extrabold text-orange-700 text-center select-none pointer-events-none opacity-0')
      .attr('x', (d: ChartDataPoint) => (x(d.name) || 0) + x.bandwidth() / 2)
      .attr('y', (d: ChartDataPoint) => y(d.frequency) - 6)
      .attr('text-anchor', 'middle')
      .text((d: ChartDataPoint) => (d.frequency > 0 ? d.frequency : ''))
      .transition()
      .delay(400)
      .duration(400)
      .style('opacity', 1);

  }, [dimensions, d3Data]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header element */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" /> Tần Suất Thuê Thiết Bị Trong Tháng
          </h3>
          <p className="text-xs text-gray-400 font-medium">
            Phân tích số lượt thuê thiết bị từ <span className="font-bold text-gray-700">{dateRangeLabel}</span>
          </p>
        </div>
        <div className="bg-orange-50/70 border border-orange-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto shadow-3xs">
          <span className="text-[10px] uppercase font-extrabold text-orange-800 tracking-wider">Tổng lượt thuê:</span>
          <span className="font-mono text-xs font-black text-orange-700 bg-white px-2 py-0.5 rounded-md border border-orange-200/50">
            {totalHires}
          </span>
        </div>
      </div>

      {/* Responsive Visual SVG area */}
      <div ref={containerRef} className="relative w-full overflow-hidden bg-gray-50/50 rounded-xl border border-gray-100 p-2 min-h-[320px]">
        {d3Data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-400 italic text-xs font-semibold">
            <Info className="w-5 h-5 text-gray-300 mb-1" />
            Chưa có lượt thuê khôi phục nào được ghi nhận trong khoảng thời gian này.
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height={dimensions.height}
            className="block overflow-visible"
          />
        )}

        {/* Custom Rich Floating Tooltip */}
        {tooltip.visible && tooltip.data && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl shadow-lg border border-slate-700/50 text-wrap transition-all duration-75 max-w-xs"
            style={{
              left: `${tooltip.x + 10}px`,
              top: `${tooltip.y - 70}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-600 text-white font-extrabold uppercase">
                  {tooltip.data.name}
                </span>
                <span className="text-[9px] text-slate-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  {tooltip.data.category === 'Body' ? 'Thân máy' :
                   tooltip.data.category === 'Lens' ? 'Ống kính' :
                   tooltip.data.category === 'Combo' ? 'Bộ máy' : 'Phụ kiện'}
                </span>
              </div>
              <h4 className="font-bold text-xs leading-relaxed text-slate-100">
                {tooltip.data.fullName}
              </h4>
              <div className="border-t border-slate-800/80 pt-1 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-medium">Số lần thuê tháng qua:</span>
                <span className="font-mono text-xs font-black text-orange-400">
                  {tooltip.data.frequency} lượt
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
