import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  TextField,
  Typography,
  IconButton,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import GraphContextQuery from "./GraphContextQuery";

interface MCPGenerateCoverLetterProps {
  drawerOpen: boolean;
  toggleDrawer: (open: boolean) => () => void;
}

const defaultPrompt =
  "Write me a cover letter for the following job description, using any relevant previous projects or experiences as examples. " +
  "Demonstrate enthusiasm for the role, while keeping the tone professional, but without using clichés, jargon, " +
  "or anything that sounds too robotic or AI-like. The cover letter should be 3-4 paragraphs long, and doesn't need any " +
  "addresses or names — I just want the main content of the letter.";

const MCPGenerateCoverLetter: React.FC<MCPGenerateCoverLetterProps> = ({
  drawerOpen,
  toggleDrawer,
}) => {
  const theme = useTheme();

  // MCP client initialization
  const [client, setClient] = useState<Client | null>(null);

  const initClient = async (): Promise<Client | undefined> => {
    const envUrl = import.meta.env.VITE_MCP_URL;
    if (!envUrl) {
      console.error("VITE_MCP_URL is undefined");
      setError("Configuration error: MCP URL is not set.");
      return;
    }
    const client = new Client({ name: "CoverLetterApp", version: "1.0.0" });
    // Determine transport base URL
    let transportUrl: string;
    if (/^https?:\/\//i.test(envUrl)) {
      // Absolute URL: normalize and ensure trailing slash
      const base = envUrl.replace(/\/$/, "");
      transportUrl = base.endsWith("/mcp") ? `${base}/` : `${base}/mcp/`;
    } else {
      // No protocol: assume same-origin proxy at /mcp/
      transportUrl = "/mcp/";
    }
    console.log(`Connecting to MCP at ${transportUrl}`);
    // Construct URL relative to window.location for same-origin paths
    const urlObj = transportUrl.startsWith("/")
      ? new URL(transportUrl, window.location.origin)
      : new URL(transportUrl);
    const transport = new StreamableHTTPClientTransport(urlObj);
    await client.connect(transport);
    // Debug: list available tools after connecting
    try {
      const toolList = await client.listTools();
      console.log("⚙️ MCP Tools discovered:", toolList);
    } catch (e) {
      console.error("Failed to list MCP tools:", e);
    }
    setClient(client);
    return client;
  };


  // Fields for company and job title
  const [companyName, setCompanyName] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");

  // Cover letter prompt & description
  const [coverLetterDescription, setCoverLetterDescription] =
    useState<string>(defaultPrompt);
  const [jobDescription, setJobDescription] = useState<string>("");

  // Generated and editable letter
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string>("");
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>("");

  // Chat history
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // Loading & error state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Graph context drawer
  const [graphQueryOpen, setGraphQueryOpen] = useState<boolean>(false);
  const toggleGraphQuery = (open: boolean) => () => setGraphQueryOpen(open);

  const handleMergeGraphContext = (contextInfo: string) => {
    setChatHistory(prev => [
      `Graph Context:\n${contextInfo}`,
      ...(prev.length ? prev : [`Job Description:\n${jobDescription}`]),
    ]);
  };

  // Generate initial cover letter via MCP tool 'local_search'
  const handleGenerate = async () => {
    console.log("🔍 handleGenerate, client is:", client);
    setError("");
    // Validate company and title
    if (!companyName.trim() || !jobTitle.trim()) {
      setError("Please enter Company and Job Title before generating.");
      return;
    }
    // Ensure we have a usable client instance
    let activeClient = client;
    if (!activeClient) {
      console.log("⚙️ Client not ready, initializing...");
      setLoading(true);
      activeClient = await initClient();
      setLoading(false);
      if (!activeClient) {
        setError("Still connecting to the MCP server — please wait a moment.");
        return;
      }
    }
    // Debug: log resolved URL for the local_search endpoint
    const callUrl = new URL("local_search", (() => {
      const base = import.meta.env.VITE_MCP_URL?.replace(/\/$/, "") || "";
      return base.startsWith("http") ? `${base}/mcp/` : "/mcp/";
    })());
    console.log("🔗 Calling local_search at:", callUrl.toString());
    const prompt = `Cover Letter Description: ${coverLetterDescription}\nJob Description: ${jobDescription}`;
    setLoading(true);
    try {
      // Call MCP local_search tool
      const result = await activeClient.callTool({
        name: "local_search",
        arguments: { query: prompt }
      });
      const letter = result.response as string;
      setGeneratedCoverLetter(letter);
      setEditableCoverLetter(letter);
      setChatHistory([`Job Description:\n${jobDescription}`]);
    } catch (err: any) {
      console.error("Error generating cover letter via MCP:", err);
      setError("Error generating cover letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Edit via chat calling REST fallback (MCP edit placeholder)
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, `User: ${chatInput}`];
    setChatHistory(newHistory);
    setLoading(true);
    try {
      // if MCP tool 'finalize_cover_letter' available, use it, else fallback
      if (client) {
        const resp = await client.callTool({
          name: "finalize_cover_letter",
          arguments: {
            draft: editableCoverLetter,
            suggestions: newHistory.filter(m => m.startsWith("User:")),
          }
        });
        const updated = resp.final_letter as string;
        setChatHistory(prev => [...prev, `Bot: ${updated}`]);
        setEditableCoverLetter(updated);
      }
    } catch (err: any) {
      console.error("Error editing cover letter via MCP:", err);
      setError("Error updating cover letter. Please try again.");
    } finally {
      setLoading(false);
      setChatInput("");
    }
  };

  // File save helpers
  const getDateStr = () => new Date().toISOString().split('T')[0];
  const saveFile = (content: string, folder: string, suffix: string) => {
    const date = getDateStr();
    const fn = `${companyName.trim()} - ${jobTitle.trim()} - ${suffix} - ${date}.txt`;
    const blob = new Blob([content], { type: 'text/plain' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob);
    el.download = `${folder}/${fn}`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  return (
    <>
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)} sx={{ zIndex:1500 }}>
        <Box sx={{ width:'50vw', p:2, position:'relative' }}>
          <IconButton onClick={toggleDrawer(false)} sx={{ position:'absolute', top:8, right:8 }}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mb:2 }}>Generate Cover Letter</Typography>

          <TextField fullWidth margin="normal" label="Company Name" value={companyName} onChange={e=>setCompanyName(e.target.value)} />
          <TextField fullWidth margin="normal" label="Job Title" value={jobTitle} onChange={e=>setJobTitle(e.target.value)} />

          {generatedCoverLetter ? (
            <>
              <Typography variant="h6" sx={{ mt:2 }}>Generated Cover Letter</Typography>
              <TextField fullWidth multiline rows={8} margin="normal"
                value={editableCoverLetter} onChange={e=>setEditableCoverLetter(e.target.value)} />
              <Box sx={{ display:'flex', gap:2, mt:2 }}>
                <Button variant="contained" onClick={()=>saveFile(editableCoverLetter,'Cover Letters','Cover Letter')}>Save Cover Letter</Button>
                <Button variant="contained" color="secondary" onClick={()=>saveFile(jobDescription,'Job Descriptions','Job Description')}>Save Job Description</Button>
                <Button variant="contained" onClick={toggleGraphQuery(true)}>Query Graph Context</Button>
              </Box>

              <Typography variant="h6" sx={{ mt:4 }}>Edit via Chat</Typography>
              <Paper sx={{ p:2, mt:2, maxHeight:'200px', overflow:'auto' }}>
                <List>
                  {chatHistory.map((m,i)=><ListItem key={i} disableGutters><ListItemText primary={m} /></ListItem>)}
                </List>
              </Paper>
              <TextField fullWidth multiline rows={2} margin="normal"
                placeholder="Type your edit prompt..."
                value={chatInput} onChange={e=>setChatInput(e.target.value)} />
              <Button variant="contained" onClick={handleSendChat}
                disabled={loading||!chatInput.trim()} sx={{ mt:2 }}>
                {loading ? <CircularProgress size={24}/> : 'Send'}
              </Button>
              {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}
            </>
          ) : (
            <>
              <TextField fullWidth multiline rows={4} margin="normal"
                value={coverLetterDescription}
                onChange={e=>setCoverLetterDescription(e.target.value)} />
              <TextField fullWidth multiline rows={4} margin="normal"
                value={jobDescription}
                onChange={e=>setJobDescription(e.target.value)} />
              <Button variant="contained" onClick={handleGenerate}
                disabled={
                  loading ||
                  !companyName.trim() ||
                  !jobTitle.trim() ||
                  !coverLetterDescription.trim() ||
                  !jobDescription.trim()
                }
                sx={{ mt:2 }}>
                {loading ? <CircularProgress size={24}/> : 'Generate Cover Letter'}
              </Button>
              {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}
            </>
          )}
        </Box>
      </Drawer>
      <GraphContextQuery open={graphQueryOpen} toggleDrawer={toggleGraphQuery} onMerge={handleMergeGraphContext} />
    </>
  );
};

export default MCPGenerateCoverLetter;
