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
      // Call the local search API endpoint.
      const response = await agent.Search.local(query);
      // Graphrag returns context_data as an object of arrays. Flatten it:
      const data = response.context_data;
      let resultsArray: any[] = [];
      if (Array.isArray(data)) {
        resultsArray = data;
      } else if (data && typeof data === 'object') {
        Object.values(data).forEach((arr) => {
          if (Array.isArray(arr)) {
            resultsArray.push(...arr);
          }
        });
      } else {
        console.warn("Unexpected context_data format", data);
      }
      setResults(resultsArray);
    } catch (error) {
      console.error("Error searching graph context:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = () => {
    // Convert the array of results into a merged string.
    const contextInfo = results
      .map((r) => r.name || JSON.stringify(r))
      .join("\n");
    onMerge(contextInfo);
    // Clear state and close drawer
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
      <Box sx={{ width: "60vw", padding: 2, paddingTop: 6, position: "relative" }}>
        <Typography variant="h6">Query Graph Context</Typography>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter graph query (e.g., 'Project A updated info')"
          fullWidth
          margin="normal"
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching..." : "Search"}
        </Button>
        <List>
          {results.map((result, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={result.name || "Unnamed Item"}
                secondary={result.description || JSON.stringify(result)}
              />
            </ListItem>
          ))}
        </List>
        <Button
          variant="contained"
          color="primary"
          onClick={handleMerge}
          disabled={results.length === 0}
          sx={{ mt: 2 }}
        >
          Merge Graph Context
        </Button>
      </Box>
    </Drawer>
  );
};

export default GraphContextQuery;
