"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge as ReactFlowEdge,
  type Node as ReactFlowNode,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { EntityNode } from "@/components/graph/entity-node";
import {
  RelationshipEdge,
  RelationshipMarkers,
} from "@/components/graph/relationship-edge";
import { useGraphStore } from "@/store/graph-store";
import { layoutGraph } from "@/utils/dagre-layout";

const nodeTypes = { entity: EntityNode };
const edgeTypes = { relationship: RelationshipEdge };

function CanvasInner() {
  const graph = useGraphStore((s) => s.graph);
  const direction = useGraphStore((s) => s.layoutDirection);
  const selectedEntityId = useGraphStore((s) => s.selectedEntityId);
  const select = useGraphStore((s) => s.select);
  const { setCenter, getNode } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => layoutGraph(graph.nodes, graph.edges, direction),
    [graph, direction],
  );

  useEffect(() => {
    if (!selectedEntityId) return;
    const node = getNode(selectedEntityId);
    if (!node) return;
    const width = node.measured?.width ?? 220;
    const height = node.measured?.height ?? 120;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      duration: 400,
      zoom: 1.2,
    });
  }, [selectedEntityId, getNode, setCenter]);

  function onNodeClick(_: React.MouseEvent, node: ReactFlowNode) {
    select(node.id);
  }

  function onPaneClick() {
    select(null);
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges as ReactFlowEdge[]}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} />
      <Controls />
      <MiniMap pannable zoomable />
      <RelationshipMarkers />
    </ReactFlow>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
