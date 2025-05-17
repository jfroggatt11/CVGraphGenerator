import React, { useState, useCallback, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";
import {
  CustomGraphData,
  CustomLink,
  CustomNode,
} from "../models/custom-graph-data";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import Fuse from "fuse.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import * as THREE from "three";
// import { Renderer } from "three";
import SearchDrawer from "./SearchDrawer";
import DetailDrawer from "./DetailDrawer";
import APISearchDrawer from "./APISearchDrawer";
import APIGenerateCoverLetter from "./APIGenerateCoverLetter"; // New import for cover letter generation
import MCPGenerateCoverLetter from "./MCPGenerateCoverLetter";
import SpriteText from "three-spritetext";
import agent from "../api/agent";
import { SearchResult } from "../models/search-result";

type Coords = {
  x: number;
  y: number;
  z: number;
};

interface GraphViewerProps {
  data: CustomGraphData;
  graphType: "2d" | "3d";
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleGraphType: (event: React.ChangeEvent<HTMLInputElement>) => void;
  includeDocuments: boolean;
  onIncludeDocumentsChange: React.Dispatch<React.SetStateAction<boolean>>;
  includeTextUnits: boolean;
  onIncludeTextUnitsChange: React.Dispatch<React.SetStateAction<boolean>>;
  includeCommunities: boolean;
  onIncludeCommunitiesChange: React.Dispatch<React.SetStateAction<boolean>>;
  includeCovariates: boolean;
  onIncludeCovariatesChange: React.Dispatch<React.SetStateAction<boolean>>;
  hasDocuments: boolean;
  hasTextUnits: boolean;
  hasCommunities: boolean;
  hasCovariates: boolean;
}

const NODE_R = 8;

const GraphViewer: React.FC<GraphViewerProps> = ({
  data,
  graphType,
  isFullscreen,
  includeDocuments,
  onIncludeDocumentsChange,
  includeTextUnits,
  onIncludeTextUnitsChange,
  includeCommunities,
  onIncludeCommunitiesChange,
  includeCovariates,
  onIncludeCovariatesChange,
  onToggleFullscreen,
  onToggleGraphType,
  hasDocuments,
  hasTextUnits,
  hasCommunities,
  hasCovariates,
}) => {
  const theme = useTheme();

  // Added missing state variables
  const [highlightNodes, setHighlightNodes] = useState<Set<CustomNode>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<CustomLink>>(new Set());
  const [hoverNode, setHoverNode] = useState<CustomNode | null>(null);

  // Existing search drawer state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<(CustomNode | CustomLink)[]>([]);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // New API cover letter generator drawer state
  const [generateCoverLetterAPIDrawerOpen, setGenerateCoverLetterAPIDrawerOpen] = useState(false);
  const toggleGenerateCoverLetterAPIDrawer = (open: boolean) => () => {
    setGenerateCoverLetterAPIDrawerOpen(open);
  };
  // MCP cover letter generator drawer state
  const [generateCoverLetterMCPDrawerOpen, setGenerateCoverLetterMCPDrawerOpen] = useState(false);
  const toggleGenerateCoverLetterMCPDrawer = (open: boolean) => () => {
    setGenerateCoverLetterMCPDrawerOpen(open);
  };

  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<CustomLink | null>(null);
  const [linkedNodes, setLinkedNodes] = useState<CustomNode[]>([]);
  const [linkedRelationships, setLinkedRelationships] = useState<CustomLink[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [showLinkLabels, setShowLinkLabels] = useState(false);
  const [showHighlight, setShowHighlight] = useState(true);
  const graphRef = useRef<any>(null);
  const extraRenderers = [ new CSS2DRenderer() ];
  const nodeCount = data.nodes.length;
  const linkCount = data.links.length;

  const [apiDrawerOpen, setApiDrawerOpen] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<SearchResult | null>(null);
  const [serverUp, setServerUp] = useState<boolean>(false);

  const [graphData, setGraphData] = useState<CustomGraphData>(data);
  const initialGraphData = useRef<CustomGraphData>(data);

  useEffect(() => {
    setGraphData(data);
    initialGraphData.current = data;
  }, [data]);

  useEffect(() => {
    checkServerStatus();
  }, []);

  const toggleApiDrawer = (open: boolean) => () => {
    setApiDrawerOpen(open);
  };

  const handleApiSearch = async (query: string, searchType: "local" | "global") => {
    try {
      const data: SearchResult =
        searchType === "local"
          ? await agent.Search.local(query)
          : await agent.Search.global(query);
      setApiSearchResults(data);
      // Process the search result to update the graph data
      updateGraphData(data.context_data);
    } catch (err) {
      console.error("An error occurred during the API search.", err);
    }
  };

  const checkServerStatus = async () => {
    try {
      const response = await agent.Status.check();
      setServerUp(response.status === "Server is up and running");
    } catch (error) {
      setServerUp(false);
    }
  };

  const updateGraphData = (contextData: any) => {
    if (!contextData) return;
    const newNodes: CustomNode[] = [];
    const newLinks: CustomLink[] = [];
    const baseGraphData = initialGraphData.current;
    Object.entries(contextData).forEach(([key, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item) => {
          if (key === "relationships") {
            const existingLink = baseGraphData.links.find(
              (link) => link.human_readable_id?.toString() === item.id.toString()
            );
            if (existingLink) newLinks.push(existingLink);
          } else if (key === "entities") {
            const existingNode = baseGraphData.nodes.find(
              (node) =>
                node.human_readable_id?.toString() === item.id.toString() &&
                !node.covariate_type
            );
            if (existingNode) newNodes.push(existingNode);
          } else if (key === "reports") {
            const existingNode = baseGraphData.nodes.find(
              (node) => node.uuid === item.id.toString()
            );
            if (existingNode) newNodes.push(existingNode);
          } else if (key === "sources") {
            const existingNode = baseGraphData.nodes.find(
              (node) => node.text?.toString() === item.text
            );
            if (existingNode) newNodes.push(existingNode);
          } else if (key === "covariates" || key === "claims") {
            const existingNode = baseGraphData.nodes.find(
              (node) =>
                node.human_readable_id?.toString() === item.id.toString() &&
                node.covariate_type
            );
            if (existingNode) newNodes.push(existingNode);
          }
        });
      }
    });
    const updatedGraphData: CustomGraphData = {
      nodes: [...newNodes],
      links: [...newLinks],
    };
    setGraphData(updatedGraphData);
  };

  // Fuse configuration and search functions for the original SearchDrawer
  const fuse = new Fuse([...data.nodes, ...data.links], {
    keys: [
      "uuid",
      "id",
      "name",
      "type",
      "description",
      "source",
      "target",
      "title",
      "summary",
    ],
    threshold: 0.3,
  });

  const handleSearch = () => {
    const results = fuse.search(searchTerm).map((result) => result.item);
    const nodeResults = results.filter((item) => "neighbors" in item);
    const linkResults = results.filter(
      (item) => "source" in item && "target" in item
    );
    setSearchResults([...nodeResults, ...linkResults]);
    setRightDrawerOpen(true);
  };

  const toggleDrawer = (open: boolean) => () => {
    setRightDrawerOpen(open);
  };

  const handleNodeHover = useCallback((node: CustomNode | null) => {
    const newHighlightNodes = new Set<CustomNode>();
    const newHighlightLinks = new Set<CustomLink>();
    if (node) {
      newHighlightNodes.add(node);
      node.neighbors?.forEach((neighbor) => newHighlightNodes.add(neighbor));
      node.links?.forEach((link) => newHighlightLinks.add(link));
    }
    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
    setHoverNode(node);
  }, []);

  const handleLinkHover = useCallback((link: CustomLink | null) => {
    const newHighlightNodes = new Set<CustomNode>();
    const newHighlightLinks = new Set<CustomLink>();
    if (link) {
      newHighlightLinks.add(link);
      if (typeof link.source !== "string") newHighlightNodes.add(link.source);
      if (typeof link.target !== "string") newHighlightNodes.add(link.target);
    }
    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  }, []);

  const paintRing = useCallback(
    (node: CustomNode, ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, NODE_R * 1.4, 0, 2 * Math.PI, false);
      if (highlightNodes.has(node)) {
        ctx.fillStyle = node === hoverNode ? "red" : "orange";
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "gray";
        ctx.globalAlpha = 0.3;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    [hoverNode, highlightNodes]
  );

  // Define renderNodeLabel for 2D graph rendering
  const renderNodeLabel = (node: CustomNode, ctx: CanvasRenderingContext2D) => {
    if (!showLabels) return;
    const label = node.name || "";
    const fontSize = 4;
    const padding = 2;
    ctx.font = `${fontSize}px Sans-Serif`;
    const backgroundColor =
      theme.palette.mode === "dark"
        ? "rgba(0, 0, 0, 0.6)"
        : "rgba(255, 255, 255, 0.6)";
    const textWidth = ctx.measureText(label).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize + padding * 2;
    if (node.x !== undefined && node.y !== undefined) {
      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      ctx.moveTo(node.x - boxWidth / 2 + 5, node.y - boxHeight / 2);
      ctx.lineTo(node.x + boxWidth / 2 - 5, node.y - boxHeight / 2);
      ctx.quadraticCurveTo(
        node.x + boxWidth / 2,
        node.y - boxHeight / 2,
        node.x + boxWidth / 2,
        node.y - boxHeight / 2 + 5
      );
      ctx.lineTo(node.x + boxWidth / 2, node.y + boxHeight / 2 - 5);
      ctx.quadraticCurveTo(
        node.x + boxWidth / 2,
        node.y + boxHeight / 2,
        node.x + boxWidth / 2 - 5,
        node.y + boxHeight / 2
      );
      ctx.lineTo(node.x - boxWidth / 2 + 5, node.y + boxHeight / 2);
      ctx.quadraticCurveTo(
        node.x - boxWidth / 2,
        node.y + boxHeight / 2,
        node.x - boxWidth / 2,
        node.y + boxHeight / 2 - 5
      );
      ctx.lineTo(node.x - boxWidth / 2, node.y - boxHeight / 2 + 5);
      ctx.quadraticCurveTo(
        node.x - boxWidth / 2,
        node.y - boxHeight / 2,
        node.x - boxWidth / 2 + 5,
        node.y - boxHeight / 2
      );
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = node.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x, node.y);
    }
  };

  // Define nodeThreeObject for 3D graph rendering
  const nodeThreeObject = (node: CustomNode) => {
    if (!showLabels) {
      return new THREE.Object3D();
    }
    try {
      const nodeEl = document.createElement("div");
      nodeEl.textContent = node.name || node.id;
      nodeEl.style.color = node.color;
      nodeEl.style.padding = "2px 4px";
      nodeEl.style.borderRadius = "4px";
      nodeEl.style.fontSize = "10px";
      nodeEl.className = "node-label";
      return new CSS2DObject(nodeEl);
    } catch (error) {
      console.error("Error creating 3D object:", error);
      return new THREE.Object3D();
    }
  };

  const handleFocusButtonClick = (node: CustomNode) => {
    const newHighlightNodes = new Set<CustomNode>();
    newHighlightNodes.add(node);
    node.neighbors?.forEach((neighbor) => newHighlightNodes.add(neighbor));
    node.links?.forEach((link) => {
      // using the current highlightLinks state, although ensure that we're not mutating it directly;
      // if needed, you can merge using a new set similar to newHighlightNodes.
      highlightLinks.add(link);
    });
    setHighlightNodes(newHighlightNodes);
    setHoverNode(node);
    if (graphRef.current) {
      if (graphType === "2d") {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(8, 1000);
      } else {
        graphRef.current.cameraPosition(
          { x: node.x, y: node.y, z: 300 },
          { x: node.x, y: node.y, z: 0 },
          3000
        );
      }
    }
    setTimeout(() => {
      handleNodeHover(node);
    }, 1000);
    setRightDrawerOpen(false);
  };

  const handleFocusLinkClick = (link: CustomLink) => {
    const newHighlightNodes = new Set<CustomNode>();
    const newHighlightLinks = new Set<CustomLink>();
    newHighlightLinks.add(link);
    let sourceNode: CustomNode | undefined;
    let targetNode: CustomNode | undefined;
    if (typeof link.source !== "string") {
      newHighlightNodes.add(link.source);
      sourceNode = link.source;
    }
    if (typeof link.target !== "string") {
      newHighlightNodes.add(link.target);
      targetNode = link.target;
    }
    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
    if (
      graphRef.current &&
      sourceNode &&
      targetNode &&
      sourceNode.x &&
      targetNode.x &&
      sourceNode.y &&
      targetNode.y
    ) {
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      if (graphType === "2d") {
        graphRef.current.centerAt(midX, midY, 1000);
        graphRef.current.zoom(8, 1000);
      } else {
        graphRef.current.cameraPosition(
          { x: midX, y: midY, z: 300 },
          { x: midX, y: midY, z: 0 },
          3000
        );
      }
    }
    setTimeout(() => {
      handleLinkHover(link);
    }, 1000);
    setRightDrawerOpen(false);
  };

  const handleNodeClick = (node: CustomNode) => {
    setSelectedRelationship(null);
    setSelectedNode(node);
    setLinkedNodes(node.neighbors || []);
    setLinkedRelationships(node.links || []);
    setBottomDrawerOpen(true);
  };

  const handleLinkClick = (link: CustomLink) => {
    setSelectedNode(null);
    setSelectedRelationship(link);
    const linkSource =
      typeof link.source === "object" ? (link.source as CustomNode).id : link.source;
    const linkTarget =
      typeof link.target === "object" ? (link.target as CustomNode).id : link.target;
    const sourceNode = data.nodes.find((node) => node.id === linkSource);
    const targetNode = data.nodes.find((node) => node.id === linkTarget);
    if (sourceNode && targetNode) {
      setLinkedNodes([sourceNode, targetNode]);
      setLinkedRelationships([link]);
      setBottomDrawerOpen(true);
    }
  };

  const getBackgroundColor = () =>
    theme.palette.mode === "dark" ? "#000000" : "#FFFFFF";

  const getLinkColor = (link: CustomLink) =>
    theme.palette.mode === "dark" ? "gray" : "lightgray";

  const get3DLinkColor = (link: CustomLink) =>
    theme.palette.mode === "dark" ? "lightgray" : "gray";

  const getlinkDirectionalParticleColor = (link: CustomLink) =>
    theme.palette.mode === "dark" ? "lightgray" : "gray";

  // clearSearchResults remains for API query clearing
  const clearSearchResults = () => {
    setGraphData(initialGraphData.current);
    setApiSearchResults(null);
  };

  return (
    <Box
      sx={{
        height: isFullscreen ? "100vh" : "calc(100vh - 64px)",
        width: isFullscreen ? "100vw" : "100%",
        position: isFullscreen ? "fixed" : "relative",
        top: 0,
        left: 0,
        zIndex: isFullscreen ? 1300 : "auto",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        backgroundColor: getBackgroundColor(),
      }}
    >
      {/* Top-right controls */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1400,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-end",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={toggleDrawer(true)}
            startIcon={<SearchIcon />}
          >
            Search Nodes/Links
          </Button>
          {/* New API Cover Letter button */}
          <Button
            variant="contained"
            onClick={toggleGenerateCoverLetterAPIDrawer(true)}
          >
            Generate Cover Letter (via API)
          </Button>
          <Button
            variant="contained"
            onClick={toggleGenerateCoverLetterMCPDrawer(true)}
          >
            Generate Cover Letter (via MCP)
          </Button>
          <Tooltip title={isFullscreen ? "Exit Full Screen" : "Full Screen"}>
            <IconButton onClick={onToggleFullscreen} color="inherit">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            alignItems: "flex-start",
          }}
        >
          <FormControlLabel
            control={<Switch checked={graphType === "3d"} onChange={onToggleGraphType} />}
            label="3D View"
          />
          <FormControlLabel
            control={<Switch checked={showLabels} onChange={() => setShowLabels(!showLabels)} />}
            label="Show Node Labels"
          />
          <FormControlLabel
            control={<Switch checked={showLinkLabels} onChange={() => setShowLinkLabels(!showLinkLabels)} />}
            label="Show Link Labels"
          />
          <FormControlLabel
            control={<Switch checked={showHighlight} onChange={() => setShowHighlight(!showHighlight)} />}
            label="Show Highlight"
          />
        </Box>

        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeDocuments}
                onChange={() => onIncludeDocumentsChange(!includeDocuments)}
                disabled={!hasDocuments || apiSearchResults !== null}
              />
            }
            label="Include Documents"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeTextUnits}
                onChange={() => {
                  if (!includeTextUnits) {
                    onIncludeTextUnitsChange(true);
                  } else if (includeTextUnits && !includeCovariates) {
                    onIncludeTextUnitsChange(false);
                  } else {
                    onIncludeTextUnitsChange(false);
                    onIncludeCovariatesChange(false);
                  }
                }}
                disabled={!hasTextUnits || apiSearchResults !== null}
              />
            }
            label="Include Text Units"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeCommunities}
                onChange={() => onIncludeCommunitiesChange(!includeCommunities)}
                disabled={!hasCommunities || apiSearchResults !== null}
              />
            }
            label="Include Communities"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeCovariates}
                onChange={() => {
                  if (!includeCovariates) {
                    if (!includeTextUnits) {
                      onIncludeTextUnitsChange(true);
                    }
                    onIncludeCovariatesChange(true);
                  } else {
                    onIncludeCovariatesChange(false);
                  }
                }}
                disabled={!hasCovariates || apiSearchResults !== null}
              />
            }
            label="Include Covariates"
          />
        </FormGroup>
      </Box>

      <APISearchDrawer
        apiDrawerOpen={apiDrawerOpen}
        toggleDrawer={toggleApiDrawer}
        handleApiSearch={handleApiSearch}
        apiSearchResults={apiSearchResults}
        localSearchEnabled={
          hasCovariates
            ? includeTextUnits && includeCommunities && includeCovariates
            : includeTextUnits && includeCommunities
        }
        globalSearchEnabled={includeCommunities}
        hasCovariates={hasCovariates}
        serverUp={serverUp}
      />

      {/* Render the original SearchDrawer */}
      <SearchDrawer
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
        searchResults={searchResults}
        rightDrawerOpen={rightDrawerOpen}
        toggleDrawer={toggleDrawer}
        handleFocusButtonClick={handleFocusButtonClick}
        handleNodeClick={handleNodeClick}
        handleFocusLinkClick={handleFocusLinkClick}
        handleLinkClick={handleLinkClick}
      />

      {/* Render the new APIGenerateCoverLetter drawer */}
      <APIGenerateCoverLetter
  drawerOpen={generateCoverLetterAPIDrawerOpen}
  toggleDrawer={toggleGenerateCoverLetterAPIDrawer}
/>

{generateCoverLetterMCPDrawerOpen && (
  <MCPGenerateCoverLetter
    drawerOpen={generateCoverLetterMCPDrawerOpen}
    toggleDrawer={toggleGenerateCoverLetterMCPDrawer}
  />
)}

      <DetailDrawer
        bottomDrawerOpen={bottomDrawerOpen}
        setBottomDrawerOpen={setBottomDrawerOpen}
        selectedNode={selectedNode}
        selectedRelationship={selectedRelationship}
        linkedNodes={linkedNodes}
        linkedRelationships={linkedRelationships}
      />

      {graphType === "2d" ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeAutoColorBy="type"
          nodeRelSize={NODE_R}
          autoPauseRedraw={false}
          linkWidth={(link) =>
            showHighlight && highlightLinks.has(link) ? 5 : 1
          }
          linkDirectionalParticles={showHighlight ? 4 : 0}
          linkDirectionalParticleWidth={(link) =>
            showHighlight && highlightLinks.has(link) ? 4 : 0
          }
          linkDirectionalParticleColor={
            showHighlight ? getlinkDirectionalParticleColor : undefined
          }
          nodeCanvasObjectMode={(node) =>
            showHighlight && highlightNodes.has(node)
              ? "before"
              : showLabels
              ? "after"
              : undefined
          }
          nodeCanvasObject={(node, ctx) => {
            if (showHighlight && highlightNodes.has(node)) {
              paintRing(node as CustomNode, ctx);
            }
            if (showLabels) {
              renderNodeLabel(node as CustomNode, ctx);
            }
          }}
          linkCanvasObjectMode={() => (showLinkLabels ? "after" : undefined)}
          linkCanvasObject={(link, ctx) => {
            if (showLinkLabels) {
              const label = link.type || "";
              const fontSize = 4;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = theme.palette.mode === "dark" ? "lightgray" : "darkgray";
              const source = typeof link.source !== "string" ? (link.source as CustomNode) : null;
              const target = typeof link.target !== "string" ? (link.target as CustomNode) : null;
              if (
                source &&
                target &&
                source.x !== undefined &&
                target.x !== undefined &&
                source.y !== undefined &&
                target.y !== undefined
              ) {
                const textWidth = ctx.measureText(label).width;
                const posX = (source.x + target.x) / 2 - textWidth / 2;
                const posY = (source.y + target.y) / 2;
                ctx.fillText(label, posX, posY);
              }
            }
          }}
          onNodeHover={showHighlight ? handleNodeHover : undefined}
          onLinkHover={showHighlight ? handleLinkHover : undefined}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          backgroundColor={getBackgroundColor()}
          linkColor={getLinkColor}
        />
      ) : (
        <ForceGraph3D
          ref={graphRef}
          extraRenderers={extraRenderers}
          graphData={graphData}
          nodeAutoColorBy="type"
          nodeRelSize={NODE_R}
          linkWidth={(link) =>
            showHighlight && highlightLinks.has(link) ? 5 : 1
          }
          linkDirectionalParticles={showHighlight ? 4 : 0}
          linkDirectionalParticleWidth={(link) =>
            showHighlight && highlightLinks.has(link) ? 4 : 0
          }
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={true}
          onNodeHover={showHighlight ? handleNodeHover : undefined}
          onLinkHover={showHighlight ? handleLinkHover : undefined}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          backgroundColor={getBackgroundColor()}
          linkColor={get3DLinkColor}
          linkThreeObjectExtend={true}
          linkThreeObject={(link) => {
            const sprite = new SpriteText(`${link.type}`);
            sprite.color = "lightgrey";
            sprite.textHeight = 1.5;
            return sprite;
          }}
          linkPositionUpdate={(sprite, { start, end }) => {
            const middlePos = ["x", "y", "z"].reduce((acc, c) => {
              acc[c as keyof Coords] =
                start[c as keyof Coords] +
                (end[c as keyof Coords] - start[c as keyof Coords]) / 2;
              return acc;
            }, {} as Coords);
            Object.assign(sprite.position, middlePos);
          }}
        />
      )}

      <Box
        sx={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1400,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 1,
        }}
      >
        <Typography variant="body2">Nodes: {nodeCount}</Typography>
        <Typography variant="body2">Relationships: {linkCount}</Typography>
        <Button
          variant="contained"
          onClick={toggleApiDrawer(true)}
          startIcon={<DeleteIcon />}
          color="warning"
          disabled={apiSearchResults === null}
        >
          Clear Query Results
        </Button>
      </Box>
    </Box>
  );
};

export default GraphViewer;