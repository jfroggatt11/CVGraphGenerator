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
import agent from "../api/agent";
import GraphContextQuery from "./GraphContextQuery";

interface APIGenerateCoverLetterProps {
  drawerOpen: boolean;
  toggleDrawer: (open: boolean) => () => void;
}

const defaultPrompt =
  "Write me a cover letter for the following job description, using any relevant previous projects or experiences as examples. " +
  "Demonstrate enthusiasm for the role, while keeping the tone professional, but without using clichés, jargon, " +
  "or anything that sounds too robotic or AI-like. The cover letter should be 3-4 paragraphs long, and doesn't need any " +
  "addresses or names — I just want the main content of the letter.";

const APIGenerateCoverLetter: React.FC<APIGenerateCoverLetterProps> = ({
  drawerOpen,
  toggleDrawer,
}) => {
  const theme = useTheme();

  // Fields for company and job title (used for file naming)
  const [companyName, setCompanyName] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");

  // Default cover letter prompt and job description
  const [coverLetterDescription, setCoverLetterDescription] =
    useState<string>(defaultPrompt);
  const [jobDescription, setJobDescription] = useState<string>("");

  // Generated and editable letters
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string>("");
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>("");

  // Chat history and input
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // Loading and error
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Graph context drawer state
  const [graphQueryOpen, setGraphQueryOpen] = useState<boolean>(false);
  const toggleGraphQuery = (open: boolean) => () => setGraphQueryOpen(open);

  // Merge graph context at start of history
  const handleMergeGraphContext = (contextInfo: string) => {
    setChatHistory(prev => [`Graph Context:\n${contextInfo}`, ...(prev.length ? prev : [`Job Description:\n${jobDescription}`])]);
  };

  // Generate initial letter
  const handleGenerate = async () => {
    setError("");
    if (!companyName.trim() || !jobTitle.trim()) {
      setError("Please enter Company and Job Title before generating.");
      return;
    }
    const prompt = `Cover Letter Description: ${coverLetterDescription}\nJob Description: ${jobDescription}`;
    setLoading(true);
    try {
      const response = await agent.Search.local(prompt);
      const letter = response.response || "No cover letter generated.";
      setGeneratedCoverLetter(letter);
      setEditableCoverLetter(letter);
      // Initialize chat with job description + any graph context
      setChatHistory([`Job Description:\n${jobDescription}`]);
    } catch (err: any) {
      console.error("Error generating cover letter:", err);
      setError("Error generating cover letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Edit via chat
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, `User: ${chatInput}`];
    setChatHistory(newHistory);
    setLoading(true);
    try {
      const payload = { conversation: newHistory, currentLetter: editableCoverLetter };
      const result = await agent.Chat.editCoverLetter(payload);
      const updated = result.updatedLetter;
      setChatHistory(prev => [...prev, `Bot: ${updated}`]);
      setEditableCoverLetter(updated);
    } catch (err: any) {
      console.error("Error editing cover letter:", err);
      setError("Error updating cover letter. Please try again.");
    } finally {
      setLoading(false);
      setChatInput("");
    }
  };

  // Helpers for saving
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

          {/* Company/Title inputs */}
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
                disabled={loading||!coverLetterDescription.trim()||!jobDescription.trim()}
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

export default APIGenerateCoverLetter;
