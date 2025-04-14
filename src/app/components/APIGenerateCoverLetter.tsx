import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  TextField,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
import GraphContextQuery from "./GraphContextQuery"; // Import the new GraphContextQuery component

interface APIGenerateCoverLetterProps {
  drawerOpen: boolean;
  toggleDrawer: (open: boolean) => () => void;
}

const APIGenerateCoverLetter: React.FC<APIGenerateCoverLetterProps> = ({
  drawerOpen,
  toggleDrawer,
}) => {
  const theme = useTheme();

  // Two input fields for composing the prompt.
  const [coverLetterDescription, setCoverLetterDescription] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");

  // States for generated and editable cover letter.
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string>("");
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>("");

  // Chat history and input for editing via chat.
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // Loading and error state.
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // New state for the Graph Context Query drawer.
  const [graphQueryOpen, setGraphQueryOpen] = useState<boolean>(false);
  const toggleGraphQuery = (open: boolean) => () => {
    setGraphQueryOpen(open);
  };

  // Handler to merge graph context into the conversation history.
  const handleMergeGraphContext = (contextInfo: string) => {
    // You can choose how to incorporate the new context; here we prepend a label.
    const contextMessage = `Graph Context:\n${contextInfo}`;
    setChatHistory(prev => [...prev, contextMessage]);
  };

  // Call the API to generate the initial cover letter.
  const handleGenerate = async () => {
    const prompt = `Cover Letter Description: ${coverLetterDescription}\nJob Description: ${jobDescription}`;
    setLoading(true);
    setError("");
    try {
      // Call your API endpoint for local search to generate a cover letter.
      const response = await agent.Search.local(prompt);
      const letter = response.response || "No cover letter generated.";
      setGeneratedCoverLetter(letter);
      // Initialize editable version with the generated letter.
      setEditableCoverLetter(letter);
      // Clear any previous chat history.
      setChatHistory([]);
    } catch (err: any) {
      console.error("Error generating cover letter:", err);
      setError("Error generating cover letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Call the API to edit the cover letter via chat.
  const handleSendChat = async () => {
    if (chatInput.trim() === "") return;
    // Append user's prompt to the conversation history.
    const updatedChatHistory = [...chatHistory, `User: ${chatInput}`];
    setChatHistory(updatedChatHistory);
    try {
      setLoading(true);
      // Prepare payload with conversation and current letter.
      const payload = {
        conversation: updatedChatHistory,
        currentLetter: editableCoverLetter,
      };
      // Call the new API endpoint via your agent.
      const result = await agent.Chat.editCoverLetter(payload);
      const updatedLetter = result.updatedLetter;
      // Append the bot's response to chat history.
      setChatHistory(prev => [...prev, `Bot: ${updatedLetter}`]);
      // Update the editable cover letter.
      setEditableCoverLetter(updatedLetter);
    } catch (err: any) {
      console.error("Error updating cover letter via chat:", err);
      setError("Error updating cover letter. Please try again.");
    } finally {
      setLoading(false);
      setChatInput("");
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{ zIndex: 1500 }}
      >
        <Box sx={{ width: "50vw", padding: 2, position: "relative" }}>
          {/* Close Button */}
          <IconButton
            onClick={toggleDrawer(false)}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Generate Cover Letter
          </Typography>
          {generatedCoverLetter === "" ? (
            <>
              {/* Two input boxes for cover letter description and job description */}
              <TextField
                value={coverLetterDescription}
                onChange={(e) => setCoverLetterDescription(e.target.value)}
                placeholder="Enter cover letter description..."
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              <TextField
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter job description..."
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={
                  loading ||
                  (coverLetterDescription.trim() === "" && jobDescription.trim() === "")
                }
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Generate Cover Letter"}
              </Button>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Generated Cover Letter
              </Typography>
              {/* Editable Text Editor */}
              <TextField
                value={editableCoverLetter}
                onChange={(e) => setEditableCoverLetter(e.target.value)}
                fullWidth
                multiline
                rows={8}
                margin="normal"
              />
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => {
                  const element = document.createElement("a");
                  const file = new Blob([editableCoverLetter], { type: "text/plain" });
                  element.href = URL.createObjectURL(file);
                  element.download = "cover-letter.txt";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                Save Cover Letter
              </Button>
              {/* New button for querying graph context */}
              <Button
                variant="contained"
                color="secondary"
                sx={{ mt: 2 }}
                onClick={toggleGraphQuery(true)}
              >
                Query Graph Context
              </Button>
              {/* Chat area for editing via API */}
              <Typography variant="h6" sx={{ mt: 4 }}>
                Edit via Chat
              </Typography>
              <Paper
                sx={{
                  padding: 2,
                  marginTop: 2,
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                <List>
                  {chatHistory.map((msg, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemText primary={msg} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
              <TextField
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your edit prompt..."
                fullWidth
                margin="normal"
                multiline
                rows={2}
              />
              <Button
                variant="contained"
                onClick={handleSendChat}
                disabled={loading || chatInput.trim() === ""}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Send"}
              </Button>
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          )}
        </Box>
      </Drawer>
      {/* Render the Graph Context Query drawer */}
      <GraphContextQuery
        open={graphQueryOpen}
        toggleDrawer={toggleGraphQuery}
        onMerge={handleMergeGraphContext}
      />
    </>
  );
};

export default APIGenerateCoverLetter;