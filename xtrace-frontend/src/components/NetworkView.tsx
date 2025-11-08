import { useDataStore } from '../stores/dataStore';
import './NetworkView.css';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as d3 from 'd3-force';
import { scaleSqrt, scaleLinear } from 'd3-scale';
import type { NetworkNode } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { initiateFetch } from '../appController';

interface SimulationNode extends d3.SimulationNodeDatum, NetworkNode {}
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  inboundValue: number;
  outboundValue: number;
  totalValue: number;
}

export function NetworkView() {
  const { nodes, edges } = useDataStore((s) => s.computedNetworkData);
  const isFetching = useDataStore((s) => s.isFetching);
  const setSelection = useDataStore((s) => s.setSelection);
  const currentSelection = useDataStore((s) => s.selection);
  const animationMode = useDataStore((s) => s.animationMode);
  const setAnimationMode = useDataStore((s) => s.setAnimationMode);

  const setCentralAccount = useFilterStore((s) => s.setCentralAccount);
  const currentCentralAccount = useFilterStore((s) => s.centralAccount);

  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [simNodes, setSimNodes] = useState<SimulationNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimulationLink[]>([]);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wrapperRef.current) {
      setSize({
        width: wrapperRef.current.clientWidth,
        height: wrapperRef.current.clientHeight,
      });
    }
  }, []);
  const { width, height } = size;

  const minRadius = 6;
  const maxRadius = 18;
  const centralRadius = maxRadius + 4;

  const radiusScale = useMemo(() => {
    if (nodes.length === 0)
      return scaleSqrt().domain([0, 1]).range([minRadius, maxRadius]);
    const values = nodes.map((n) => n.inboundValue);
    const minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) maxVal = minVal + 1;
    return scaleSqrt().domain([minVal, maxVal]).range([minRadius, maxRadius]);
  }, [nodes]);

  const minStroke = 1.5;
  const maxStroke = 8;
  const strokeScale = useMemo(() => {
    if (edges.length === 0)
      return scaleLinear().domain([0, 1]).range([minStroke, maxStroke]);
    const values = edges.map((e) => e.totalValue);
    const minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) maxVal = minVal + 1;
    return scaleLinear().domain([minVal, maxVal]).range([minStroke, maxStroke]);
  }, [edges]);

  const handleNodeClick = (nodeId: string) => setSelection(nodeId);
  const handleNodeDoubleClick = (nodeId: string) => {
    if (nodeId === currentCentralAccount) return;
    setCentralAccount(nodeId);
    initiateFetch();
  };

  // 🟢 NEW/CORRECTED EFFECT:
  // This syncs the selection to the central account *after* the data
  // has been fetched and computed, solving the timing issue.
  useEffect(() => {
    // When the 'nodes' array updates (after a fetch),
    // find the central node in the new data and select it.
    if (nodes.length > 0) {
      const centralNode = nodes.find((n) => n.isCentral);
      if (centralNode) {
        setSelection(centralNode.id);
      }
    }
    // We only run this when the 'nodes' data changes.
  }, [nodes, setSelection]);

  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      setSimNodes([]);
      setSimLinks([]);
      return;
    }

    const simNodesCopy: SimulationNode[] = nodes.map((d) => ({ ...d }));
    const simLinksCopy: SimulationLink[] = edges.map((d) => ({
      source: d.source,
      target: d.target,
      inboundValue: d.inboundValue,
      outboundValue: d.outboundValue,
      totalValue: d.totalValue,
    }));

    const cx = width / 2;
    const cy = height / 2;

    // Initial seeding
    const nonCentral = simNodesCopy.filter((n) => !n.isCentral);
    const ringR = Math.max(180, (width + height) / 10);
    simNodesCopy.forEach((n) => {
      if (n.isCentral) {
        n.x = cx; n.y = cy; n.fx = cx; n.fy = cy; // <-- This anchors the graph
      } else {
        const k = nonCentral.indexOf(n);
        const angle = (k / Math.max(1, nonCentral.length)) * Math.PI * 2;
        n.x = cx + Math.cos(angle) * ringR;
        n.y = cy + Math.sin(angle) * ringR;
      }
    });

    const collide = d3
      .forceCollide<SimulationNode>()
      .radius(
        (d) =>
          (d.isCentral ? centralRadius : radiusScale(d.inboundValue)) + 12
      )
      .iterations(3);

    // Normal link distance
    const link = d3
      .forceLink<SimulationNode, SimulationLink>(simLinksCopy)
      .id((d: any) => d.id)
      .distance(150)
      .strength(0.9);

    const simulation = d3
      .forceSimulation(simNodesCopy)
      .force('link', link)
      .force('charge', d3.forceManyBody().strength(-220))
      .force('collide', collide);

    if (animationMode === 'none') {
      simulation.alpha(1);
      for (let i = 0; i < 250; i++) simulation.tick();
      simulation.stop();
      setSimNodes([...simNodesCopy]);
      setSimLinks([...simLinksCopy]);
    } else {
      setSimNodes([...simNodesCopy]);
      setSimLinks([...simLinksCopy]);
      simulation.on('tick', () => {
        setSimNodes([...simNodesCopy]);
        setSimLinks([...simLinksCopy]);
      });
      const t = setTimeout(() => {
        simulation.stop();
        setAnimationMode('none');
      }, 600);
      return () => {
        clearTimeout(t);
        simulation.stop();
      };
    }

    return () => simulation.stop();
  }, [
    nodes,
    edges,
    width,
    height,
    animationMode,
    setAnimationMode,
    radiusScale,
  ]);

  if (isFetching)
    return (
      <div className="network-placeholder">
        <h4>Loading...</h4>
      </div>
    );
  if (simNodes.length === 0)
    return (
      <div className="network-placeholder">
        <h4>No data to display.</h4>
      </div>
    );

  return (
    <div
      ref={wrapperRef}
      className="network-container"
      onMouseMove={(e) =>
        setMousePosition({ x: e.clientX, y: e.clientY })
      }
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g className="links">
          {simLinks.map((link, i) => {
            const source = link.source as SimulationNode;
            const target = link.target as SimulationNode;
            const midX = (source.x! + target.x!) / 2;
            const midY = (source.y! + target.y!) / 2;
            const angle =
              (Math.atan2(target.y! - source.y!, target.x! - source.x!) *
                180) /
              Math.PI;
            const netFlow = link.inboundValue - link.outboundValue;
            const rotation = netFlow < 0 ? angle + 180 : angle;
            const directionClass =
              netFlow > 0 ? 'arrow-in' : netFlow < 0 ? 'arrow-out' : '';

            return (
              <g key={i}>
                <line
                  className="link"
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  strokeWidth={strokeScale(link.totalValue)}
                />
                {netFlow !== 0 && (
                  <path
                    d="M-5,-5L5,0L-5,5"
                    className={`link-arrow ${directionClass}`}
                    transform={`translate(${midX}, ${midY}) rotate(${rotation})`}
                  />
                )}
              </g>
            );
          })}
        </g>

        <g className="nodes">
          {simNodes.map((node) => (
            <g
              key={node.id}
              className={`node ${node.isCentral ? 'node-central' : ''} ${
                node.id === currentSelection ? 'node-selected' : ''
              }`}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => handleNodeClick(node.id)}
              onDoubleClick={() => handleNodeDoubleClick(node.id)}
              onMouseOver={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                r={
                  node.isCentral
                    ? centralRadius
                    : radiusScale(node.inboundValue)
                }
              />
              <text x={10} dy="0.3em" className="node-label">
                {node.isCentral
                  ? 'Central'
                  : `${node.id.slice(0, 4)}...${node.id.slice(-4)}`}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {hoveredNode && (
        <div
          className="network-tooltip"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y}px`,
          }}
        >
          <div className="tooltip-address">{hoveredNode.id}</div>
          <div className="tooltip-row">
            <strong>Txs:</strong> {hoveredNode.txCount}
          </div>
          <div className="tooltip-row">
            <strong>In ($):</strong>{' '}
            {hoveredNode.inboundValue.toFixed(2)}
          </div>
          <div className="tooltip-row">
            <strong>Out ($):</strong>{' '}
            {hoveredNode.outboundValue.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}