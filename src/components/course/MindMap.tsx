'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, Brain } from 'lucide-react';
import { useTheme } from 'next-themes';

interface MindMapMemory {
  id: string;
  memory_type: 'concept' | 'summary' | 'key_term' | 'weak_area' | 'user_note';
  content: string;
  importance: number;
}

interface MindMapProps {
  courseId: string;
  courseName?: string;
}

const TYPE_STYLE: Record<
  MindMapMemory['memory_type'],
  { bg: string; border: string; text: string; darkBg: string; darkBorder: string; darkText: string; label: string }
> = {
  concept: {
    bg: '#eff6ff',
    border: '#3b82f6',
    text: '#1d4ed8',
    darkBg: '#1e3a5f',
    darkBorder: '#60a5fa',
    darkText: '#93c5fd',
    label: '핵심 개념',
  },
  summary: {
    bg: '#f0fdf4',
    border: '#22c55e',
    text: '#15803d',
    darkBg: '#14532d',
    darkBorder: '#4ade80',
    darkText: '#86efac',
    label: '대화 요약',
  },
  key_term: {
    bg: '#faf5ff',
    border: '#a855f7',
    text: '#7e22ce',
    darkBg: '#3b0764',
    darkBorder: '#c084fc',
    darkText: '#d8b4fe',
    label: '용어',
  },
  weak_area: {
    bg: '#fff1f2',
    border: '#f43f5e',
    text: '#be123c',
    darkBg: '#4c0519',
    darkBorder: '#fb7185',
    darkText: '#fda4af',
    label: '취약 영역',
  },
  user_note: {
    bg: '#fffbeb',
    border: '#f59e0b',
    text: '#b45309',
    darkBg: '#451a03',
    darkBorder: '#fbbf24',
    darkText: '#fde68a',
    label: '메모',
  },
};

/** Arrange nodes in concentric rings per memory_type around a center node */
function buildGraph(
  memories: MindMapMemory[],
  courseName: string,
  isDark: boolean
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Center node
  nodes.push({
    id: 'center',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: courseName },
    style: {
      background: isDark ? '#312e81' : '#6366f1',
      border: '2px solid ' + (isDark ? '#818cf8' : '#4f46e5'),
      color: '#fff',
      borderRadius: '50%',
      width: 100,
      height: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
      textAlign: 'center',
      padding: 8,
    },
  });

  const grouped: Record<string, MindMapMemory[]> = {};
  for (const m of memories) {
    if (!grouped[m.memory_type]) grouped[m.memory_type] = [];
    grouped[m.memory_type].push(m);
  }

  const typeKeys = Object.keys(grouped) as MindMapMemory['memory_type'][];
  const typeCount = typeKeys.length;

  typeKeys.forEach((type, typeIdx) => {
    const style = TYPE_STYLE[type];
    const bg = isDark ? style.darkBg : style.bg;
    const borderColor = isDark ? style.darkBorder : style.border;
    const textColor = isDark ? style.darkText : style.text;

    // Category node in inner ring
    const catAngle = (2 * Math.PI * typeIdx) / typeCount - Math.PI / 2;
    const catR = 220;
    const catX = Math.cos(catAngle) * catR;
    const catY = Math.sin(catAngle) * catR;
    const catId = `cat-${type}`;

    nodes.push({
      id: catId,
      type: 'default',
      position: { x: catX, y: catY },
      data: { label: style.label },
      style: {
        background: bg,
        border: `2px solid ${borderColor}`,
        color: textColor,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        padding: '6px 12px',
        minWidth: 80,
        textAlign: 'center',
      },
    });

    edges.push({
      id: `e-center-${catId}`,
      source: 'center',
      target: catId,
      style: { stroke: borderColor, strokeWidth: 2, strokeDasharray: '4 2' },
      animated: false,
    });

    // Leaf nodes for each memory in this category
    const items = grouped[type];
    items.forEach((mem, memIdx) => {
      const spread = Math.min(2.0, (items.length - 1) * 0.35);
      const startAngle = catAngle - spread / 2;
      const angleStep = items.length > 1 ? spread / (items.length - 1) : 0;
      const leafAngle = startAngle + angleStep * memIdx;
      const leafR = 420 + mem.importance * 60;
      const leafX = Math.cos(leafAngle) * leafR;
      const leafY = Math.sin(leafAngle) * leafR;

      const shortContent =
        mem.content.length > 60 ? mem.content.slice(0, 57) + '…' : mem.content;

      nodes.push({
        id: mem.id,
        type: 'default',
        position: { x: leafX, y: leafY },
        data: { label: shortContent },
        style: {
          background: bg,
          border: `1.5px solid ${borderColor}`,
          color: textColor,
          borderRadius: 8,
          fontSize: 11,
          padding: '6px 10px',
          maxWidth: 180,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          lineHeight: 1.4,
        },
      });

      edges.push({
        id: `e-${catId}-${mem.id}`,
        source: catId,
        target: mem.id,
        style: { stroke: borderColor, strokeWidth: 1.5 },
      });
    });
  });

  return { nodes, edges };
}

export function MindMap({ courseId, courseName = '과목' }: MindMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [memories, setMemories] = useState<MindMapMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  useEffect(() => {
    const fetchMemories = async () => {
      setLoading(true);
      const res = await fetch(`/api/memories?courseId=${courseId}`);
      if (res.ok) {
        const data: MindMapMemory[] = await res.json();
        setMemories(data);
      }
      setLoading(false);
    };
    fetchMemories();
  }, [courseId]);

  useEffect(() => {
    if (memories.length === 0) return;
    const { nodes: n, edges: e } = buildGraph(memories, courseName, isDark);
    setNodes(n);
    setEdges(e);
  }, [memories, courseName, isDark, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">마인드맵을 생성할 데이터가 없습니다</h3>
        <p className="text-sm text-muted-foreground">
          AI와 대화하면 핵심 개념이 자동으로 기록되어 마인드맵이 완성됩니다
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-xl border overflow-hidden"
      style={{ height: 560 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode={isDark ? 'dark' : 'light'}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? '#374151' : '#e5e7eb'}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const style = node.style as React.CSSProperties | undefined;
            return (style?.borderColor as string) || '#6366f1';
          }}
          maskColor={isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
          className="rounded-lg"
        />
        <Panel position="top-left">
          <div className="flex flex-wrap gap-1.5 p-1">
            {(Object.entries(TYPE_STYLE) as [MindMapMemory['memory_type'], typeof TYPE_STYLE[MindMapMemory['memory_type']]][]).map(([key, s]) => (
              <span
                key={key}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: isDark ? s.darkBg : s.bg,
                  border: `1px solid ${isDark ? s.darkBorder : s.border}`,
                  color: isDark ? s.darkText : s.text,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
