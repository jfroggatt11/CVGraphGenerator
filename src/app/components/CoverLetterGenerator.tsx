import React, { useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText
} from "@mui/material";

interface CoverLetterGeneratorProps {
  rightDrawerOpen: boolean;
  toggleDrawer: (open: boolean) => () => void;
}

const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({
  rightDrawerOpen,
  toggleDrawer,
}) => {
  const [coverLetterDescription, setCoverLetterDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  const handleGenerateCoverLetter = async () => {
    const prompt = `Cover Letter Description: ${coverLetterDescription}\nJob Description: ${jobDescription}`;
    // Simulate an OpenAI API call to generate the cover letter
    const simulatedCoverLetter = "Generated Cover Letter based on the provided prompt:\n" + prompt;
    setGeneratedCoverLetter(simulatedCoverLetter);
  };

  const handleSendChat = async () => {
    if (chatInput.trim() === "") return;
    setChatHistory(prev => [...prev, `User: ${chatInput}`]);
    // Simulate a response from a normal chatbot using a standard call to the OpenAI API
    const botResponse = `Bot: Received "${chatInput}"`;
    setChatHistory(prev => [...prev, botResponse]);
    setChatInput("");
  };

  const handleSaveCoverLetter = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedCoverLetter], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "cover-letter.txt";
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Drawer
      anchor="right"
      open={rightDrawerOpen}
      onClose={toggleDrawer(false)}
      sx={{ zIndex: 1500 }}
    >
      <Box sx={{ width: 700, padding: 2 }}>
        {generatedCoverLetter === "" ? (
          <>
            <Typography variant="h6">Cover Letter Description</Typography>
            <TextField
              value={coverLetterDescription}
              onChange={(e) => setCoverLetterDescription(e.target.value)}
              placeholder="Describe the cover letter..."
              fullWidth
              margin="normal"
              multiline
              rows={4}
            />
            <Typography variant="h6" sx={{ marginTop: 2 }}>
              Job Description
            </Typography>
            <TextField
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              fullWidth
              margin="normal"
              multiline
              rows={4}
            />
            <Button
              variant="contained"
              onClick={handleGenerateCoverLetter}
              sx={{ marginTop: 2 }}
            >
              Generate Cover Letter
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h6">Generated Cover Letter</Typography>
            <Paper sx={{ padding: 2, marginTop: 2, maxHeight: "300px", overflow: "auto" }}>
              <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedCoverLetter}
              </Typography>
            </Paper>
            <Button
              variant="contained"
              onClick={handleSaveCoverLetter}
              sx={{ marginTop: 2 }}
            >
              Save Cover Letter
            </Button>
            <Typography variant="h6" sx={{ marginTop: 4 }}>
              Chat with Assistant
            </Typography>
            <Paper sx={{ padding: 2, marginTop: 2, maxHeight: "200px", overflow: "auto" }}>
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
              placeholder="Type your message..."
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
            <Button
              variant="contained"
              onClick={handleSendChat}
              sx={{ marginTop: 2 }}
            >
              Send
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default CoverLetterGenerator;