import React, { useMemo, useState } from 'react';
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { DecisionTreeNode } from '../types/analytics';

interface DecisionTreeCanvasProps {
  root: DecisionTreeNode;
  positiveClass: string;
  compact?: boolean;
  title?: string;
}

interface PositionedNode {
  node: DecisionTreeNode;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
  edgeLabel?: string;
  isLeftChild?: boolean;
}

function layoutTree(
  root: DecisionTreeNode,
  collapsedIds: Set<string>,
  compact: boolean
): { nodes: PositionedNode[]; width: number; height: number } {
  const nodeW = compact ? 148 : 186;
  const nodeH = compact ? 64 : 84;
  const hGap = compact ? 18 : 26;
  const vGap = compact ? 52 : 70;

  let leafIndex = 0;
  const xMap = new Map<string, number>();

  const isEffectivelyLeaf = (n: DecisionTreeNode) =>
    n.isLeaf || !n.left || !n.right || collapsedIds.has(n.id);

  const assignX = (node: DecisionTreeNode): number => {
    if (isEffectivelyLeaf(node)) {
      const x = leafIndex * (nodeW + hGap) + nodeW / 2 + 24;
      leafIndex++;
      xMap.set(node.id, x);
      return x;
    }
    const lx = assignX(node.left!);
    const rx = assignX(node.right!);
    const mid = (lx + rx) / 2;
    xMap.set(node.id, mid);
    return mid;
  };

  assignX(root);

  const nodes: PositionedNode[] = [];
  let maxDepth = 0;

  const collect = (
    node: DecisionTreeNode,
    parentX?: number,
    parentY?: number,
    edgeLabel?: string,
    isLeftChild?: boolean
  ) => {
    const x = xMap.get(node.id) || nodeW / 2;
    const y = node.depth * (nodeH + vGap) + 28;
    maxDepth = Math.max(maxDepth, node.depth);

    nodes.push({ node, x, y, parentX, parentY, edgeLabel, isLeftChild });

    if (!isEffectivelyLeaf(node)) {
      const leftLabel =
        node.splitType === 'numeric'
          ? `≤ ${formatNum(node.splitThreshold)}`
          : `= ${node.splitCategory}`;
      const rightLabel =
        node.splitType === 'numeric'
          ? `> ${formatNum(node.splitThreshold)}`
          : `≠ ${node.splitCategory}`;

      collect(node.left!, x, y + nodeH, leftLabel, true);
      collect(node.right!, x, y + nodeH, rightLabel, false);
    }
  };

  collect(root);

  const width = Math.max(540, leafIndex * (nodeW + hGap) + 48);
  const height = Math.max(260, (maxDepth + 1) * (nodeH + vGap) + 40);

  return { nodes, width, height };
}

function formatNum(v?: number): string {
  if (v === undefined) return '';
  if (Math.abs(v) >= 100) return String(Math.round(v));
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export const DecisionTreeCanvas: React.FC<DecisionTreeCanvasProps> = ({
  root,
  positiveClass,
  compact = false,
  title,
}) => {
  const [zoom, setZoom] = useState(compact ? 0.72 : 0.92);
  const [selectedNode, setSelectedNode] = useState<DecisionTreeNode>(root);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const { nodes, width, height } = useMemo(
    () => layoutTree(root, collapsedIds, compact),
    [root, collapsedIds, compact]
  );

  const nodeW = compact ? 148 : 186;
  const nodeH = compact ? 64 : 84;

  const toggleCollapse = (nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-800">
          {title || 'Visualización Interactiva del Árbol de Decisión'}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.12).toFixed(2))))}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
            title="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-700 px-1.5">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.12).toFixed(2))))}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
            title="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(compact ? 0.72 : 0.92);
              setCollapsedIds(new Set());
              setSelectedNode(root);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
            title="Restablecer vista"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* Main SVG Viewport + Inspector */}
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-4'}`}>
        <div
          className={`${
            compact ? '' : 'xl:col-span-3'
          } overflow-auto bg-[#F8FAFC] p-3 relative`}
          style={{ maxHeight: compact ? 340 : 500 }}
        >
          <svg
            width={width * zoom}
            height={height * zoom}
            viewBox={`0 0 ${width} ${height}`}
            className="select-none"
          >
            {/* Connecting edges */}
            {nodes.map((item) => {
              if (item.parentX === undefined || item.parentY === undefined) return null;
              const startX = item.parentX;
              const startY = item.parentY;
              const endX = item.x;
              const endY = item.y;
              const midY = (startY + endY) / 2;
              const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

              return (
                <g key={`edge_${item.node.id}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={item.isLeftChild ? '#0D9488' : '#64748B'}
                    strokeWidth={1.75}
                    strokeOpacity={0.65}
                  />
                  {item.edgeLabel && (
                    <g transform={`translate(${(startX + endX) / 2}, ${midY - 3})`}>
                      <rect
                        x={-36}
                        y={-10}
                        width={72}
                        height={18}
                        rx={4}
                        fill="#FFFFFF"
                        stroke="#E2E8F0"
                      />
                      <text
                        textAnchor="middle"
                        y={3}
                        fontSize={10}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#0F172A"
                      >
                        {item.edgeLabel.length > 11
                          ? item.edgeLabel.slice(0, 10) + '…'
                          : item.edgeLabel}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Tree Nodes */}
            {nodes.map(({ node, x, y }) => {
              const isSelected = selectedNode.id === node.id;
              const isCollapsed = collapsedIds.has(node.id);
              const isLeaf = node.isLeaf || isCollapsed;
              const isPosPred = node.predictedClass === positiveClass;
              const posRatio = node.positiveProbability;

              const headerFill = isLeaf
                ? isPosPred
                  ? '#0D9488'
                  : '#334155'
                : '#0F2A4A';

              return (
                <g
                  key={node.id}
                  transform={`translate(${x - nodeW / 2}, ${y})`}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer"
                >
                  <rect
                    width={nodeW}
                    height={nodeH}
                    rx={6}
                    fill="#FFFFFF"
                    stroke={isSelected ? '#0D9488' : '#CBD5E1'}
                    strokeWidth={isSelected ? 2.2 : 1}
                  />
                  {/* Node top header */}
                  <rect width={nodeW} height={22} rx={6} fill={headerFill} />
                  <rect y={14} width={nodeW} height={8} fill={headerFill} />

                  <text
                    x={8}
                    y={15}
                    fontSize={10.5}
                    fontWeight={600}
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fill="#FFFFFF"
                  >
                    {isLeaf
                      ? `Hoja: ${node.predictedClass}`
                      : node.splitLabel && node.splitLabel.length > 22
                      ? node.splitLabel.slice(0, 21) + '…'
                      : node.splitLabel || 'Nodo'}
                  </text>

                  {/* Node body stats */}
                  <text
                    x={8}
                    y={38}
                    fontSize={10.5}
                    fontFamily="IBM Plex Mono, monospace"
                    fill="#334155"
                  >
                    n={node.samples} · Imp={node.impurity.toFixed(2)}
                  </text>

                  {!compact && (
                    <text
                      x={8}
                      y={53}
                      fontSize={10}
                      fontFamily="Manrope, sans-serif"
                      fill="#64748B"
                    >
                      P({positiveClass})={(posRatio * 100).toFixed(1)}% · Clase: {node.predictedClass}
                    </text>
                  )}

                  {/* Probability bar */}
                  <rect
                    x={8}
                    y={nodeH - 15}
                    width={nodeW - 16}
                    height={6}
                    rx={3}
                    fill="#E2E8F0"
                  />
                  <rect
                    x={8}
                    y={nodeH - 15}
                    width={Math.max(0, (nodeW - 16) * posRatio)}
                    height={6}
                    rx={3}
                    fill="#0D9488"
                  />

                  {/* Collapse/expand button for internal nodes */}
                  {!node.isLeaf && !compact && (
                    <g
                      transform={`translate(${nodeW - 20}, 3)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(node.id);
                      }}
                    >
                      <rect width={16} height={16} rx={3} fill="rgba(255,255,255,0.18)" />
                      <text
                        x={8}
                        y={12}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={700}
                        fill="#FFFFFF"
                      >
                        {isCollapsed ? '+' : '−'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Inspector Panel (Full mode only) */}
        {!compact && (
          <div className="border-t xl:border-t-0 xl:border-l border-slate-200 p-4 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                Inspector de Nodo
              </div>
              <div className="mt-1 font-display text-sm font-bold text-[#0F2A4A]">
                {selectedNode.isLeaf
                  ? `Nodo Terminal (${selectedNode.id})`
                  : `Nodo de Decisión (${selectedNode.id})`}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Profundidad {selectedNode.depth} · {selectedNode.samples} registros
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                {!selectedNode.isLeaf && selectedNode.splitLabel && (
                  <div>
                    <div className="text-slate-500">Regla de División</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {selectedNode.splitLabel}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-slate-500">Predicción</div>
                    <div className="font-semibold text-[#0F2A4A]">
                      {selectedNode.predictedClass}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Impureza</div>
                    <div className="font-mono tabular-nums font-semibold text-slate-900">
                      {selectedNode.impurity.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1.5">Distribución de Clases</div>
                  <div className="space-y-1.5">
                    {Object.entries(selectedNode.classCounts).map(([cls, count]) => {
                      const pct = ((count / Math.max(1, selectedNode.samples)) * 100).toFixed(1);
                      return (
                        <div key={cls}>
                          <div className="flex justify-between text-xs tabular-nums">
                            <span className="font-medium text-slate-700">{cls}</span>
                            <span className="font-mono text-slate-900">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className={`h-full rounded-full ${
                                cls === positiveClass ? 'bg-[#0D9488]' : 'bg-[#0F2A4A]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {!selectedNode.isLeaf && (
              <button
                type="button"
                onClick={() => toggleCollapse(selectedNode.id)}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
              >
                {collapsedIds.has(selectedNode.id) ? (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expandir Subárbol</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Colapsar Subárbol</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
