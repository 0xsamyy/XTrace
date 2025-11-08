// src/components/BottomPanel.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { recomputeForActiveRange } from '../appController';
import { scaleTime, type ScaleTime } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { brushX, brushSelection, type D3BrushEvent } from 'd3-brush';
import { timeMonth } from 'd3-time';
import { timeFormat } from 'd3-time-format';
import { select } from 'd3-selection';
import './BottomPanel.css';

const MARGIN = { top: 10, right: 30, bottom: 30, left: 30 };
const PANEL_HEIGHT = 120;
const HEIGHT = PANEL_HEIGHT - MARGIN.top - MARGIN.bottom;

export function BottomPanel() {
  const svgRef = useRef<SVGSVGElement>(null);

  const fullTimeRange = useDataStore((s) => s.fullTimeRange);
  const setAnimationMode = useDataStore((s) => s.setAnimationMode);

  const timeRangeActive = useFilterStore((s) => s.timeRangeActive);
  const setTimeRangeActive = useFilterStore((s) => s.setTimeRangeActive);

  const xScale = useMemo(() => {
    if (!fullTimeRange) return null;
    let start = new Date(fullTimeRange.start);
    let end = new Date(fullTimeRange.end);
    if (start.getTime() === end.getTime()) end = new Date(end.getTime() + 60_000);
    return scaleTime().domain([start, end]).range([0, 1000]).clamp(true);
  }, [fullTimeRange]);

  useEffect(() => {
    if (!xScale || !svgRef.current) return;
    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth - MARGIN.left - MARGIN.right;
    if (width <= 0) return;

    xScale.range([0, width]);

    const xAxis = axisBottom(xScale)
      .ticks(timeMonth.every(1))
      .tickFormat(timeFormat('%b %Y'));

    svg
      .select<SVGGElement>('.timeline-axis')
      .attr('transform', `translate(${MARGIN.left}, ${HEIGHT})`)
      .call(xAxis);
  }, [xScale]);

  useEffect(() => {
    if (!xScale || !svgRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth - MARGIN.left - MARGIN.right;
    if (width <= 0) return;

    xScale.range([0, width]);

    const brush = brushX().extent([[0, 0], [width, HEIGHT]]);
    const brushG = svg.select<SVGGElement>('.timeline-brush')
      .attr('transform', `translate(${MARGIN.left}, 0)`);

    let isProgrammatic = false;
    let rafId: number | null = null;

    const handle = (x0: number, x1: number) => {
      const newStart = (xScale as ScaleTime<number, number>).invert(x0).toISOString();
      const newEnd = (xScale as ScaleTime<number, number>).invert(x1).toISOString();

      if (newStart !== timeRangeActive.start || newEnd !== timeRangeActive.end) {
        setAnimationMode('none');
        setTimeRangeActive({ start: newStart, end: newEnd });
        recomputeForActiveRange({ start: newStart, end: newEnd });
      }
    };

    const onBrush = (event: D3BrushEvent<unknown>) => {
      if (isProgrammatic) return;
      const sel = event.selection as [number, number] | null;
      if (!sel) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => handle(sel[0], sel[1]));
    };

    brush.on('brush', onBrush).on('end', onBrush);
    brush(brushG);

    const [domainStart, domainEnd] = xScale.domain();
    let aStart = new Date(timeRangeActive.start);
    let aEnd = new Date(timeRangeActive.end);

    if (aStart < domainStart) aStart = domainStart;
    if (aEnd > domainEnd) aEnd = domainEnd;
    if (aStart >= aEnd) {
      aStart = domainStart;
      aEnd = domainEnd;
    }

    const x0 = xScale(aStart);
    const x1 = xScale(aEnd);

    const current = brushSelection(brushG.node() as SVGGElement);
    if (!current || current[0] !== x0 || current[1] !== x1) {
      isProgrammatic = true;
      brush.move(brushG, [x0, x1]);
      isProgrammatic = false;
    }

    const aStartIso = aStart.toISOString();
    const aEndIso = aEnd.toISOString();
    if (aStartIso !== timeRangeActive.start || aEndIso !== timeRangeActive.end) {
      setAnimationMode('none');
      setTimeRangeActive({ start: aStartIso, end: aEndIso });
      recomputeForActiveRange({ start: aStartIso, end: aEndIso });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    xScale,
    timeRangeActive.start,
    timeRangeActive.end,
    setTimeRangeActive,
    setAnimationMode,
  ]);

  return (
    <div className="bottom-panel-placeholder timeline-panel">
      {!fullTimeRange ? (
        <p>No time data to display</p>
      ) : (
        <svg ref={svgRef} className="timeline-svg">
          <g className="timeline-brush" />
          <g className="timeline-axis" />
        </svg>
      )}
    </div>
  );
}