// GraphContextQuery.tsx
import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import agent from "../api/agent";

interface GraphContextQueryProps {
  open: boolean;
  toggleDrawer: (open: boolean) => () => void;
  onMerge: (contextInfo: string) => void;
}

const GraphContextQuery: React.FC<GraphContextQueryProps> = ({
  open,
  toggleDrawer,
  onMerge,
}) => {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Use your existing graph search endpoint, e.g., using the local search method.
      const response = await agent.Search.local(query);
      // Here we assume the response is an array of search results.
      setResults(response || []);
    } catch (error) {
      console.error("Error searching graph context:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = () => {
    // For demonstration purposes, we assume merging simply involves concatenating result names.
    // You can enhance this logic by allowing multiple selections.
    const contextInfo = results
      .map((r) => r.name || JSON.stringify(r))
      .join("\n");
    onMerge(contextInfo);
    // Optionally, clear the state and close the drawer.
    setResults([]);
    setQuery("");
    toggleDrawer(false)();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{ zIndex: 1600 }}
    >
      <Box sx={{ width: "40vw", padding: 2 }}>
        <Typography variant="h6">Query Graph Context</Typography>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter graph query (e.g., 'Project A updated info')"
          fullWidth
          margin="normal"
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
        <List>
          {results.map((result, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={result.name || "No Name"}
                secondary={result.description || ""}
              />
            </ListItem>
          ))}
        </List>
        <Button variant="contained" color="primary" onClick={handleMerge} sx={{ mt: 2 }}>
          Merge Graph Context
        </Button>
      </Box>
    </Drawer>
  );
};

export default GraphContextQuery;